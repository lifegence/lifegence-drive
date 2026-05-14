<template>
  <div class="relative h-full">
    <ItemBrowser
      :title="title"
      :items="items"
      :loading="contents.loading"
      :error="contents.error"
      empty-text="このフォルダは空です。ファイルをドラッグ&ドロップしてください。"
      @open="onOpen"
      @context="onContext"
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50"
          @click="fileInput?.click()"
        >
          <Upload :size="14" />
          アップロード
        </button>
        <input
          ref="fileInput"
          type="file"
          multiple
          class="hidden"
          @change="onPick"
        >
      </template>
    </ItemBrowser>
    <DropZone
      :folder-id="folderId"
      @uploaded="contents.reload()"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { createResource } from "frappe-ui"
import { Upload } from "lucide-vue-next"
import ItemBrowser from "@/components/ItemBrowser.vue"
import DropZone from "@/components/DropZone.vue"
import { useBreadcrumbStore } from "@/store"
import { useItemActions } from "@/composables/useItemActions"
import { useFileUpload } from "@/composables/useFileUpload"

const props = defineProps({
  folderId: { type: String, default: null },
  title: { type: String, default: "マイファイル" },
})

const breadcrumbStore = useBreadcrumbStore()

const contents = createResource({
  url: "lifegence_drive.drive.api.folder.get_contents",
  makeParams: () => ({ folder: props.folderId || undefined }),
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

const actions = useItemActions({ onReload: () => contents.reload() })
const upload = useFileUpload()
const fileInput = ref(null)

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
    item_count: typeof f.item_count === "number" ? f.item_count : null,
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
  actions.open(item)
}

function onContext(event, item) {
  actions.showFor(event, item, "default")
}

async function onPick(event) {
  const files = event.target.files
  if (!files || files.length === 0) return
  await upload.addFiles(files, props.folderId, () => contents.reload())
  if (fileInput.value) fileInput.value.value = ""
}
</script>
