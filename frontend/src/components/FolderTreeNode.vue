<template>
  <li>
    <div
      class="flex items-center gap-1 py-1 px-1 hover:bg-gray-100 rounded text-sm cursor-pointer"
      :class="{ 'bg-blue-50 text-blue-700': selected }"
      @click="onSelectClick"
    >
      <button
        type="button"
        class="w-4 h-4 flex items-center justify-center text-gray-500"
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
        class="text-blue-500"
      />
      <span class="truncate">{{ folder.folder_name }}</span>
      <span
        v-if="folder.name === disabledId"
        class="ml-auto text-[10px] text-gray-400"
      >自身</span>
    </div>
    <ul
      v-if="expanded"
      class="pl-4"
    >
      <li
        v-if="loading"
        class="text-xs text-gray-500 py-1 px-1"
      >
        読み込み中…
      </li>
      <li
        v-else-if="children.length === 0"
        class="text-xs text-gray-400 py-1 px-1"
      >
        サブフォルダなし
      </li>
      <FolderTreeNode
        v-for="child in children"
        :key="child.name"
        :folder="child"
        :selected-id="selectedId"
        :disabled-id="disabledId"
        @select="(id) => $emit('select', id)"
      />
    </ul>
  </li>
</template>

<script setup>
import { ref } from "vue"
import { ChevronRight, ChevronDown, Folder } from "lucide-vue-next"
import { call } from "frappe-ui"

const props = defineProps({
  folder: { type: Object, required: true },
  selectedId: { type: String, default: null },
  disabledId: { type: String, default: null },
})

const emit = defineEmits(["select"])

const expanded = ref(false)
const children = ref([])
const loading = ref(false)

import { computed } from "vue"
const selected = computed(() => props.selectedId === props.folder.name)

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

function onSelectClick() {
  if (props.folder.name === props.disabledId) return
  emit("select", props.folder.name)
}
</script>
