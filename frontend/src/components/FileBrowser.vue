<template>
  <div>
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h1 class="text-xl font-semibold">
        {{ title }}
      </h1>
      <ViewToggle />
    </div>

    <div
      v-if="contents.loading && !contents.data"
      class="p-6 text-sm text-gray-500"
    >
      読み込み中…
    </div>
    <ErrorMessage
      v-else-if="contents.error"
      :message="contents.error.message"
      class="m-4"
    />
    <div
      v-else-if="items.length === 0"
      class="p-12 text-center text-sm text-gray-500"
    >
      このフォルダは空です。
    </div>
    <FileGrid
      v-else-if="viewStore.mode === 'grid'"
      :items="items"
      @open="onOpen"
    />
    <FileList
      v-else
      :items="items"
      @open="onOpen"
    />
  </div>
</template>

<script setup>
import { computed, watch } from "vue"
import { useRouter } from "vue-router"
import { ErrorMessage, createResource } from "frappe-ui"
import FileGrid from "@/components/FileGrid.vue"
import FileList from "@/components/FileList.vue"
import ViewToggle from "@/components/ViewToggle.vue"
import { useBreadcrumbStore, useViewStore } from "@/store"

const props = defineProps({
  folderId: { type: String, default: null },
  title: { type: String, default: "マイファイル" },
})

const router = useRouter()
const breadcrumbStore = useBreadcrumbStore()
const viewStore = useViewStore()

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
  () => {
    contents.reload()
  },
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
