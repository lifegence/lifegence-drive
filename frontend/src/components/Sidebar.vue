<template>
  <aside class="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
    <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
      <RouterLink
        to="/"
        class="flex items-center gap-2 text-base font-semibold"
        @click="ui.closeSidebar"
      >
        <HardDrive
          :size="20"
          class="text-blue-600"
        />
        <span>{{ t("app.title") }}</span>
      </RouterLink>
      <button
        type="button"
        class="md:hidden text-gray-500 hover:text-gray-700"
        @click="ui.closeSidebar"
      >
        <X :size="18" />
      </button>
    </div>

    <nav class="flex-1 overflow-auto py-2">
      <RouterLink
        v-for="item in driveItems"
        :key="item.name"
        :to="item.to"
        class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        active-class="bg-blue-50 text-blue-700 border-r-2 border-blue-600"
        :exact-active-class="''"
        @click="ui.closeSidebar"
      >
        <component
          :is="item.icon"
          :size="18"
        />
        <span>{{ t(item.labelKey) }}</span>
      </RouterLink>
    </nav>

    <div class="border-t border-gray-200 p-3">
      <StorageBar />
    </div>
  </aside>
</template>

<script setup>
import { RouterLink } from "vue-router"
import { HardDrive, Folder, Share2, Star, Clock, Trash2, X } from "lucide-vue-next"
import StorageBar from "@/components/StorageBar.vue"
import { useI18n } from "@/composables/useI18n"
import { useUiStore } from "@/store"

const { t } = useI18n()
const ui = useUiStore()

const driveItems = [
  { name: "MyFiles", to: "/", labelKey: "nav.myFiles", icon: Folder },
  { name: "Shared", to: "/shared", labelKey: "nav.shared", icon: Share2 },
  { name: "Favorites", to: "/favorites", labelKey: "nav.favorites", icon: Star },
  { name: "Recents", to: "/recents", labelKey: "nav.recents", icon: Clock },
  { name: "Trash", to: "/trash", labelKey: "nav.trash", icon: Trash2 },
]
</script>
