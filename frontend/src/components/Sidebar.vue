<template>
  <aside class="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
    <div class="px-4 py-3 border-b border-gray-200">
      <RouterLink
        to="/"
        class="flex items-center gap-2 text-base font-semibold"
      >
        <HardDrive
          :size="20"
          class="text-blue-600"
        />
        <span>Lifegence Drive</span>
      </RouterLink>
    </div>

    <nav class="flex-1 overflow-auto py-2">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="item.to"
        class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        active-class="bg-blue-50 text-blue-700 border-r-2 border-blue-600"
        :exact-active-class="''"
      >
        <component
          :is="item.icon"
          :size="18"
        />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="border-t border-gray-200 p-3">
      <StorageBar />
    </div>
  </aside>
</template>

<script setup>
import { RouterLink } from "vue-router"
import { HardDrive, Folder, Share2, Star, Clock, Trash2 } from "lucide-vue-next"
import StorageBar from "@/components/StorageBar.vue"

const items = [
  { name: "MyFiles", to: "/", label: "マイファイル", icon: Folder },
  { name: "Shared", to: "/shared", label: "共有", icon: Share2 },
  { name: "Favorites", to: "/favorites", label: "お気に入り", icon: Star },
  { name: "Recents", to: "/recents", label: "最近", icon: Clock },
  { name: "Trash", to: "/trash", label: "ゴミ箱", icon: Trash2 },
]
</script>
