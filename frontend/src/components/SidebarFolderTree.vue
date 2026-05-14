<template>
  <div class="px-2">
    <div class="flex items-center justify-between mb-1 px-2">
      <button
        type="button"
        class="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-700"
        @click="collapsed = !collapsed"
      >
        <ChevronRight
          v-if="collapsed"
          :size="10"
        />
        <ChevronDown
          v-else
          :size="10"
        />
        フォルダ
      </button>
      <button
        type="button"
        class="text-gray-400 hover:text-gray-700"
        title="再読込"
        @click="rootFolders.reload()"
      >
        <RefreshCw :size="11" />
      </button>
    </div>

    <div
      v-if="!collapsed"
      class="max-h-64 overflow-auto"
    >
      <div
        v-if="rootFolders.loading"
        class="text-[11px] text-gray-400 px-2 py-1"
      >
        読み込み中…
      </div>
      <div
        v-else-if="!rootFolders.data || rootFolders.data.length === 0"
        class="text-[11px] text-gray-400 px-2 py-1"
      >
        フォルダなし
      </div>
      <ul v-else>
        <SidebarFolderNode
          v-for="f in rootFolders.data"
          :key="f.name"
          :folder="f"
          :depth="0"
        />
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { ChevronRight, ChevronDown, RefreshCw } from "lucide-vue-next"
import { createResource } from "frappe-ui"
import SidebarFolderNode from "@/components/SidebarFolderNode.vue"

const collapsed = ref(false)

const rootFolders = createResource({
  url: "lifegence_drive.drive.api.folder.get_folders",
  params: { parent_folder: null },
  auto: true,
})
</script>
