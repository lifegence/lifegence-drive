<template>
  <ItemBrowser
    title="共有"
    :items="items"
    :loading="resource.loading"
    :error="resource.error"
    empty-text="共有されたアイテムはありません。"
    @open="onOpen"
  />
</template>

<script setup>
import { computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { createResource } from "frappe-ui"
import ItemBrowser from "@/components/ItemBrowser.vue"
import { normalizeFromTypeField } from "@/composables/normalizeItem"
import { useBreadcrumbStore } from "@/store"

const router = useRouter()
const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const resource = createResource({
  url: "lifegence_drive.drive.api.share.get_shared_with_me",
  auto: true,
})

const items = computed(() => normalizeFromTypeField(resource.data))

function onOpen(item) {
  if (item.kind === "folder") {
    router.push(`/folder/${item.id}`)
  } else if (item.file_url) {
    window.open(item.file_url, "_blank", "noopener")
  }
}
</script>
