<template>
  <ItemBrowser
    :title="t('view.trash')"
    :items="items"
    :loading="resource.loading"
    :error="resource.error"
    :empty-text="t('empty.trash')"
    @context="(event, item) => actions.showFor(event, item, 'trash')"
  />
</template>

<script setup>
import { computed, onMounted } from "vue"
import { createResource } from "frappe-ui"
import ItemBrowser from "@/components/ItemBrowser.vue"
import { normalizeFromTrash } from "@/composables/normalizeItem"
import { useItemActions } from "@/composables/useItemActions"
import { useBreadcrumbStore } from "@/store"
import { useI18n } from "@/composables/useI18n"

const { t } = useI18n()
const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const resource = createResource({
  url: "lifegence_drive.drive.api.trash.get_trash",
  auto: true,
})

const items = computed(() => normalizeFromTrash(resource.data))

const actions = useItemActions({ onReload: () => resource.reload() })
</script>
