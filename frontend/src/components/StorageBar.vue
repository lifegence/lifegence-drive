<template>
  <div class="text-xs">
    <div class="flex items-center justify-between text-gray-600 mb-1">
      <span>ストレージ</span>
      <span v-if="storage.data">{{ storage.data.used_percent }} %</span>
    </div>
    <div class="h-1.5 rounded-full bg-gray-200 overflow-hidden">
      <div
        class="h-full bg-blue-500 transition-all"
        :style="{ width: `${storage.data?.used_percent ?? 0}%` }"
      />
    </div>
    <div
      v-if="storage.data"
      class="mt-1 text-gray-500"
    >
      {{ formatBytes(storage.data.used) }} / {{ formatBytes(storage.data.limit) }}
    </div>
    <ErrorMessage
      v-if="storage.error"
      :message="storage.error.message"
      class="mt-1"
    />
  </div>
</template>

<script setup>
import { ErrorMessage, createResource } from "frappe-ui"

const storage = createResource({
  url: "lifegence_drive.drive.api.storage.get_info",
  auto: true,
})

function formatBytes(n) {
  if (n == null) return "-"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let i = 0
  let v = Number(n)
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}
</script>
