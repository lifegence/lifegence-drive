import { reactive } from "vue"
import { call } from "frappe-ui"

// Per-session cache of {drive_file_name: thumbnail_url_or_null}.
// Survives view re-mounts so navigating into a folder we just saw
// avoids the round-trip.
const cache = reactive({})

const THUMBABLE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "pdf",
])

function isThumbable(item) {
  if (item.kind !== "file") return false
  const ext = (item.extension || "").toLowerCase().replace(/^\./, "")
  const mime = (item.mime_type || "").toLowerCase()
  return THUMBABLE_EXT.has(ext) || mime.startsWith("image/") || mime === "application/pdf"
}

export function useThumbnails() {
  /**
   * Ask the backend to populate thumbnail URLs for every item that needs
   * one and is not already cached. Mutates `cache` so consumers reading
   * `getUrl(name)` see the answer reactively once it arrives.
   */
  async function load(items) {
    const wanted = []
    for (const item of items || []) {
      if (!isThumbable(item)) continue
      if (item.id in cache) continue
      wanted.push(item.id)
    }
    if (wanted.length === 0) return

    // Mark as "in flight" so concurrent callers don't refetch.
    for (const id of wanted) cache[id] = null

    try {
      const result = await call(
        "lifegence_drive.drive.services.thumbnail_service.get_thumbnails",
        { names: wanted },
      )
      if (result && typeof result === "object") {
        for (const id of wanted) {
          cache[id] = result[id] || null
        }
      }
    } catch (e) {
      // Leave cache entries as null — UI just falls back to the icon.
      console.warn("[useThumbnails] batch fetch failed:", e)
    }
  }

  function getUrl(name) {
    return cache[name] || null
  }

  return { load, getUrl }
}
