<template>
  <FileBrowser
    :folder-id="null"
    title="マイファイル"
  />
</template>

<script setup>
import { onMounted } from "vue"
import FileBrowser from "@/components/FileBrowser.vue"
import { useBreadcrumbStore } from "@/store"

const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())
</script>
