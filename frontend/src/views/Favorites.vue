<template>
  <ItemBrowser
    title="お気に入り"
    :items="items"
    :loading="resource.loading"
    :error="resource.error"
    empty-text="お気に入りはありません。"
    @open="actions.open"
    @context="(event, item) => actions.showFor(event, item, 'default')"
  />
</template>

<script setup>
import { computed, onMounted } from "vue"
import { createResource } from "frappe-ui"
import ItemBrowser from "@/components/ItemBrowser.vue"
import { normalizeFromTypeField } from "@/composables/normalizeItem"
import { useItemActions } from "@/composables/useItemActions"
import { useBreadcrumbStore } from "@/store"

const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const resource = createResource({
  url: "lifegence_drive.drive.api.favorite.get_favorites",
  auto: true,
})

const items = computed(() => normalizeFromTypeField(resource.data))

const actions = useItemActions({ onReload: () => resource.reload() })
</script>
