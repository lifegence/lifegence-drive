<template>
  <div class="flex h-screen bg-gray-50 text-gray-900 relative">
    <!-- Backdrop (mobile only, shown when sidebar drawer is open) -->
    <div
      v-if="ui.sidebarOpen"
      class="fixed inset-0 bg-black/40 z-30 md:hidden"
      @click="ui.closeSidebar"
    />

    <!-- Sidebar
         desktop (>= md): in-flow, always visible
         mobile (< md):   fixed drawer, slides in/out -->
    <Sidebar
      class="fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:static md:translate-x-0"
      :class="ui.sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    />

    <div class="flex-1 flex flex-col min-w-0 w-full">
      <Topbar />
      <Breadcrumb :crumbs="breadcrumbStore.crumbs" />
      <main class="flex-1 overflow-auto">
        <slot />
      </main>
    </div>

    <ContextMenu />
    <UploadQueue />
    <ShareDialog />
    <MoveDialog />
    <FilePreview />
  </div>
</template>

<script setup>
import Sidebar from "@/components/Sidebar.vue"
import Topbar from "@/components/Topbar.vue"
import Breadcrumb from "@/components/Breadcrumb.vue"
import ContextMenu from "@/components/ContextMenu.vue"
import UploadQueue from "@/components/UploadQueue.vue"
import ShareDialog from "@/components/ShareDialog.vue"
import MoveDialog from "@/components/MoveDialog.vue"
import FilePreview from "@/components/FilePreview.vue"
import { useBreadcrumbStore, useUiStore } from "@/store"

const breadcrumbStore = useBreadcrumbStore()
const ui = useUiStore()
</script>
