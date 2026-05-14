/**
 * MIME / extension → preview kind ("image" | "pdf" | "video" | "audio" | "text" | null)
 */

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"]
const VIDEO_EXT = ["mp4", "webm", "mov", "ogv"]
const AUDIO_EXT = ["mp3", "wav", "ogg", "flac", "m4a"]
const TEXT_EXT = [
  "txt",
  "csv",
  "json",
  "xml",
  "md",
  "log",
  "py",
  "js",
  "ts",
  "vue",
  "html",
  "css",
  "yaml",
  "yml",
  "ini",
  "conf",
  "sh",
]

export function previewKind(item) {
  if (!item || item.kind === "folder") return null
  const ext = (item.extension || "").toLowerCase().replace(/^\./, "")
  const mime = (item.mime_type || "").toLowerCase()

  if (mime.startsWith("image/") || IMAGE_EXT.includes(ext)) return "image"
  if (mime === "application/pdf" || ext === "pdf") return "pdf"
  if (mime.startsWith("video/") || VIDEO_EXT.includes(ext)) return "video"
  if (mime.startsWith("audio/") || AUDIO_EXT.includes(ext)) return "audio"
  if (mime.startsWith("text/") || TEXT_EXT.includes(ext)) return "text"
  return null
}

export function isPreviewable(item) {
  return previewKind(item) !== null
}
