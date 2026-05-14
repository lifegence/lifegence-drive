<template>
  <div
    class="absolute inset-0 z-20 pointer-events-none"
    :class="{ 'pointer-events-auto': dragging }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div
      v-if="dragging"
      class="absolute inset-4 border-2 border-dashed border-blue-400 bg-blue-50/70 rounded-md flex items-center justify-center"
    >
      <div class="text-blue-700 text-sm font-medium flex items-center gap-2">
        <UploadCloud :size="20" />
        ここにファイルをドロップしてアップロード
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"
import { UploadCloud } from "lucide-vue-next"
import { useFileUpload } from "@/composables/useFileUpload"

const props = defineProps({
  folderId: { type: String, default: null },
})

const emit = defineEmits(["uploaded"])

const dragging = ref(false)
let dragDepth = 0

const { addFiles } = useFileUpload()

function onWindowDragEnter() {
  dragDepth++
  dragging.value = true
}
function onWindowDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}
function onWindowDrop() {
  dragDepth = 0
  dragging.value = false
}

function onDragEnter() {
  dragging.value = true
}
function onDragLeave() {
  dragging.value = false
}
async function onDrop(event) {
  dragging.value = false
  dragDepth = 0
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  await addFiles(files, props.folderId, () => emit("uploaded"))
}

onMounted(() => {
  window.addEventListener("dragenter", onWindowDragEnter)
  window.addEventListener("dragleave", onWindowDragLeave)
  window.addEventListener("drop", onWindowDrop)
})
onBeforeUnmount(() => {
  window.removeEventListener("dragenter", onWindowDragEnter)
  window.removeEventListener("dragleave", onWindowDragLeave)
  window.removeEventListener("drop", onWindowDrop)
})
</script>
