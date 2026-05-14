<template>
  <Modal
    :open="state.scanTemplate.open"
    :title="`スキャン: ${item?.label || ''}`"
    width="lg"
    @close="dialogs.closeScanTemplate"
  >
    <div class="text-sm space-y-4">
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">ジョブ名</label>
        <input
          v-model="jobName"
          type="text"
          class="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
          placeholder="例: 領収書スキャン 2026-05"
        >
      </div>

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
        <div
          v-else-if="!templates.data || templates.data.length === 0"
          class="text-xs text-gray-500 border border-gray-100 rounded-md p-3"
        >
          アクティブなテンプレートがありません。
          <RouterLink
            to="/scan-templates"
            class="text-blue-600 hover:underline"
            @click="dialogs.closeScanTemplate"
          >
            テンプレ管理
          </RouterLink>
          から作成してください。
        </div>
        <ul
          v-else
          class="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-60 overflow-auto"
        >
          <li
            v-for="t in templates.data"
            :key="t.name"
            class="px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-start gap-2"
            :class="{ 'bg-blue-50': selectedTemplate === t.name }"
            @click="selectedTemplate = t.name"
          >
            <input
              type="radio"
              :checked="selectedTemplate === t.name"
              class="mt-0.5"
              @change="selectedTemplate = t.name"
            >
            <div class="flex-1 min-w-0">
              <div class="font-medium">
                {{ t.template_name }}
              </div>
              <div class="text-xs text-gray-500 flex items-center gap-2">
                <span class="px-1.5 py-0.5 bg-gray-100 rounded">{{ t.category }}</span>
                <span>{{ t.language }}</span>
              </div>
              <div
                v-if="t.description"
                class="text-xs text-gray-600 mt-0.5 truncate"
              >
                {{ t.description }}
              </div>
            </div>
          </li>
        </ul>
      </div>

      <ErrorMessage
        v-if="createError"
        :message="createError"
      />
    </div>

    <template #footer>
      <button
        type="button"
        class="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white hover:bg-gray-50"
        @click="dialogs.closeScanTemplate"
      >
        キャンセル
      </button>
      <button
        type="button"
        class="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        :disabled="!canSubmit || creating"
        @click="submit"
      >
        スキャン開始
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { ErrorMessage, call, createResource } from "frappe-ui"
import Modal from "@/components/Modal.vue"
import { useDialogs } from "@/composables/useDialogs"

const router = useRouter()
const dialogs = useDialogs()
const { state } = dialogs
const item = computed(() => state.scanTemplate.item)

const templates = createResource({
  url: "lifegence_scanner.image_scanner.api.template.get_templates",
  auto: false,
})

const jobName = ref("")
const selectedTemplate = ref(null)
const creating = ref(false)
const createError = ref(null)

const canSubmit = computed(() => Boolean(item.value && selectedTemplate.value && jobName.value.trim()))

watch(
  () => state.scanTemplate.open,
  (isOpen) => {
    if (!isOpen) return
    createError.value = null
    selectedTemplate.value = null
    const ts = new Date().toISOString().slice(0, 16).replace("T", " ")
    jobName.value = `${item.value?.label || "スキャン"} ${ts}`
    templates.reload()
  },
)

async function submit() {
  if (!canSubmit.value) return
  creating.value = true
  createError.value = null
  try {
    const result = await call("lifegence_scanner.image_scanner.api.scan.create_scan_job", {
      job_name: jobName.value.trim(),
      template: selectedTemplate.value,
      source_folder: item.value.id,
      auto_start: true,
    })
    dialogs.closeScanTemplate()
    if (result?.job_name) {
      router.push(`/scans/${result.job_name}`)
    } else {
      router.push("/scans")
    }
  } catch (e) {
    createError.value = e.message || String(e)
  } finally {
    creating.value = false
  }
}
</script>
