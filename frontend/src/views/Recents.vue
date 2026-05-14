<template>
  <ItemBrowser
    :title="t('view.recents')"
    :items="items"
    :loading="resource.loading"
    :error="resource.error"
    :empty-text="t('empty.recents')"
    @open="actions.open"
    @context="(event, item) => actions.showFor(event, item, 'default')"
  />
</template>

<script setup>
import { computed, onMounted } from "vue"
import { createResource } from "frappe-ui"
import ItemBrowser from "@/components/ItemBrowser.vue"
import { useItemActions } from "@/composables/useItemActions"
import { useBreadcrumbStore } from "@/store"
import { useI18n } from "@/composables/useI18n"

const { t } = useI18n()
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

const actions = useItemActions({ onReload: () => resource.reload() })
</script>
