<template>
  <header class="h-14 shrink-0 border-b border-gray-200 bg-white flex items-center px-4 gap-4">
    <div class="flex-1 max-w-md">
      <div class="relative">
        <Search
          :size="16"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="検索 (Phase 1-14 で実装)"
          class="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
          disabled
        >
      </div>
    </div>

    <div class="text-sm text-gray-600 flex items-center gap-2">
      <UserCircle :size="20" />
      <span>{{ user.currentUser }}</span>
    </div>
  </header>
</template>

<script setup>
import { Search, UserCircle } from "lucide-vue-next"
import { useUserStore } from "@/store"

const user = useUserStore()
</script>
