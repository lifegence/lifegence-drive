<template>
  <ItemBrowser
    :title="title"
    :items="items"
    :loading="resource.loading"
    :error="resource.error"
    empty-text="一致するファイルがありません。"
    @open="actions.open"
    @context="(event, item) => actions.showFor(event, item, 'default')"
  />
</template>

<script setup>
import { computed, onMounted, watch } from "vue"
import { useRoute } from "vue-router"
import { createResource } from "frappe-ui"
import ItemBrowser from "@/components/ItemBrowser.vue"
import { useItemActions } from "@/composables/useItemActions"
import { useBreadcrumbStore } from "@/store"

const route = useRoute()
const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const query = computed(() => (typeof route.query.q === "string" ? route.query.q : ""))

const resource = createResource({
  url: "lifegence_drive.drive.api.search.search",
  params: () => ({ query: query.value || "" }),
  auto: () => query.value.length > 0,
})

watch(query, () => {
  if (query.value) resource.reload()
})

const title = computed(() => (query.value ? `検索: "${query.value}"` : "検索"))

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
