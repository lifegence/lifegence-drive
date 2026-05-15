# Lifegence Drive

> File sharing app for [Frappe Framework](https://frappeframework.com/) v16+

**Lifegence Drive** is a lightweight file-sharing application with folder
management, share links, version history, search, and a modern Vue 3
SPA UI. It runs on stock Frappe Framework and does not depend on
ERPNext.

---

## Features

### Modern Vue 3 SPA — `/drive_app`

The user-facing UI. Built independently with Vue 3 + Vite +
[frappe-ui](https://github.com/frappe/frappe-ui) (MIT) + Tailwind, and
served as a Frappe website route. Fully responsive — drawer sidebar
on phones, persistent sidebar on tablet / desktop.

- **5 main views**: My Files, Shared, Favorites, Recents, Trash
- **Folder navigation** with breadcrumbs; folder ID is shown beside
  the name so same-name folders are distinguishable. Includes an explicit **New Folder** action.
- **Grid / List view toggle** (persisted in `localStorage`)
- **Right-click context menu**: Open, Download, Favorite, Rename, Move,
  Share, **Copy Path**, Move-to-trash (Restore + Delete-permanently in the Trash view).
  Breadcrumb items also feature a **Copy Path** context action.
- **Drag-and-drop upload** with parallel limit 3, progress toast,
  and per-file error surfacing
- **Share dialog**: per-user shares (View / Edit / Manage) and
  shareable links with optional password and expiration date
- **Move dialog**: lazy-expanding folder tree, plus a "move to root"
  shortcut
- **File preview** in a modal: images, PDF, video, audio, plain text
  (UTF-8, first 256 KB)
- **Live search** from the top bar — hits cover both folders *and*
  files; each file result links back to its parent folder
- **Thumbnails** for images and PDFs (first page rendered via
  pypdfium2) shown inline in Grid / List
- **i18n** (Japanese / English) toggled at runtime; choice is
  persisted in `localStorage`
- **Auth guard** — unauthenticated visits redirect to
  `/login?redirect-to=...`

### File Management
- Multipart upload via API
- Folder hierarchy (unlimited nesting via Nested Set)
- File rename and move
- Soft-delete trash with configurable auto-purge (default: 30 days)

### Sharing
- User shares with three permission levels (View / Edit / Manage)
- Shareable links with optional password and expiration
- Email + in-app notification on new shares

### Version History
- Automatic versioning on file re-upload
- Version history viewer with per-version download
- Restore to any previous version

### Search & Organization
- **SPA search** (top bar) covers files + folders by name, with each
  file result linking back to its parent folder.
- **API-level filters** — file_type, date range, owner, tags — are
  accepted by `search.search` but the SPA only exposes the name-based
  fast path; richer filter UI is on the roadmap.
- Favorites (SPA + API)
- Color-coded tags — DocType + API exist; the SPA does not yet expose
  tag chips or a tag filter (roadmap).

### Storage Management
- Per-app storage quota (configurable GB limit), independent of the
  tenant-wide budget owned by `lifegence_core.SaaS Tenant`
- Per-file size limit
- Allowed file extension whitelist

### Activity Log
- Full audit trail: Upload, Download, Rename, Move, Share, Unshare,
  Delete, Restore

### Maintenance utilities

Bench-CLI entry points for housekeeping. Both are dry-run by default;
pass `--kwargs "{'commit': True}"` to actually delete.

```bash
bench --site <site> execute lifegence_drive.drive.services.integrity_check.find_ghosts
bench --site <site> execute lifegence_drive.drive.services.integrity_check.delete_ghosts \
    --kwargs "{'commit': True}"
bench --site <site> execute lifegence_drive.drive.services.integrity_check.find_empty_folders
bench --site <site> execute lifegence_drive.drive.services.integrity_check.delete_empty_folders \
    --kwargs "{'commit': True}"
```

- `find_ghosts` flags Drive File rows whose `file_url` has no
  corresponding Frappe File row *and* no file on disk.
- `find_empty_folders` is trash-aware and runs bottom-up so that
  nested empty folders also collapse once their children disappear.

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

### File operations (`api/file`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `file.upload` | Upload a file (multipart, optional `folder`, `is_private`) |
| GET | `file.download` | Download by `name` or `share_link` (guest-accessible for shared links) |
| GET | `file.preview_share` | Resolve a share link to its metadata (guest-accessible) |
| POST | `file.rename` | Rename a file |
| POST | `file.move` | Move file to another folder |
| GET | `file.get_files` | List files in a folder (sortable, paginated) |

### Folder operations (`api/folder`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `folder.create` | Create a folder (optional `parent_folder`) |
| POST | `folder.rename` | Rename a folder |
| POST | `folder.move` | Move a folder to another parent |
| GET | `folder.get_folders` | List subfolders (`with_counts=1` adds `item_count`) |
| GET | `folder.get_breadcrumb` | Path from root to the given folder |
| GET | `folder.get_contents` | Combined view: folders + files + breadcrumb |

### Share operations (`api/share`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `share.create_share` | Share with a user |
| POST | `share.remove_share` | Remove a share |
| POST | `share.generate_link` | Generate a shareable link (password / expiration optional) |
| GET | `share.get_shares` | List shares for an item |
| GET | `share.get_shared_with_me` | Items shared with the current user |

### Version operations (`api/version`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `version.upload_new_version` | Upload a new version of a file |
| GET | `version.get_versions` | List all versions of a file |
| POST | `version.restore_version` | Restore a file to a previous version |
| GET | `version.download_version` | Download a specific version |

### Other APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `storage.get_info` | Storage usage, limit, remaining |
| GET | `search.search` | Search files + folders (filters: type, date, owner, tags) |
| POST | `favorite.toggle` | Toggle favorite on/off |
| GET | `favorite.get_favorites` | List the user's favorites |
| GET | `trash.get_trash` | List trashed items |
| POST | `trash.move_to_trash` | Soft-delete an item |
| POST | `trash.restore` | Restore from trash |
| POST | `trash.delete_permanently` | Permanently delete |
| GET | `recent.get_recent_files` | Recently modified accessible files (SPA Recents view) |
| POST | `services.thumbnail_service.get_thumbnail` | Single-item thumbnail URL |
| POST | `services.thumbnail_service.get_thumbnails` | Batch thumbnail lookup (`{name: url}`) |
| POST | `api.maintenance.list_ghosts` | (System Manager) ghost Drive File rows |
| POST | `api.maintenance.cleanup_ghosts` | (System Manager) delete ghost rows |

---

## Installation

### Prerequisites

- Python 3.10+
- Frappe Framework v16+
- Node 20+ and pnpm (only required to build the Vue SPA)
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
| Max Storage (GB) | 10 | Per-app storage budget (independent of the tenant-wide budget) |
| Allowed Extensions | (empty = allow all) | Comma-separated whitelist |
| Enable Versioning | Yes | Track file version history |
| Trash Retention Days | 30 | Days before auto-delete from trash |

---

## Roles

| Role | Capabilities |
|------|-------------|
| Drive User | Upload, download, create folders, share, manage own files |
| Drive Manager | Full access including deletion and settings |

Fine-grained access is enforced at the API layer
(`permission_service.can_view_file`, `can_manage_file`, etc.) — see
`drive/services/permission_service.py`. DocType-level role permissions
only gate the Frappe Desk forms used by admins for raw-data inspection.

---

## Frontend (Vue 3 SPA)

Source lives in `frontend/`. The Vite build emits assets into
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
→ `pnpm build` on every push that touches `frontend/`.

Source organisation:

```
frontend/src/
├── App.vue / main.js / router.js / store.js / style.css
├── i18n/ja.json + en.json
├── components/   # AppLayout, Sidebar, Topbar, Breadcrumb, FileGrid,
│                  FileList, FileBrowser, ItemBrowser, FolderTreeNode,
│                  FileTypeIcon, FilePreview, ShareDialog, MoveDialog,
│                  ContextMenu, UploadQueue, DropZone, StorageBar,
│                  ViewToggle, LocaleToggle, Modal
├── composables/  # useContextMenu, useDialogs, useFileUpload, useI18n,
│                  useItemActions, useThumbnails, previewKind,
│                  normalizeItem
└── views/        # MyFiles, Folder, Shared, Favorites, Recents,
                   Trash, Search, NotFound
```

License posture: the SPA is built **independently** of
[`frappe/drive`](https://github.com/frappe/drive) (AGPL-3.0).
`frappe/drive` is used only as a reference for design patterns — no
source code, JSON, or Vue components are copied. `frappe-ui` (MIT) is
used freely as a UI library.

---

## Backend project layout

```
lifegence_drive/
├── drive/
│   ├── api/                       # Whitelisted API endpoints
│   │   ├── file.py                # File upload / download / move / rename
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
