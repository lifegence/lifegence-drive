<template>
  <li>
    <div
      class="flex items-center gap-1 py-1 pr-2 text-sm cursor-pointer rounded hover:bg-gray-100"
      :class="{ 'bg-blue-50 text-blue-700': isActive }"
      :style="{ paddingLeft: `${depth * 12 + 4}px` }"
      @click="navigate"
    >
      <button
        type="button"
        class="w-4 h-4 flex items-center justify-center text-gray-500 shrink-0"
        @click.stop="toggle"
      >
        <ChevronRight
          v-if="!expanded"
          :size="12"
        />
        <ChevronDown
          v-else
          :size="12"
        />
      </button>
      <Folder
        :size="14"
        class="text-blue-500 shrink-0"
      />
      <span class="truncate">{{ folder.folder_name }}</span>
    </div>
    <ul
      v-if="expanded"
      class="mt-0.5"
    >
      <li
        v-if="loading"
        class="text-[11px] text-gray-400 py-0.5"
        :style="{ paddingLeft: `${(depth + 1) * 12 + 20}px` }"
      >
        読み込み中…
      </li>
      <li
        v-else-if="children.length === 0"
        class="text-[11px] text-gray-400 py-0.5"
        :style="{ paddingLeft: `${(depth + 1) * 12 + 20}px` }"
      >
        サブフォルダなし
      </li>
      <SidebarFolderNode
        v-for="child in children"
        :key="child.name"
        :folder="child"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>

<script setup>
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ChevronRight, ChevronDown, Folder } from "lucide-vue-next"
import { call } from "frappe-ui"

const props = defineProps({
  folder: { type: Object, required: true },
  depth: { type: Number, default: 0 },
})

const route = useRoute()
const router = useRouter()

const expanded = ref(false)
const loading = ref(false)
const children = ref([])

const isActive = computed(() => route.params.id === props.folder.name)

async function toggle() {
  if (!expanded.value && children.value.length === 0) {
    await loadChildren()
  }
  expanded.value = !expanded.value
}

async function loadChildren() {
  loading.value = true
  try {
    children.value = await call("lifegence_drive.drive.api.folder.get_folders", {
      parent_folder: props.folder.name,
    })
  } catch {
    children.value = []
  } finally {
    loading.value = false
  }
}

function navigate() {
  router.push(`/folder/${props.folder.name}`)
}
</script>
