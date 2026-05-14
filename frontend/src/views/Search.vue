<template>
  <div>
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h1 class="text-xl font-semibold">
        {{ title }}
      </h1>
      <ViewToggle v-if="!emptyAll" />
    </div>

    <div
      v-if="resource.loading && !resource.data"
      class="p-6 text-sm text-gray-500"
    >
      読み込み中…
    </div>
    <ErrorMessage
      v-else-if="resource.error"
      :message="resource.error.message"
      class="m-4"
    />
    <div
      v-else-if="!query"
      class="p-12 text-center text-sm text-gray-500"
    >
      上の検索バーに語句を入力してください。
    </div>
    <div
      v-else-if="emptyAll"
      class="p-12 text-center text-sm text-gray-500"
    >
      一致する項目はありません。
    </div>
    <template v-else>
      <!-- Folders -->
      <section
        v-if="folderItems.length > 0"
        class="border-b border-gray-100"
      >
        <div class="px-4 pt-3 pb-1 text-xs uppercase tracking-wider text-gray-500 font-medium">
          フォルダ ({{ folderItems.length }})
        </div>
        <FileGrid
          v-if="viewStore.mode === 'grid'"
          :items="folderItems"
          @open="actions.open"
          @context="(event, item) => actions.showFor(event, item, 'default')"
        />
        <FileList
          v-else
          :items="folderItems"
          @open="actions.open"
          @context="(event, item) => actions.showFor(event, item, 'default')"
        />
      </section>

      <!-- Files -->
      <section v-if="fileItems.length > 0">
        <div class="px-4 pt-3 pb-1 text-xs uppercase tracking-wider text-gray-500 font-medium">
          ファイル ({{ fileItems.length }})
        </div>
        <ul class="divide-y divide-gray-100">
          <li
            v-for="item in fileItems"
            :key="item.id"
            class="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
            @click="actions.open(item)"
            @contextmenu.prevent="actions.showFor($event, item, 'default')"
          >
            <FileTypeIcon
              :extension="item.extension"
              :mime-type="item.mime_type"
              :size="18"
            />
            <div class="flex-1 min-w-0">
              <div class="truncate text-sm">
                {{ item.label }}
              </div>
              <div class="text-[11px] text-gray-500 flex items-center gap-1">
                <FolderIcon
                  :size="11"
                  class="text-blue-400"
                />
                <button
                  type="button"
                  class="hover:text-blue-600 hover:underline"
                  @click.stop="openFolder(item.folder)"
                >
                  {{ item.folder_name || "ルート" }}
                </button>
                <span
                  v-if="item.folder"
                  class="font-mono text-gray-400"
                >
                  · {{ item.folder }}
                </span>
              </div>
            </div>
            <div
              v-if="item.size != null"
              class="text-xs text-gray-500 shrink-0"
            >
              {{ formatBytes(item.size) }}
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ErrorMessage, createResource } from "frappe-ui"
import { Folder as FolderIcon } from "lucide-vue-next"
import FileGrid from "@/components/FileGrid.vue"
import FileList from "@/components/FileList.vue"
import FileTypeIcon from "@/components/FileTypeIcon.vue"
import ViewToggle from "@/components/ViewToggle.vue"
import { useItemActions } from "@/composables/useItemActions"
import { useBreadcrumbStore, useViewStore } from "@/store"

const route = useRoute()
const router = useRouter()
const breadcrumbStore = useBreadcrumbStore()
const viewStore = useViewStore()
onMounted(() => breadcrumbStore.reset())

const query = computed(() => (typeof route.query.q === "string" ? route.query.q : ""))

const resource = createResource({
  url: "lifegence_drive.drive.api.search.search",
  makeParams: () => ({ query: query.value || "" }),
  auto: false,
})

onMounted(() => {
  if (query.value) resource.reload()
})

watch(query, (q) => {
  if (q) resource.reload()
})

const title = computed(() => (query.value ? `検索: "${query.value}"` : "検索"))

const folderItems = computed(() =>
  (resource.data?.folders || []).map((r) => ({
    kind: "folder",
    id: r.name,
    label: r.folder_name,
    size: null,
    modified: r.modified,
    extension: "",
    mime_type: "",
    parent_folder: r.parent_folder,
    parent_folder_name: r.parent_folder_name,
  })),
)

const fileItems = computed(() =>
  (resource.data?.files || []).map((r) => ({
    kind: "file",
    id: r.name,
    label: r.file_name,
    size: r.file_size,
    modified: r.modified,
    extension: r.extension || "",
    mime_type: r.mime_type || "",
    file_url: r.file_url,
    folder: r.folder,
    folder_name: r.folder_name,
  })),
)

const emptyAll = computed(
  () => folderItems.value.length === 0 && fileItems.value.length === 0,
)

const actions = useItemActions({ onReload: () => resource.reload() })

function openFolder(folderId) {
  if (folderId) router.push(`/folder/${folderId}`)
  else router.push("/")
}

function formatBytes(n) {
  if (n == null) return ""
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let v = Number(n)
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}
</script>
