<template>
  <div class="px-2">
    <table class="w-full text-sm">
      <thead class="text-xs text-gray-500 border-b border-gray-200">
        <tr>
          <th class="text-left font-medium px-3 py-2">
            名前
          </th>
          <th class="text-left font-medium px-3 py-2 w-32 hidden sm:table-cell">
            サイズ
          </th>
          <th class="text-left font-medium px-3 py-2 w-40 hidden md:table-cell">
            更新日時
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in items"
          :key="`${item.kind}-${item.id}`"
          class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          @click="$emit('open', item)"
          @contextmenu.prevent="$emit('context', $event, item)"
        >
          <td class="px-3 py-2">
            <div class="flex items-center gap-2 min-w-0">
              <FileTypeIcon
                :is-folder="item.kind === 'folder'"
                :extension="item.extension"
                :mime-type="item.mime_type"
                :size="18"
              />
              <span class="truncate">{{ item.label }}</span>
              <span
                v-if="item.kind === 'folder'"
                class="text-[10px] text-gray-400 font-mono shrink-0"
              >
                {{ item.id }}
              </span>
            </div>
          </td>
          <td class="px-3 py-2 text-gray-600 hidden sm:table-cell">
            <template v-if="item.size != null">
              {{ formatBytes(item.size) }}
            </template>
            <template v-else-if="item.kind === 'folder' && item.item_count != null">
              <span :class="item.item_count === 0 ? 'text-gray-400' : 'text-gray-600'">
                {{ item.item_count === 0 ? "空" : `${item.item_count} 件` }}
              </span>
            </template>
            <template v-else>
              —
            </template>
          </td>
          <td class="px-3 py-2 text-gray-600 hidden md:table-cell">
            {{ formatDate(item.modified) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import FileTypeIcon from "@/components/FileTypeIcon.vue"

defineProps({
  items: { type: Array, required: true },
})

defineEmits(["open", "context"])

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

function formatDate(iso) {
  if (!iso) return ""
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
