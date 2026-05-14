<template>
  <ItemBrowser
    :title="title"
    :items="items"
    :loading="contents.loading"
    :error="contents.error"
    empty-text="このフォルダは空です。"
    @open="onOpen"
  />
</template>

<script setup>
import { computed, watch } from "vue"
import { useRouter } from "vue-router"
import { createResource } from "frappe-ui"
import ItemBrowser from "@/components/ItemBrowser.vue"
import { useBreadcrumbStore } from "@/store"

const props = defineProps({
  folderId: { type: String, default: null },
  title: { type: String, default: "マイファイル" },
})

const router = useRouter()
const breadcrumbStore = useBreadcrumbStore()

const contents = createResource({
  url: "lifegence_drive.drive.api.folder.get_contents",
  params: () => ({ folder: props.folderId || undefined }),
  auto: true,
  onSuccess(data) {
    const bc = (data?.breadcrumb || []).map((b) => ({ id: b.name, name: b.folder_name }))
    breadcrumbStore.set(bc)
  },
})

watch(
  () => props.folderId,
  () => contents.reload(),
)

const items = computed(() => {
  const data = contents.data
  if (!data) return []
  const folders = (data.folders || []).map((f) => ({
    kind: "folder",
    id: f.name,
    label: f.folder_name,
    size: null,
    modified: f.modified,
    extension: "",
    mime_type: "",
  }))
  const files = (data.files || []).map((f) => ({
    kind: "file",
    id: f.name,
    label: f.file_name,
    size: f.file_size,
    modified: f.modified,
    extension: f.extension || "",
    mime_type: f.mime_type || "",
    file_url: f.file_url,
  }))
  return [...folders, ...files]
})

function onOpen(item) {
  if (item.kind === "folder") {
    router.push(`/folder/${item.id}`)
  } else if (item.file_url) {
    window.open(item.file_url, "_blank", "noopener")
  }
}
</script>
