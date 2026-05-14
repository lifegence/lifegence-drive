<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border"
    :class="cls"
  >
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
  status: { type: String, required: true },
})

const STYLES = {
  Draft: { cls: "bg-gray-50 text-gray-700 border-gray-200", label: "下書き" },
  Queued: { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "待機中" },
  Processing: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "処理中" },
  Completed: { cls: "bg-green-50 text-green-700 border-green-200", label: "完了" },
  "Partially Completed": { cls: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "一部完了" },
  Failed: { cls: "bg-red-50 text-red-700 border-red-200", label: "失敗" },
  Cancelled: { cls: "bg-gray-50 text-gray-500 border-gray-200", label: "キャンセル" },
}

const style = computed(() => STYLES[props.status] || { cls: "bg-gray-50 text-gray-600 border-gray-200", label: props.status })
const cls = computed(() => style.value.cls)
const label = computed(() => style.value.label)
</script>
