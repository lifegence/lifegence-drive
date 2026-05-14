<template>
  <ItemBrowser
    :title="t('view.shared')"
    :items="items"
    :loading="resource.loading"
    :error="resource.error"
    :empty-text="t('empty.shared')"
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
import { useI18n } from "@/composables/useI18n"

const { t } = useI18n()
const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const resource = createResource({
  url: "lifegence_drive.drive.api.share.get_shared_with_me",
  auto: true,
})

const items = computed(() => normalizeFromTypeField(resource.data))

const actions = useItemActions({ onReload: () => resource.reload() })
</script>
