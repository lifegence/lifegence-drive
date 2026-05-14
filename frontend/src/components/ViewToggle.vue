<template>
  <div class="inline-flex rounded-md border border-gray-200 bg-white overflow-hidden text-sm">
    <button
      type="button"
      class="px-2 py-1 flex items-center gap-1"
      :class="store.mode === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'"
      @click="store.setMode('grid')"
    >
      <LayoutGrid :size="16" />
    </button>
    <button
      type="button"
      class="px-2 py-1 flex items-center gap-1 border-l border-gray-200"
      :class="store.mode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'"
      @click="store.setMode('list')"
    >
      <List :size="16" />
    </button>
  </div>
</template>

<script setup>
import { LayoutGrid, List } from "lucide-vue-next"
import { useViewStore } from "@/store"

const store = useViewStore()
</script>
