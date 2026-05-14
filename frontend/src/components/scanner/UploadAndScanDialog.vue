<template>
  <Modal
    :open="state.uploadAndScan.open"
    title="アップロードしてスキャン"
    width="lg"
    @close="close"
  >
    <div class="text-sm space-y-4">
      <!-- Job name -->
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">ジョブ名</label>
        <input
          v-model="jobName"
          type="text"
          class="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
          placeholder="例: 受領書類スキャン 2026-05"
        >
      </div>

      <!-- Template -->
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">テンプレート</label>
        <div
          v-if="templates.loading"
          class="text-gray-500"
        >
          読み込み中…
        </div>
        <ErrorMessage
          v-else-if="templates.error"
          :message="templates.error.message"
        />
        <select
          v-else
          v-model="selectedTemplate"
          class="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-white"
        >
          <option
            disabled
            value=""
          >
            テンプレートを選択
          </option>
          <option
            v-for="t in templates.data || []"
            :key="t.name"
            :value="t.name"
          >
            {{ t.template_name }} ({{ t.category }})
          </option>
        </select>
      </div>

      <!-- File selection -->
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">ファイル</label>
        <div
          class="border-2 border-dashed border-gray-200 rounded-md p-4 text-center hover:border-blue-300 cursor-pointer"
          @click="fileInput?.click()"
          @dragover.prevent
          @drop.prevent="onDrop"
        >
          <UploadCloud
            :size="24"
            class="mx-auto text-gray-400"
          />
          <div class="mt-1 text-xs text-gray-600">
            クリックまたはドラッグ&ドロップ (画像 / PDF)
          </div>
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*,application/pdf"
            class="hidden"
            @change="onPick"
          >
        </div>
        <ul
          v-if="files.length > 0"
          class="mt-2 text-xs border border-gray-100 rounded-md divide-y divide-gray-100 max-h-32 overflow-auto"
        >
          <li
            v-for="(f, i) in files"
            :key="i"
            class="px-2 py-1 flex items-center justify-between gap-2"
          >
            <span class="truncate flex-1">{{ f.name }}</span>
            <span class="text-gray-500 shrink-0">{{ formatBytes(f.size) }}</span>
            <button
              type="button"
              class="text-red-500 hover:text-red-700"
              @click="files.splice(i, 1)"
            >
              <X :size="12" />
            </button>
          </li>
        </ul>
      </div>

      <div
        v-if="uploading"
        class="text-xs text-gray-600 flex items-center gap-2"
      >
        <Loader2
          :size="14"
          class="animate-spin"
        />
        アップロード中…
      </div>
      <ErrorMessage
        v-if="errorMessage"
        :message="errorMessage"
      />
    </div>

    <template #footer>
      <button
        type="button"
        class="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white hover:bg-gray-50"
        :disabled="uploading"
        @click="close"
      >
        キャンセル
      </button>
      <button
        type="button"
        class="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        :disabled="!canSubmit || uploading"
        @click="submit"
      >
        アップロードして開始
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { ErrorMessage, createResource } from "frappe-ui"
import { UploadCloud, X, Loader2 } from "lucide-vue-next"
import Modal from "@/components/Modal.vue"
import { useDialogs } from "@/composables/useDialogs"

const router = useRouter()
const dialogs = useDialogs()
const { state } = dialogs

const fileInput = ref(null)
const files = ref([])
const jobName = ref("")
const selectedTemplate = ref("")
const uploading = ref(false)
const errorMessage = ref(null)

const templates = createResource({
  url: "lifegence_scanner.image_scanner.api.template.get_templates",
  auto: false,
})

watch(
  () => state.uploadAndScan.open,
  (isOpen) => {
    if (!isOpen) return
    files.value = []
    selectedTemplate.value = ""
    errorMessage.value = null
    const ts = new Date().toISOString().slice(0, 16).replace("T", " ")
    jobName.value = `アップロードスキャン ${ts}`
    templates.reload()
  },
)

const canSubmit = computed(
  () => files.value.length > 0 && selectedTemplate.value && jobName.value.trim(),
)

function close() {
  if (uploading.value) return
  dialogs.closeUploadAndScan()
}

function onPick(event) {
  const list = Array.from(event.target.files || [])
  files.value.push(...list)
  if (event.target) event.target.value = ""
}

function onDrop(event) {
  const list = Array.from(event.dataTransfer?.files || [])
  files.value.push(...list)
}

async function submit() {
  if (!canSubmit.value) return
  uploading.value = true
  errorMessage.value = null

  const fd = new FormData()
  fd.append("template", selectedTemplate.value)
  fd.append("job_name", jobName.value.trim())
  for (const f of files.value) {
    fd.append("files", f)
  }

  try {
    const res = await fetch(
      "/api/method/lifegence_scanner.image_scanner.api.upload.batch_upload_and_scan",
      {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: window.csrf_token ? { "X-Frappe-CSRF-Token": window.csrf_token } : {},
      },
    )
    if (!res.ok) {
      const text = await res.text()
      let msg = `HTTP ${res.status}`
      try {
        const body = JSON.parse(text)
        msg = body._error_message || body.message || JSON.stringify(body.exception || body).slice(0, 240)
      } catch {
        /* ignore */
      }
      throw new Error(msg)
    }
    const data = await res.json()
    const result = data.message || data
    close()
    if (result?.job_name) {
      router.push(`/scans/${result.job_name}`)
    } else {
      router.push("/scans")
    }
  } catch (e) {
    errorMessage.value = e.message || String(e)
  } finally {
    uploading.value = false
  }
}

function formatBytes(n) {
  if (n == null) return ""
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let v = Number(n)
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}
</script>
