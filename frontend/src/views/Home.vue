<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold mb-4">Lifegence Drive</h1>
    <p class="text-sm text-gray-600 mb-6">
      Vue 3 SPA scaffolding — Phase 0 (2026-05-14)
    </p>

    <div class="bg-white rounded-md shadow p-4 max-w-md">
      <h2 class="text-lg font-medium mb-2">Storage</h2>
      <ErrorMessage v-if="storage.error" :message="storage.error.message" class="mb-2" />
      <div v-else-if="storage.loading">読み込み中…</div>
      <div v-else-if="storage.data" class="text-sm space-y-1">
        <div>使用: {{ formatBytes(storage.data.used) }}</div>
        <div>容量: {{ formatBytes(storage.data.limit) }}</div>
        <div>残: {{ formatBytes(storage.data.remaining) }} ({{ storage.data.used_percent }} %)</div>
      </div>
      <Button class="mt-3" @click="storage.reload()">
        再読込
      </Button>
    </div>
  </div>
</template>

<script setup>
import { createResource } from "frappe-ui"

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
  return `${v.toFixed(2)} ${units[i]}`
}
</script>
