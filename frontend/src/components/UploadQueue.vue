<template>
  <div
    v-if="state.queue.length > 0"
    class="fixed bottom-4 right-4 w-80 max-h-96 bg-white border border-gray-200 rounded-md shadow-lg z-30 flex flex-col"
  >
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100">
      <div class="text-sm font-medium">
        アップロード ({{ completed }} / {{ state.queue.length }})
      </div>
      <button
        type="button"
        class="text-xs text-gray-500 hover:text-gray-800"
        @click="clearCompleted"
      >
        完了を消す
      </button>
    </div>
    <ul class="flex-1 overflow-auto text-sm">
      <li
        v-for="item in state.queue"
        :key="item.id"
        class="px-3 py-2 border-b border-gray-50 last:border-0"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="truncate flex-1"
            :title="item.name"
          >{{ item.name }}</span>
          <span class="text-xs shrink-0">
            <CheckCircle2
              v-if="item.status === 'done'"
              :size="14"
              class="text-green-600 inline"
            />
            <AlertCircle
              v-else-if="item.status === 'error'"
              :size="14"
              class="text-red-600 inline"
            />
            <span v-else>{{ item.progress }}%</span>
          </span>
        </div>
        <div
          v-if="item.status === 'uploading' || item.status === 'pending'"
          class="mt-1 h-1 bg-gray-100 rounded overflow-hidden"
        >
          <div
            class="h-full bg-blue-500"
            :style="{ width: `${item.progress}%` }"
          />
        </div>
        <div
          v-else-if="item.status === 'error'"
          class="mt-1 text-[11px] text-red-600 truncate"
          :title="item.error"
        >
          {{ item.error }}
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { CheckCircle2, AlertCircle } from "lucide-vue-next"
import { useFileUpload } from "@/composables/useFileUpload"

const { state, clearCompleted } = useFileUpload()
const completed = computed(() => state.queue.filter((i) => i.status === "done").length)
</script>
