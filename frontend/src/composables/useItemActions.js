import {
  Eye,
  Star,
  Pencil,
  Trash2,
  Download,
  RotateCcw,
  Share2,
  FolderInput,
  X,
} from "lucide-vue-next"
import { call } from "frappe-ui"
import { useRouter } from "vue-router"
import { useContextMenu } from "@/composables/useContextMenu"
import { useDialogs } from "@/composables/useDialogs"

export function useItemActions({ onReload }) {
  const router = useRouter()
  const ctx = useContextMenu()
  const dialogs = useDialogs()

  function open(item) {
    if (item.kind === "folder") {
      router.push(`/folder/${item.id}`)
    } else if (item.file_url) {
      window.open(item.file_url, "_blank", "noopener")
    }
  }

  function download(item) {
    if (item.file_url) {
      window.open(item.file_url, "_blank", "noopener")
    }
  }

  async function rename(item) {
    const current = item.label
    const next = window.prompt("新しい名前を入力", current)
    if (!next || next === current) return
    const doctype = item.kind === "folder" ? "folder" : "file"
    try {
      await call(`lifegence_drive.drive.api.${doctype}.rename`, {
        name: item.id,
        new_name: next,
      })
      onReload?.()
    } catch (e) {
      window.alert(`名前変更に失敗しました: ${e.message || e}`)
    }
  }

  async function toggleFavorite(item) {
    try {
      await call("lifegence_drive.drive.api.favorite.toggle", {
        doctype: item.kind === "folder" ? "Drive Folder" : "Drive File",
        name: item.id,
      })
      onReload?.()
    } catch (e) {
      window.alert(`お気に入り更新に失敗しました: ${e.message || e}`)
    }
  }

  async function moveToTrash(item) {
    if (!window.confirm(`「${item.label}」をゴミ箱へ移動しますか?`)) return
    try {
      await call("lifegence_drive.drive.api.trash.move_to_trash", {
        doctype: item.kind === "folder" ? "Drive Folder" : "Drive File",
        name: item.id,
      })
      onReload?.()
    } catch (e) {
      window.alert(`削除に失敗しました: ${e.message || e}`)
    }
  }

  async function restore(item) {
    try {
      await call("lifegence_drive.drive.api.trash.restore", {
        trash_name: item.trashId,
      })
      onReload?.()
    } catch (e) {
      window.alert(`復元に失敗しました: ${e.message || e}`)
    }
  }

  async function deletePermanently(item) {
    if (!window.confirm(`「${item.label}」を完全に削除します。この操作は取り消せません。`)) return
    try {
      await call("lifegence_drive.drive.api.trash.delete_permanently", {
        trash_name: item.trashId,
      })
      onReload?.()
    } catch (e) {
      window.alert(`完全削除に失敗しました: ${e.message || e}`)
    }
  }

  function showFor(event, item, mode = "default") {
    const items = []
    if (mode === "trash") {
      items.push({ label: "復元", icon: RotateCcw, onClick: () => restore(item) })
      items.push({ label: "完全削除", icon: X, danger: true, onClick: () => deletePermanently(item) })
    } else {
      items.push({ label: "開く", icon: Eye, onClick: () => open(item) })
      if (item.kind === "file" && item.file_url) {
        items.push({ label: "ダウンロード", icon: Download, onClick: () => download(item) })
      }
      items.push({ label: "お気に入り", icon: Star, onClick: () => toggleFavorite(item) })
      items.push({ label: "名前を変更", icon: Pencil, onClick: () => rename(item) })
      items.push({ label: "移動", icon: FolderInput, onClick: () => dialogs.openMove(item, onReload) })
      items.push({ label: "共有", icon: Share2, onClick: () => dialogs.openShare(item, onReload) })
      items.push({ separator: true })
      items.push({ label: "ゴミ箱へ移動", icon: Trash2, danger: true, onClick: () => moveToTrash(item) })
    }
    ctx.show(event, items)
  }

  return { showFor, open, download }
}
