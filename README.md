# Lifegence Drive

> File sharing app for [Frappe Framework](https://frappeframework.com/) v16+

**Lifegence Drive** はフォルダ管理、共有リンク、バージョン管理、検索、AI スキャナーとの連携を備えた軽量ファイル共有アプリです。Frappe の標準機能のみで動作し、ERPNext は不要です。ユーザー向け UI は Vue 3 + frappe-ui で構築されたモダンな SPA(`/drive_app`)を提供します。

---

## Features

### Modern Vue 3 SPA — `/drive_app`

Single entry point for end users. Mounted by `bench build`, served as a
Frappe website route, fully responsive (drawer sidebar on phones,
permanent sidebar on tablet / desktop).

- マイファイル / 共有 / お気に入り / 最近 / ゴミ箱 の 5 ビュー
- フォルダ navigation + breadcrumb + 同名フォルダ判別用の ID 併記
- Grid / List の切替(`localStorage` で永続化)
- 右クリック ContextMenu(開く / ダウンロード / お気に入り / 名前変更 / 移動 / 共有 / ゴミ箱)
- ドラッグ & ドロップアップロード(parallel 3、進捗 toast、エラー surfacing)
- ShareDialog:ユーザ共有(View / Edit / Manage)+ パスワード付き共有リンク + 期限
- MoveDialog:フォルダツリー(lazy expand)+ ルートへの移動
- FilePreview:画像 / PDF / 動画 / 音声 / テキスト(UTF-8 256KB cap)を Modal で
- 検索:Topbar から live、フォルダ + ファイル両方ヒット、各ヒットに親フォルダ表示
- サムネイル:画像 + PDF(pypdfium2 で 1 ページ目)を Grid / List に表示
- 日本語 / 英語の i18n(`localStorage` で永続化)
- 認証ガード:未認証は `/login?redirect-to=...` に自動リダイレクト

### File Management
- Multipart upload via API
- Folder hierarchy (unlimited nesting via Nested Set)
- File rename, move, copy
- Soft-delete trash with configurable auto-purge (default: 30 days)

### Sharing
- Share with users — View / Edit / Manage permissions
- Shareable link with optional password and expiration
- Email + in-app notification on share

### Version History
- Automatic versioning on file re-upload
- Version history viewer with download
- Restore to any previous version

### Search & Organization
- Combined file + folder search via Topbar
- Each file result links back to its parent folder
- Filter by file type, date range, owner, tags (via search API params)
- Favorites
- Color-coded tags

### Storage Management
- Per-tenant storage quota (configurable GB limit, independent of the
  tenant-wide budget owned by `lifegence_core.SaaS Tenant`)
- Per-file size limit
- Allowed file extension whitelist

### Activity Log
- Full audit trail: Upload, Download, Rename, Move, Share, Unshare, Delete, Restore

### Maintenance utilities

Bench-CLI entry points for housekeeping (idempotent, dry-run by default):

```bash
bench --site <site> execute lifegence_drive.drive.services.integrity_check.find_ghosts
bench --site <site> execute lifegence_drive.drive.services.integrity_check.delete_ghosts --kwargs "{'commit': True}"
bench --site <site> execute lifegence_drive.drive.services.integrity_check.find_empty_folders
bench --site <site> execute lifegence_drive.drive.services.integrity_check.delete_empty_folders --kwargs "{'commit': True}"
```

`find_ghosts` flags Drive File rows whose `file_url` is missing its
Frappe File row or its on-disk file. `find_empty_folders` is trash-aware
and runs bottom-up so nested empties also collapse.

---

## DocTypes (9)

| DocType | Type | Description |
|---------|------|-------------|
| Drive Settings | Settings | Storage limits, allowed extensions, versioning toggle, trash retention |
| Drive File | Document | File records with metadata, versioning, and folder links |
| Drive Folder | Tree | Hierarchical folder structure (Nested Set) |
| Drive File Version | Document | Version history records for files |
| Drive Share | Document | User shares and shareable links |
| Drive Favorite | Document | Per-user favorites |
| Drive Tag | Master | Color-coded tags |
| Drive Activity | Log | Audit trail for all operations |
| Drive Trash | Document | Soft-delete records with expiration |

*Drive File Tag* is a child table used by Drive File for Table MultiSelect.

---

## API Reference

All endpoints are available at `/api/method/lifegence_drive.drive.api.*`.

### File Operations (`api/file`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `file.upload` | Upload file (multipart form, optional `folder`, `is_private`) |
| GET | `file.download` | Download by `name` or `share_link` (guest-accessible for shared links) |
| GET | `file.preview_share` | Resolve a share link to its metadata (guest-accessible) |
| POST | `file.rename` | Rename a file |
| POST | `file.move` | Move file to another folder |
| GET | `file.get_files` | List files in folder (sortable, paginated) |

### Folder Operations (`api/folder`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `folder.create` | Create folder (optional `parent_folder`) |
| POST | `folder.rename` | Rename a folder |
| POST | `folder.move` | Move folder to another parent |
| GET | `folder.get_folders` | List subfolders (`with_counts=1` adds `item_count`) |
| GET | `folder.get_breadcrumb` | Get path from root to folder |
| GET | `folder.get_contents` | Combined view: folders + files + breadcrumb |

### Share Operations (`api/share`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `share.create_share` | Share with a user |
| POST | `share.remove_share` | Remove a share |
| POST | `share.generate_link` | Generate shareable link (password / expiration optional) |
| GET | `share.get_shares` | List shares for an item |
| GET | `share.get_shared_with_me` | Items shared with current user |

### Version Operations (`api/version`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `version.upload_new_version` | Upload new version of a file |
| GET | `version.get_versions` | List all versions of a file |
| POST | `version.restore_version` | Restore file to a previous version |
| GET | `version.download_version` | Download a specific version |

### Other APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `storage.get_info` | Storage usage, limit, remaining |
| GET | `search.search` | Search files + folders (filters: type, date, owner, tags) |
| POST | `favorite.toggle` | Toggle favorite on/off |
| GET | `favorite.get_favorites` | List user's favorites |
| GET | `trash.get_trash` | List trashed items |
| POST | `trash.move_to_trash` | Soft-delete an item |
| POST | `trash.restore` | Restore from trash |
| POST | `trash.delete_permanently` | Permanently delete |
| GET | `recent.get_recent_files` | Recently modified accessible files (Vue SPA Recents view) |
| POST | `services.thumbnail_service.get_thumbnail` | Single-item thumbnail URL |
| POST | `services.thumbnail_service.get_thumbnails` | Batch thumbnail lookup (`{name: url}`) |
| POST | `api.maintenance.list_ghosts` | (System Manager) ghost Drive File rows |
| POST | `api.maintenance.cleanup_ghosts` | (System Manager) delete ghost rows |

---

## Installation

### Prerequisites

- Python 3.10+
- Frappe Framework v16+
- Node 20+ and pnpm (only for building the Vue SPA)
- (Optional) Pillow — image thumbnails
- (Optional) pypdfium2 — PDF first-page thumbnails

### Install

```bash
bench get-app https://github.com/lifegence/lifegence-drive.git
bench --site your-site install-app lifegence_drive
bench --site your-site migrate

# Build the Vue SPA assets
cd apps/lifegence_drive/frontend
pnpm install
pnpm build
```

### Optional dependencies

```bash
# Image thumbnails
pip install Pillow
# PDF thumbnails (first page rendered to JPEG)
pip install pypdfium2
```

---

## Configuration

After installation, configure via **Drive Settings** (`/app/drive-settings`):

| Setting | Default | Description |
|---------|---------|-------------|
| Max File Size (MB) | 100 | Maximum size per file upload |
| Max Storage (GB) | 10 | Total drive storage (independent of tenant-wide budget) |
| Allowed Extensions | (empty = allow all) | Comma-separated whitelist |
| Enable Versioning | Yes | Track file version history |
| Trash Retention Days | 30 | Days before auto-delete from trash |

---

## Roles

| Role | Capabilities |
|------|-------------|
| Drive User | Upload, download, create folders, share, manage own files |
| Drive Manager | Full access including deletion and settings |

The Vue SPA enforces fine-grained access at the API layer
(`permission_service.can_view_file`, `can_manage_file`, etc.) — see
`drive/services/permission_service.py`. DocType-level role permissions
gate the Frappe Desk forms used by admins for raw-data inspection.

---

## Frontend (Vue 3 SPA)

Source lives in `frontend/`. The vite build emits assets into
`lifegence_drive/public/frontend/` and the entry template into
`lifegence_drive/www/drive_app.html`.

```bash
cd frontend
pnpm install
pnpm dev      # vite dev server on :8080, proxies /api to dev.localhost:8000
pnpm build    # production bundle
pnpm lint     # eslint
```

CI: `.github/workflows/frontend.yml` runs `pnpm install` → `pnpm lint`
→ `pnpm build` on every push touching `frontend/`.

Source organisation:

```
frontend/src/
├── App.vue / main.js / router.js / store.js / style.css
├── i18n/ja.json + en.json
├── components/        # AppLayout, Sidebar, Topbar, Breadcrumb, FileGrid,
│                       FileList, FileBrowser, ItemBrowser, FolderTreeNode,
│                       FileTypeIcon, FilePreview, ShareDialog, MoveDialog,
│                       ContextMenu, UploadQueue, DropZone, StorageBar,
│                       ViewToggle, LocaleToggle, Modal
├── composables/       # useContextMenu, useDialogs, useFileUpload,
│                       useI18n, useItemActions, useThumbnails,
│                       previewKind, normalizeItem
└── views/             # MyFiles, Folder, Shared, Favorites, Recents,
                        Trash, Search, NotFound
```

License posture: the SPA is built independently of [`frappe/drive`](https://github.com/frappe/drive)
(AGPL-3.0). `frappe/drive` is used **only as a reference for design
patterns** — no source code, JSON, or Vue components are copied.
`frappe-ui` (MIT) is used freely as a UI library.

---

## Backend project layout

```
lifegence_drive/
├── drive/
│   ├── api/                       # Whitelisted API endpoints
│   │   ├── file.py                # File upload/download/move/rename
│   │   ├── folder.py              # Folder CRUD + navigation + with_counts
│   │   ├── trash.py               # Trash operations
│   │   ├── share.py               # Sharing + link generation
│   │   ├── search.py              # Search (files + folders)
│   │   ├── favorite.py            # Favorites toggle
│   │   ├── version.py             # Version management
│   │   ├── storage.py             # Storage usage info
│   │   ├── recent.py              # Recently modified files
│   │   └── maintenance.py         # Ghost cleanup (System Manager)
│   ├── services/                  # Business logic
│   │   ├── activity_service.py    # Audit logging
│   │   ├── storage_service.py     # Quota validation
│   │   ├── thumbnail_service.py   # Image + PDF thumbnails (batch endpoint)
│   │   ├── notification_service.py# Share notifications
│   │   ├── trash_service.py       # Scheduled trash cleanup
│   │   └── integrity_check.py     # Ghost + empty-folder sweep (CLI)
│   ├── doctype/                   # 9 DocTypes + 1 child table
│   └── tests/                     # 42 tests
├── boot.py                        # Boot session + website context helpers
│                                   (csrf_token / user info for the SPA)
├── public/
│   ├── images/drive-logo.svg
│   └── frontend/                  # Vue SPA build output (gitignored)
├── www/
│   └── drive_app.html             # SPA entry template (gitignored, jinja-rendered)
├── desktop_icon/                  # Desktop tile → /drive_app
├── hooks.py
└── install.py
```

---

## Development

```bash
# Run Python tests
bench --site your-site run-tests --app lifegence_drive

# Build all assets (Python + Vue)
bench build --app lifegence_drive
```

---

## License

[MIT](license.txt) — Copyright (c) 2026 Lifegence Inc.

## Contributing

Contributions are welcome. Please open an issue or pull request on
[GitHub](https://github.com/lifegence/lifegence-drive).
