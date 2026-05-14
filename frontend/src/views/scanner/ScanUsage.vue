<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        スキャン使用状況
      </h1>
      <div class="flex items-center gap-2">
        <div class="inline-flex border border-gray-200 rounded-md overflow-hidden bg-white text-sm">
          <button
            v-for="opt in PERIODS"
            :key="opt.value"
            type="button"
            class="px-3 py-1"
            :class="period === opt.value ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 border-l border-gray-200 first:border-l-0'"
            @click="period = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <button
          type="button"
          class="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50"
          @click="summary.reload()"
        >
          <RefreshCw :size="14" />
        </button>
      </div>
    </div>

    <ErrorMessage
      v-if="summary.error"
      :message="summary.error.message"
    />

    <div
      v-if="summary.loading && !summary.data"
      class="text-sm text-gray-500"
    >
      読み込み中…
    </div>

    <div
      v-if="summary.data"
      class="space-y-6"
    >
      <!-- KPI cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="合計コスト"
          :primary="`¥${formatNumber(summary.data.total_cost_jpy)}`"
          :secondary="periodLabel"
        />
        <KpiCard
          label="スキャン回数"
          :primary="formatNumber(summary.data.total_scans)"
          :secondary="periodLabel"
        />
        <KpiCard
          label="入力トークン"
          :primary="formatNumber(summary.data.total_input_tokens)"
          :secondary="periodLabel"
        />
        <KpiCard
          label="出力トークン"
          :primary="formatNumber(summary.data.total_output_tokens)"
          :secondary="periodLabel"
        />
      </div>

      <!-- Budget vs spend (only meaningful for month, but shown when budget > 0) -->
      <section
        v-if="period === 'month' && (summary.data.monthly_budget_jpy ?? 0) > 0"
        class="bg-white border border-gray-200 rounded-md p-4"
      >
        <div class="flex items-center justify-between text-sm mb-1">
          <div class="font-medium">
            月間予算
          </div>
          <div class="text-gray-600">
            ¥{{ formatNumber(summary.data.total_cost_jpy) }}
            / ¥{{ formatNumber(summary.data.monthly_budget_jpy) }}
            <span
              class="ml-1"
              :class="usagePercent >= 100 ? 'text-red-600 font-medium' : usagePercent >= 80 ? 'text-amber-600' : 'text-gray-500'"
            >
              ({{ usagePercent.toFixed(1) }} %)
            </span>
          </div>
        </div>
        <div class="h-2 bg-gray-100 rounded overflow-hidden">
          <div
            class="h-full transition-all"
            :class="usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-amber-500' : 'bg-blue-500'"
            :style="{ width: `${Math.min(100, usagePercent)}%` }"
          />
        </div>
        <div class="mt-2 text-xs text-gray-500">
          開始日: {{ summary.data.start_date }}
        </div>
      </section>

      <section
        v-else-if="period === 'month'"
        class="bg-white border border-gray-200 rounded-md p-4 text-sm text-gray-600"
      >
        月間予算が設定されていません。
        <a
          href="/app/scanner-settings"
          target="_blank"
          rel="noopener"
          class="text-blue-600 hover:underline"
        >Scanner Settings</a> で <code>monthly_budget_jpy</code> を設定してください。
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { ErrorMessage, createResource } from "frappe-ui"
import { RefreshCw } from "lucide-vue-next"
import KpiCard from "@/components/scanner/KpiCard.vue"
import { useBreadcrumbStore } from "@/store"

const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const PERIODS = [
  { value: "month", label: "今月" },
  { value: "quarter", label: "今四半期" },
  { value: "year", label: "今年" },
]

const period = ref("month")
const periodLabel = computed(() => PERIODS.find((p) => p.value === period.value)?.label || "")

const summary = createResource({
  url: "lifegence_scanner.image_scanner.api.scan.get_usage_summary",
  makeParams: () => ({ period: period.value }),
  auto: true,
})

watch(period, () => summary.reload())

const usagePercent = computed(() => {
  const data = summary.data
  if (!data) return 0
  const budget = Number(data.monthly_budget_jpy || 0)
  const spent = Number(data.total_cost_jpy || 0)
  if (budget <= 0) return 0
  return (spent / budget) * 100
})

function formatNumber(n) {
  if (n == null) return "0"
  return Number(n).toLocaleString("ja-JP", { maximumFractionDigits: 0 })
}
</script>

