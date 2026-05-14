<template>
  <div class="flex h-screen bg-gray-50 text-gray-900">
    <Sidebar />
    <div class="flex-1 flex flex-col min-w-0">
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
    <ScanTemplateModal />
    <UploadAndScanDialog />
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
import ScanTemplateModal from "@/components/scanner/ScanTemplateModal.vue"
import UploadAndScanDialog from "@/components/scanner/UploadAndScanDialog.vue"
import { useBreadcrumbStore } from "@/store"

const breadcrumbStore = useBreadcrumbStore()
</script>
