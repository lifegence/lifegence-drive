<template>
  <ItemBrowser
    title="最近"
    :items="items"
    :loading="resource.loading"
    :error="resource.error"
    empty-text="最近のファイルはありません。"
    @open="onOpen"
  />
</template>

<script setup>
import { computed, onMounted } from "vue"
import { createResource } from "frappe-ui"
import ItemBrowser from "@/components/ItemBrowser.vue"
import { useBreadcrumbStore } from "@/store"

const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const resource = createResource({
  url: "lifegence_drive.drive.api.recent.get_recent_files",
  auto: true,
})

const items = computed(() =>
  (resource.data || []).map((r) => ({
    kind: "file",
    id: r.name,
    label: r.file_name,
    size: r.file_size,
    modified: r.modified,
    extension: r.extension || "",
    mime_type: r.mime_type || "",
    file_url: r.file_url,
  })),
)

function onOpen(item) {
  if (item.file_url) {
    window.open(item.file_url, "_blank", "noopener")
  }
}
</script>
