/**
 * 共通アイテム正規化ユーティリティ。
 * Shared / Favorites / Trash の各 API レスポンスを ItemBrowser が扱う統一形式に変換。
 */

export function normalizeFromTypeField(raw) {
  // Used by share.get_shared_with_me and favorite.get_favorites:
  // each item has `_type: "file" | "folder"` plus type-specific fields.
  return (raw || []).map((r) => {
    if (r._type === "folder") {
      return {
        kind: "folder",
        id: r.name,
        label: r.folder_name,
        size: null,
        modified: r.modified,
        extension: "",
        mime_type: "",
      }
    }
    return {
      kind: "file",
      id: r.name,
      label: r.file_name,
      size: r.file_size,
      modified: r.modified,
      extension: r.extension || "",
      mime_type: r.mime_type || "",
      file_url: r.file_url,
    }
  })
}

export function normalizeFromTrash(raw) {
  // Used by trash.get_trash:
  // each item has original_doctype + original_name plus enriched fields.
  return (raw || []).map((r) => {
    const isFolder = r.original_doctype === "Drive Folder"
    return {
      kind: isFolder ? "folder" : "file",
      id: r.original_name,
      trashId: r.name,
      label: isFolder ? r.folder_name : r.file_name,
      size: isFolder ? null : r.file_size,
      modified: r.deleted_on,
      extension: r.extension || "",
      mime_type: r.mime_type || "",
      expires_on: r.expires_on,
    }
  })
}
