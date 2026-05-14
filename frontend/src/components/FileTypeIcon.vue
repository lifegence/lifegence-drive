<template>
  <component
    :is="icon"
    :size="size"
    :class="colorClass"
  />
</template>

<script setup>
import { computed } from "vue"
import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  File as FileGeneric,
} from "lucide-vue-next"

const props = defineProps({
  extension: { type: String, default: "" },
  mimeType: { type: String, default: "" },
  isFolder: { type: Boolean, default: false },
  size: { type: Number, default: 20 },
})

const ext = computed(() => (props.extension || "").toLowerCase().replace(/^\./, ""))
const mime = computed(() => (props.mimeType || "").toLowerCase())

const icon = computed(() => {
  if (props.isFolder) return Folder
  if (mime.value.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "tiff", "heic"].includes(ext.value)) return FileImage
  if (mime.value.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext.value)) return FileVideo
  if (mime.value.startsWith("audio/") || ["mp3", "wav", "ogg", "flac"].includes(ext.value)) return FileAudio
  if (["xls", "xlsx", "csv", "ods"].includes(ext.value)) return FileSpreadsheet
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext.value)) return FileArchive
  if (["py", "js", "ts", "vue", "json", "html", "css", "java", "go", "rs", "c", "cpp", "rb", "php", "sh"].includes(ext.value)) return FileCode
  if (["pdf", "doc", "docx", "txt", "md", "rtf"].includes(ext.value) || mime.value.startsWith("text/")) return FileText
  return FileGeneric
})

const colorClass = computed(() => {
  if (props.isFolder) return "text-blue-500"
  if (mime.value.startsWith("image/")) return "text-pink-500"
  if (mime.value.startsWith("video/")) return "text-purple-500"
  if (mime.value.startsWith("audio/")) return "text-yellow-600"
  if (ext.value === "pdf") return "text-red-500"
  if (["xls", "xlsx", "csv"].includes(ext.value)) return "text-green-600"
  return "text-gray-500"
})
</script>
