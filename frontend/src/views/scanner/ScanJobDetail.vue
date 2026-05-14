<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <RouterLink
          to="/scans"
          class="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
        >
          <ChevronLeft :size="14" />
          スキャンジョブ一覧
        </RouterLink>
        <h1 class="text-2xl font-semibold mt-1">
          {{ job?.job_name || id }}
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <ScanStatusBadge
          v-if="job?.status"
          :status="job.status"
        />
        <button
          type="button"
          class="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50"
          @click="resource.reload()"
        >
          <RefreshCw :size="14" />
        </button>
      </div>
    </div>

    <ErrorMessage
      v-if="resource.error"
      :message="resource.error.message"
    />

    <div
      v-if="job"
      class="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <div class="bg-white border border-gray-200 rounded-md p-4">
        <div class="text-xs text-gray-500 mb-1">
          進捗
        </div>
        <div class="text-2xl font-semibold">
          {{ job.processed_count || 0 }} / {{ job.total_images || 0 }}
        </div>
        <div class="mt-2 h-2 bg-gray-100 rounded overflow-hidden">
          <div
            class="h-full bg-blue-500 transition-all"
            :style="{ width: `${job.progress_percent || 0}%` }"
          />
        </div>
        <div class="mt-1 text-xs text-gray-500">
          成功 {{ job.success_count || 0 }} / 失敗 {{ job.error_count || 0 }}
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-md p-4">
        <div class="text-xs text-gray-500 mb-1">
          コスト (JPY)
        </div>
        <div class="text-2xl font-semibold">
          ¥{{ formatNumber(job.total_cost_jpy) }}
        </div>
        <div class="mt-1 text-xs text-gray-500">
          テンプレ: {{ job.template }}
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-md p-4 text-sm">
        <div class="text-xs text-gray-500 mb-1">
          タイムライン
        </div>
        <div>開始: {{ formatDate(job.started_at) }}</div>
        <div>終了: {{ formatDate(job.completed_at) }}</div>
        <div class="mt-1 text-xs text-gray-500 truncate">
          ソース: {{ job.source_folder }}
        </div>
      </div>
    </div>

    <div
      v-if="job"
      class="flex items-center gap-2"
    >
      <button
        v-if="canCancel"
        type="button"
        class="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white hover:bg-red-50 text-red-700"
        :disabled="acting"
        @click="cancel"
      >
        キャンセル
      </button>
      <button
        v-if="canRestart"
        type="button"
        class="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        :disabled="acting"
        @click="restart"
      >
        再開
      </button>
    </div>

    <div
      v-if="job"
      class="bg-white border border-gray-200 rounded-md overflow-hidden"
    >
      <div class="px-4 py-2 border-b border-gray-100 text-sm font-medium">
        アイテム ({{ job.items?.length || 0 }})
      </div>
      <table
        v-if="job.items && job.items.length > 0"
        class="w-full text-sm"
      >
        <thead class="text-xs text-gray-500 border-b border-gray-100">
          <tr>
            <th class="text-left font-medium px-3 py-2">
              ファイル
            </th>
            <th class="text-left font-medium px-3 py-2 w-24">
              ステータス
            </th>
            <th class="text-left font-medium px-3 py-2 w-32 hidden md:table-cell">
              トークン
            </th>
            <th class="text-left font-medium px-3 py-2 w-24 hidden md:table-cell">
              コスト
            </th>
            <th class="text-left font-medium px-3 py-2">
              結果 / エラー
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in job.items"
            :key="item.name"
            class="border-b border-gray-50 last:border-0"
          >
            <td class="px-3 py-2 truncate">
              {{ item.file_name || item.drive_file }}
            </td>
            <td class="px-3 py-2">
              <ScanItemStatus :status="item.status" />
            </td>
            <td class="px-3 py-2 hidden md:table-cell text-gray-700">
              {{ formatNumber(item.token_count) }}
            </td>
            <td class="px-3 py-2 hidden md:table-cell text-gray-700">
              ¥{{ formatNumber(item.cost_jpy) }}
            </td>
            <td class="px-3 py-2 text-xs">
              <span
                v-if="item.error_message"
                class="text-red-600"
                :title="item.error_message"
              >{{ item.error_message }}</span>
              <a
                v-else-if="item.result_drive_file"
                :href="`/app/drive-file/${item.result_drive_file}`"
                target="_blank"
                class="text-blue-600 hover:underline"
                rel="noopener"
              >結果ファイル</a>
              <span
                v-else
                class="text-gray-400"
              >—</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div
        v-else
        class="p-6 text-center text-sm text-gray-500"
      >
        アイテムなし
      </div>
    </div>

    <details
      v-if="job?.error_log"
      class="bg-white border border-gray-200 rounded-md p-4 text-sm"
    >
      <summary class="cursor-pointer font-medium text-red-700">
        エラーログ
      </summary>
      <pre class="mt-2 text-xs whitespace-pre-wrap text-gray-700">{{ job.error_log }}</pre>
    </details>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from "vue"
import { RouterLink } from "vue-router"
import { ChevronLeft, RefreshCw } from "lucide-vue-next"
import { ErrorMessage, call, createResource } from "frappe-ui"
import ScanStatusBadge from "@/components/scanner/ScanStatusBadge.vue"
import ScanItemStatus from "@/components/scanner/ScanItemStatus.vue"
import { useBreadcrumbStore } from "@/store"
import { useSocket } from "@/composables/useSocket"
import { ref } from "vue"

const props = defineProps({
  id: { type: String, required: true },
})

const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const acting = ref(false)

const resource = createResource({
  url: "frappe.client.get_doc",
  makeParams: () => ({ doctype: "Scan Job", name: props.id }),
  auto: true,
})

watch(() => props.id, () => resource.reload())

const job = computed(() => resource.data)

const canCancel = computed(() => ["Queued", "Processing"].includes(job.value?.status))
const canRestart = computed(() => ["Draft", "Failed", "Cancelled"].includes(job.value?.status))
const isRunning = computed(() => ["Queued", "Processing"].includes(job.value?.status))

// --- Realtime: prefer Socket.IO, fall back to polling --------------------
// Frappe's scan_processor pushes "scan_job_progress" events with
// { job_name, progress, current_item, status }. We reload the resource on
// every matching event, and keep a slower poll as a safety net in case
// the socket disconnects.
const socket = useSocket()

function onScanProgress(data) {
  if (data?.job_name === props.id) {
    resource.reload()
  }
}

let pollTimer = null
function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (!isRunning.value) {
      stopPolling()
      return
    }
    resource.reload()
  }, 15000) // socket is primary; poll every 15s as a fallback
}
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(
  isRunning,
  (running) => {
    if (running) startPolling()
    else stopPolling()
  },
  { immediate: true },
)

onMounted(() => {
  socket?.on?.("scan_job_progress", onScanProgress)
})
onBeforeUnmount(() => {
  stopPolling()
  socket?.off?.("scan_job_progress", onScanProgress)
})

async function cancel() {
  acting.value = true
  try {
    await call("lifegence_scanner.image_scanner.api.scan.cancel_scan_job", { job_name: props.id })
    resource.reload()
  } catch (e) {
    window.alert(`キャンセル失敗: ${e.message || e}`)
  } finally {
    acting.value = false
  }
}

async function restart() {
  acting.value = true
  try {
    await call("lifegence_scanner.image_scanner.api.scan.start_scan_job", { job_name: props.id })
    resource.reload()
  } catch (e) {
    window.alert(`再開失敗: ${e.message || e}`)
  } finally {
    acting.value = false
  }
}

function formatNumber(n) {
  if (n == null) return "0"
  return Number(n).toLocaleString("ja-JP", { maximumFractionDigits: 0 })
}
function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}
</script>
