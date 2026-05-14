<template>
  <Modal
    :open="state.share.open"
    :title="`共有: ${item?.label || ''}`"
    width="lg"
    @close="dialogs.closeShare"
  >
    <div class="space-y-4 text-sm">
      <!-- Add user -->
      <section>
        <div class="font-medium mb-2">
          ユーザを追加
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="newEmail"
            type="email"
            placeholder="user@example.com"
            class="flex-1 px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
          >
          <select
            v-model="newLevel"
            class="px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-white"
          >
            <option value="View">
              閲覧
            </option>
            <option value="Edit">
              編集
            </option>
            <option value="Manage">
              管理
            </option>
          </select>
          <button
            type="button"
            class="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            :disabled="!newEmail || addingShare"
            @click="addShare"
          >
            追加
          </button>
        </div>
        <ErrorMessage
          v-if="addError"
          :message="addError"
          class="mt-2"
        />
      </section>

      <!-- Existing shares -->
      <section>
        <div class="font-medium mb-2">
          現在の共有 ({{ shares.length }})
        </div>
        <div
          v-if="loading"
          class="text-gray-500"
        >
          読み込み中…
        </div>
        <div
          v-else-if="shares.length === 0 && !linkShare"
          class="text-gray-500 text-xs"
        >
          まだ共有されていません。
        </div>
        <ul
          v-else
          class="divide-y divide-gray-100 border border-gray-100 rounded-md"
        >
          <li
            v-for="s in userShares"
            :key="s.name"
            class="flex items-center justify-between px-3 py-2"
          >
            <div>
              <div class="font-medium">
                {{ s.shared_with }}
              </div>
              <div class="text-xs text-gray-500">
                {{ permissionLabel(s.permission_level) }}
              </div>
            </div>
            <button
              type="button"
              class="text-xs text-red-600 hover:text-red-800"
              @click="removeShare(s.name)"
            >
              削除
            </button>
          </li>
        </ul>
      </section>

      <!-- Link -->
      <section>
        <div class="font-medium mb-2">
          リンクで共有
        </div>
        <div
          v-if="linkShare"
          class="space-y-2"
        >
          <div class="flex items-center gap-2">
            <input
              :value="linkUrl"
              readonly
              class="flex-1 px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-gray-50 font-mono"
            >
            <button
              type="button"
              class="px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-white hover:bg-gray-50 flex items-center gap-1"
              @click="copyLink"
            >
              <Copy :size="14" />
              コピー
            </button>
          </div>
          <button
            type="button"
            class="text-xs text-red-600 hover:text-red-800"
            @click="removeShare(linkShare.name)"
          >
            リンクを無効化
          </button>
        </div>
        <div
          v-else
          class="flex items-center gap-2"
        >
          <select
            v-model="linkLevel"
            class="px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-white"
          >
            <option value="View">
              閲覧
            </option>
            <option value="Edit">
              編集
            </option>
          </select>
          <input
            v-model="linkPassword"
            type="text"
            placeholder="パスワード (任意)"
            class="px-2 py-1.5 border border-gray-200 rounded-md text-sm flex-1"
          >
          <input
            v-model="linkExpires"
            type="date"
            class="px-2 py-1.5 border border-gray-200 rounded-md text-sm"
          >
          <button
            type="button"
            class="px-3 py-1.5 bg-gray-700 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
            :disabled="generatingLink"
            @click="generateLink"
          >
            生成
          </button>
        </div>
        <ErrorMessage
          v-if="linkError"
          :message="linkError"
          class="mt-2"
        />
      </section>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white hover:bg-gray-50"
        @click="dialogs.closeShare"
      >
        閉じる
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { Copy } from "lucide-vue-next"
import { ErrorMessage, call } from "frappe-ui"
import Modal from "@/components/Modal.vue"
import { useDialogs } from "@/composables/useDialogs"

const dialogs = useDialogs()
const { state } = dialogs
const item = computed(() => state.share.item)

const shares = ref([])
const loading = ref(false)
const newEmail = ref("")
const newLevel = ref("View")
const addingShare = ref(false)
const addError = ref(null)

const linkLevel = ref("View")
const linkPassword = ref("")
const linkExpires = ref("")
const generatingLink = ref(false)
const linkError = ref(null)

watch(
  () => state.share.open,
  (isOpen) => {
    if (isOpen && item.value) {
      loadShares()
      addError.value = null
      linkError.value = null
      newEmail.value = ""
      linkPassword.value = ""
      linkExpires.value = ""
    }
  },
)

const sharedDoctype = computed(() => (item.value?.kind === "folder" ? "Drive Folder" : "Drive File"))

const userShares = computed(() => shares.value.filter((s) => s.shared_with))
const linkShare = computed(() => shares.value.find((s) => s.share_link && !s.shared_with))

const linkUrl = computed(() => {
  if (!linkShare.value) return ""
  const base = window.location.origin
  return `${base}/drive-download?share_link=${encodeURIComponent(linkShare.value.share_link)}`
})

async function loadShares() {
  if (!item.value) return
  loading.value = true
  try {
    shares.value = await call("lifegence_drive.drive.api.share.get_shares", {
      shared_doctype: sharedDoctype.value,
      shared_name: item.value.id,
    })
  } catch (e) {
    shares.value = []
    addError.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

async function addShare() {
  if (!newEmail.value || !item.value) return
  addingShare.value = true
  addError.value = null
  try {
    await call("lifegence_drive.drive.api.share.create_share", {
      shared_doctype: sharedDoctype.value,
      shared_name: item.value.id,
      shared_with: newEmail.value,
      permission_level: newLevel.value,
    })
    newEmail.value = ""
    await loadShares()
  } catch (e) {
    addError.value = e.message || String(e)
  } finally {
    addingShare.value = false
  }
}

async function removeShare(shareName) {
  try {
    await call("lifegence_drive.drive.api.share.remove_share", { name: shareName })
    await loadShares()
  } catch (e) {
    addError.value = e.message || String(e)
  }
}

async function generateLink() {
  if (!item.value) return
  generatingLink.value = true
  linkError.value = null
  try {
    await call("lifegence_drive.drive.api.share.generate_link", {
      shared_doctype: sharedDoctype.value,
      shared_name: item.value.id,
      permission_level: linkLevel.value,
      link_password: linkPassword.value || null,
      expires_on: linkExpires.value || null,
    })
    await loadShares()
  } catch (e) {
    linkError.value = e.message || String(e)
  } finally {
    generatingLink.value = false
  }
}

function copyLink() {
  if (!linkUrl.value) return
  navigator.clipboard?.writeText(linkUrl.value)
}

function permissionLabel(level) {
  return { View: "閲覧", Edit: "編集", Manage: "管理" }[level] || level
}
</script>
