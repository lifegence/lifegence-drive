<template>
  <FileBrowser
    :folder-id="id"
    title="フォルダ"
  />
</template>

<script setup>
import FileBrowser from "@/components/FileBrowser.vue"

defineProps({
  id: { type: String, required: true },
})
</script>
