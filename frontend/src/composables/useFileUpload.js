import { reactive } from "vue"

const MAX_PARALLEL = 3
const UPLOAD_URL = "/api/method/lifegence_drive.drive.api.file.upload"

const state = reactive({
  queue: [], // { id, name, size, progress, status, error }
})

function getCsrfToken() {
  // frappe-ui's jinjaBootData injects window.csrf_token when available.
  return window.csrf_token || ""
}

function newId() {
  return (window.crypto?.randomUUID && window.crypto.randomUUID()) || `${Date.now()}-${Math.random()}`
}

function uploadOne(item, folderId) {
  return new Promise((resolve) => {
    item.status = "uploading"
    const xhr = new XMLHttpRequest()
    const fd = new FormData()
    fd.append("file", item.file)
    if (folderId) fd.append("folder", folderId)

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        item.progress = Math.round((e.loaded / e.total) * 100)
      }
    })
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        item.status = "done"
        item.progress = 100
      } else {
        item.status = "error"
        let msg = `HTTP ${xhr.status}`
        try {
          const body = JSON.parse(xhr.responseText)
          const exc = body._server_messages || body.exception || body.message
          if (exc) msg = typeof exc === "string" ? exc : JSON.stringify(exc)
        } catch {
          /* ignore parse errors, fall back to HTTP status */
        }
        item.error = msg
      }
      resolve()
    })
    xhr.addEventListener("error", () => {
      item.status = "error"
      item.error = "ネットワークエラー"
      resolve()
    })
    xhr.open("POST", UPLOAD_URL)
    const token = getCsrfToken()
    if (token) xhr.setRequestHeader("X-Frappe-CSRF-Token", token)
    xhr.withCredentials = true
    xhr.send(fd)
  })
}

export function useFileUpload() {
  async function addFiles(files, folderId, onAllDone) {
    const items = Array.from(files).map((f) => ({
      id: newId(),
      file: f,
      name: f.name,
      size: f.size,
      progress: 0,
      status: "pending",
      error: null,
    }))
    state.queue.push(...items)

    const queue = [...items]
    const inFlight = new Set()

    async function pump() {
      while (queue.length > 0 && inFlight.size < MAX_PARALLEL) {
        const item = queue.shift()
        const p = uploadOne(item, folderId).finally(() => inFlight.delete(p))
        inFlight.add(p)
      }
      if (inFlight.size > 0) {
        await Promise.race(inFlight)
        await pump()
      }
    }
    await pump()
    onAllDone?.()
  }

  function clearCompleted() {
    state.queue = state.queue.filter((i) => i.status !== "done")
  }

  function clearAll() {
    state.queue = state.queue.filter((i) => i.status === "uploading")
  }

  return { state, addFiles, clearCompleted, clearAll }
}
