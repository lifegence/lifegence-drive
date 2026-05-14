<template>
  <FileBrowser
    :folder-id="null"
    :title="t('view.myFiles')"
  />
</template>

<script setup>
import { onMounted } from "vue"
import FileBrowser from "@/components/FileBrowser.vue"
import { useBreadcrumbStore } from "@/store"
import { useI18n } from "@/composables/useI18n"

const { t } = useI18n()
const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())
</script>
