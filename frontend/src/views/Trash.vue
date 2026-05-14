<template>
  <ItemBrowser
    title="ゴミ箱"
    :items="items"
    :loading="resource.loading"
    :error="resource.error"
    empty-text="ゴミ箱は空です。"
  />
</template>

<script setup>
import { computed, onMounted } from "vue"
import { createResource } from "frappe-ui"
import ItemBrowser from "@/components/ItemBrowser.vue"
import { normalizeFromTrash } from "@/composables/normalizeItem"
import { useBreadcrumbStore } from "@/store"

const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const resource = createResource({
  url: "lifegence_drive.drive.api.trash.get_trash",
  auto: true,
})

const items = computed(() => normalizeFromTrash(resource.data))
// Restore / permanent delete actions land in Phase 1-8 (ContextMenu).
</script>
