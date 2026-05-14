<template>
  <span
    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
    :class="style.cls"
  >
    {{ style.label }}
  </span>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
  status: { type: String, required: true },
})

const STYLES = {
  Pending: { cls: "bg-gray-50 text-gray-600 border-gray-200", label: "待機" },
  Processing: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "処理中" },
  Success: { cls: "bg-green-50 text-green-700 border-green-200", label: "成功" },
  Failed: { cls: "bg-red-50 text-red-700 border-red-200", label: "失敗" },
  Skipped: { cls: "bg-gray-50 text-gray-500 border-gray-200", label: "スキップ" },
}

const style = computed(() => STYLES[props.status] || { cls: "bg-gray-50 text-gray-500 border-gray-200", label: props.status })
</script>
