<template>
  <div>
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h1 class="text-xl font-semibold">
        {{ title }}
      </h1>
      <ViewToggle />
    </div>

    <div
      v-if="loading && items.length === 0"
      class="p-6 text-sm text-gray-500"
    >
      読み込み中…
    </div>
    <ErrorMessage
      v-else-if="error"
      :message="error.message"
      class="m-4"
    />
    <div
      v-else-if="items.length === 0"
      class="p-12 text-center text-sm text-gray-500"
    >
      {{ emptyText }}
    </div>
    <FileGrid
      v-else-if="viewStore.mode === 'grid'"
      :items="items"
      @open="(item) => $emit('open', item)"
    />
    <FileList
      v-else
      :items="items"
      @open="(item) => $emit('open', item)"
    />
  </div>
</template>

<script setup>
import { ErrorMessage } from "frappe-ui"
import FileGrid from "@/components/FileGrid.vue"
import FileList from "@/components/FileList.vue"
import ViewToggle from "@/components/ViewToggle.vue"
import { useViewStore } from "@/store"

defineProps({
  title: { type: String, required: true },
  items: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
  emptyText: { type: String, default: "アイテムがありません。" },
})

defineEmits(["open"])

const viewStore = useViewStore()
</script>
