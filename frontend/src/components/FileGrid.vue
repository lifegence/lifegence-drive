<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
    <button
      v-for="item in items"
      :key="`${item.kind}-${item.id}`"
      type="button"
      class="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 p-3 cursor-pointer text-left"
      @click="$emit('open', item)"
    >
      <FileTypeIcon
        :is-folder="item.kind === 'folder'"
        :extension="item.extension"
        :mime-type="item.mime_type"
        :size="36"
      />
      <div
        class="mt-2 text-xs text-center text-gray-800 line-clamp-2 break-all"
        :title="item.label"
      >
        {{ item.label }}
      </div>
      <div
        v-if="item.size != null"
        class="text-[10px] text-gray-500 mt-0.5"
      >
        {{ formatBytes(item.size) }}
      </div>
    </button>
  </div>
</template>

<script setup>
import FileTypeIcon from "@/components/FileTypeIcon.vue"

defineProps({
  items: { type: Array, required: true },
})

defineEmits(["open"])

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
