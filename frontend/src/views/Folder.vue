<template>
  <FileBrowser
    :folder-id="id"
    :title="t('view.folder')"
  />
</template>

<script setup>
import FileBrowser from "@/components/FileBrowser.vue"
import { useI18n } from "@/composables/useI18n"

defineProps({
  id: { type: String, required: true },
})

const { t } = useI18n()
</script>
