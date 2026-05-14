<template>
  <Modal
    :open="state.move.open"
    :title="`移動: ${item?.label || ''}`"
    width="md"
    @close="dialogs.closeMove"
  >
    <div class="text-sm space-y-3">
      <div class="text-gray-600">
        移動先を選択してください。
      </div>
      <div
        class="border border-gray-200 rounded-md p-2 max-h-72 overflow-auto"
      >
        <button
          type="button"
          class="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm flex items-center gap-1"
          :class="{ 'bg-blue-50 text-blue-700': selectedId === '__root__' }"
          @click="selectedId = '__root__'"
        >
          <Home :size="14" />
          ルート
        </button>
        <ul v-if="rootFolders.length > 0">
          <FolderTreeNode
            v-for="f in rootFolders"
            :key="f.name"
            :folder="f"
            :selected-id="selectedId === '__root__' ? null : selectedId"
            :disabled-id="disabledFolderId"
            @select="(id) => (selectedId = id)"
          />
        </ul>
        <div
          v-else-if="!loading"
          class="text-xs text-gray-400 px-2 py-1"
        >
          フォルダなし
        </div>
      </div>
      <ErrorMessage
        v-if="error"
        :message="error"
      />
    </div>

    <template #footer>
      <button
        type="button"
        class="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white hover:bg-gray-50"
        @click="dialogs.closeMove"
      >
        キャンセル
      </button>
      <button
        type="button"
        class="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        :disabled="!canMove || moving"
        @click="doMove"
      >
        移動
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { Home } from "lucide-vue-next"
import { ErrorMessage, call } from "frappe-ui"
import Modal from "@/components/Modal.vue"
import FolderTreeNode from "@/components/FolderTreeNode.vue"
import { useDialogs } from "@/composables/useDialogs"

const dialogs = useDialogs()
const { state } = dialogs
const item = computed(() => state.move.item)

const rootFolders = ref([])
const loading = ref(false)
const selectedId = ref(null)
const moving = ref(false)
const error = ref(null)

// Disable moving a folder into itself (its own subtree is harder to detect
// without recursion; backend rejects on move anyway).
const disabledFolderId = computed(() => (item.value?.kind === "folder" ? item.value.id : null))

const canMove = computed(() => selectedId.value !== null)

watch(
  () => state.move.open,
  async (isOpen) => {
    if (isOpen) {
      selectedId.value = null
      error.value = null
      await loadRoot()
    }
  },
)

async function loadRoot() {
  loading.value = true
  try {
    rootFolders.value = await call("lifegence_drive.drive.api.folder.get_folders", {
      parent_folder: null,
    })
  } catch (e) {
    rootFolders.value = []
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

async function doMove() {
  if (!item.value || !canMove.value) return
  moving.value = true
  error.value = null
  const target = selectedId.value === "__root__" ? null : selectedId.value
  try {
    if (item.value.kind === "folder") {
      await call("lifegence_drive.drive.api.folder.move", {
        name: item.value.id,
        target_parent: target,
      })
    } else {
      await call("lifegence_drive.drive.api.file.move", {
        name: item.value.id,
        target_folder: target,
      })
    }
    dialogs.closeMove()
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    moving.value = false
  }
}
</script>
