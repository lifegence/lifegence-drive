<template>
  <div>
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h1 class="text-xl font-semibold">
        スキャンジョブ
      </h1>
      <div class="flex items-center gap-2">
        <select
          v-model="statusFilter"
          class="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white"
        >
          <option value="">
            全ステータス
          </option>
          <option
            v-for="s in STATUS_OPTIONS"
            :key="s"
            :value="s"
          >
            {{ s }}
          </option>
        </select>
        <button
          type="button"
          class="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50"
          @click="jobs.reload()"
        >
          <RefreshCw :size="14" />
        </button>
      </div>
    </div>

    <div
      v-if="jobs.loading && (!jobs.data || jobs.data.length === 0)"
      class="p-6 text-sm text-gray-500"
    >
      読み込み中…
    </div>
    <ErrorMessage
      v-else-if="jobs.error"
      :message="jobs.error.message"
      class="m-4"
    />
    <div
      v-else-if="!jobs.data || jobs.data.length === 0"
      class="p-12 text-center text-sm text-gray-500"
    >
      スキャンジョブはありません。フォルダの右クリックメニューから開始できます。
    </div>
    <table
      v-else
      class="w-full text-sm"
    >
      <thead class="text-xs text-gray-500 border-b border-gray-200">
        <tr>
          <th class="text-left font-medium px-3 py-2">
            ジョブ名
          </th>
          <th class="text-left font-medium px-3 py-2 w-28">
            ステータス
          </th>
          <th class="text-left font-medium px-3 py-2 w-24 hidden md:table-cell">
            進捗
          </th>
          <th class="text-left font-medium px-3 py-2 w-28 hidden md:table-cell">
            コスト
          </th>
          <th class="text-left font-medium px-3 py-2 w-40 hidden lg:table-cell">
            開始日時
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="job in jobs.data"
          :key="job.name"
          class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          @click="open(job.name)"
        >
          <td class="px-3 py-2">
            <div class="font-medium truncate">
              {{ job.job_name }}
            </div>
            <div class="text-[11px] text-gray-500 truncate">
              {{ job.template }}
            </div>
          </td>
          <td class="px-3 py-2">
            <ScanStatusBadge :status="job.status" />
          </td>
          <td class="px-3 py-2 hidden md:table-cell text-gray-700">
            <template v-if="job.total_images">
              {{ job.processed_count || 0 }} / {{ job.total_images }}
            </template>
            <template v-else>
              —
            </template>
          </td>
          <td class="px-3 py-2 hidden md:table-cell text-gray-700">
            ¥{{ formatNumber(job.total_cost_jpy) }}
          </td>
          <td class="px-3 py-2 hidden lg:table-cell text-gray-600">
            {{ formatDate(job.started_at) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from "vue"
import { useRouter } from "vue-router"
import { ErrorMessage, createResource } from "frappe-ui"
import { RefreshCw } from "lucide-vue-next"
import ScanStatusBadge from "@/components/scanner/ScanStatusBadge.vue"
import { useBreadcrumbStore } from "@/store"
import { ref } from "vue"

const router = useRouter()
const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const STATUS_OPTIONS = ["Draft", "Queued", "Processing", "Completed", "Partially Completed", "Failed", "Cancelled"]

const statusFilter = ref("")

const filters = computed(() => {
  const f = {}
  if (statusFilter.value) f.status = statusFilter.value
  return f
})

const jobs = createResource({
  url: "frappe.client.get_list",
  makeParams: () => ({
    doctype: "Scan Job",
    fields: [
      "name",
      "job_name",
      "template",
      "status",
      "source_folder",
      "total_images",
      "processed_count",
      "total_cost_jpy",
      "started_at",
      "completed_at",
      "creation",
    ],
    filters: filters.value,
    order_by: "creation desc",
    limit_page_length: 50,
  }),
  auto: true,
})

watch(statusFilter, () => jobs.reload())

function open(name) {
  router.push(`/scans/${name}`)
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
