# Lifegence Drive

> Google Drive-like file sharing app for [Frappe Framework](https://frappeframework.com/) v16+

**Lifegence Drive** はドラッグ&ドロップでのファイルアップロード、フォルダ管理、共有リンク、バージョン管理、全文検索を備えた軽量ファイル共有アプリです。Frappe の標準機能のみで動作し、ERPNext は不要です。

---

## Features

### File Management
- Drag & drop upload with progress indicator
- Multiple file upload
- Folder hierarchy (unlimited nesting via Nested Set)
- File rename, move, and copy
- Soft-delete trash with configurable auto-purge (default: 30 days)

### File Browser UI
- Google Drive-style file browser (`/app/drive-browser`)
- Grid / List view toggle
- Breadcrumb navigation
- Right-click context menu
- Keyboard shortcuts (`Ctrl+U` upload, `Ctrl+N` new folder, `F2` rename, `Ctrl+F` search)

### Preview
- Images (jpg, png, gif, svg, webp) — inline preview + grid thumbnails
- PDF — embedded viewer
- Text / Code (txt, csv, json, xml, md, py, js, html, css) — syntax display
- Video (mp4, webm) — HTML5 player
- Audio (mp3, wav, ogg) — HTML5 player

### Sharing
- Share with users (View / Edit / Manage permissions)
- Shareable link with optional password and expiration
- Email + in-app notification on share
- "Shared with me" view

### Version History
- Automatic versioning on file re-upload
- Version history viewer with download
- Restore to any previous version
- Version comments

### Search & Organization
- File name search with debounce
- Filter by file type, date range, owner, tags
- Favorites
- Recent files
- Color-coded tags

### Storage Management
- Per-tenant storage quota (configurable GB limit)
- Per-file size limit (configurable MB limit)
- Allowed file extension whitelist
- Storage usage indicator in sidebar

### Activity Log
- Full audit trail: Upload, Download, Rename, Move, Share, Unshare, Delete, Restore

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
| GET | `file.download` | Download by `name` or `share_link` |
| POST | `file.rename` | Rename a file |
| POST | `file.move` | Move file to another folder |
| GET | `file.get_files` | List files in folder (sortable, paginated) |

### Folder Operations (`api/folder`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `folder.create` | Create folder (optional `parent_folder`) |
| POST | `folder.rename` | Rename a folder |
| POST | `folder.move` | Move folder to another parent |
| GET | `folder.get_folders` | List subfolders |
| GET | `folder.get_breadcrumb` | Get path from root to folder |
| GET | `folder.get_contents` | List folders + files (combined view) |

### Share Operations (`api/share`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `share.create_share` | Share with a user |
| POST | `share.remove_share` | Remove a share |
| POST | `share.generate_link` | Generate shareable link |
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
| POST | `favorite.toggle` | Toggle favorite on/off |
| GET | `favorite.get_favorites` | List user's favorites |
| GET | `search.search` | Search with filters (query, type, date, owner, tags) |
| GET | `trash.get_trash` | List trashed items |
| POST | `trash.move_to_trash` | Soft-delete an item |
| POST | `trash.restore` | Restore from trash |
| POST | `trash.delete_permanently` | Permanently delete |

---

## Installation

### Prerequisites

- Python 3.10+
- Frappe Framework v16+
- (Optional) Pillow — for image thumbnail generation

### Install

```bash
bench get-app https://github.com/lifegence/lifegence-drive.git
bench --site your-site install-app lifegence_drive
bench --site your-site migrate
```

### Optional: Thumbnail support

```bash
pip install Pillow
```

---

## Configuration

After installation, configure via **Drive Settings** (`/app/drive-settings`):

| Setting | Default | Description |
|---------|---------|-------------|
| Max File Size (MB) | 100 | Maximum size per file upload |
| Max Storage (GB) | 10 | Total storage quota |
| Allowed Extensions | pdf,doc,docx,... | Comma-separated whitelist (empty = allow all) |
| Enable Versioning | Yes | Track file version history |
| Trash Retention Days | 30 | Days before auto-delete from trash |

---

## Roles

| Role | Capabilities |
|------|-------------|
| Drive User | Upload, download, create folders, share, manage own files |
| Drive Manager | Full access including deletion and settings |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+U` | Upload files |
| `Ctrl+N` | New folder |
| `Ctrl+F` | Focus search |
| `F2` | Rename selected |
| `Enter` | Open selected |
| `Delete` | Move to trash |
| `Escape` | Clear selection |

---

## Development

```bash
# Run tests
bench --site your-site run-tests --app lifegence_drive

# Build assets
bench build --app lifegence_drive
```

### Project Structure

```
lifegence_drive/
├── drive/
│   ├── api/                    # Whitelisted API endpoints
│   │   ├── file.py             # File upload/download/move/rename
│   │   ├── folder.py           # Folder CRUD + navigation
│   │   ├── trash.py            # Trash operations
│   │   ├── share.py            # Sharing + link generation
│   │   ├── search.py           # Search with filters
│   │   ├── favorite.py         # Favorites toggle
│   │   ├── version.py          # Version management
│   │   └── storage.py          # Storage usage info
│   ├── services/               # Business logic
│   │   ├── activity_service.py # Audit logging
│   │   ├── storage_service.py  # Quota validation
│   │   ├── thumbnail_service.py# Image thumbnails
│   │   ├── notification_service.py # Share notifications
│   │   └── trash_service.py    # Scheduled trash cleanup
│   ├── doctype/                # 9 DocTypes + 1 child table
│   ├── page/
│   │   └── drive_browser/      # File browser SPA
│   └── tests/                  # 42 tests
├── public/
│   ├── css/drive.css           # UI styles
│   └── images/drive-logo.svg
├── hooks.py
└── install.py
```

---

## License

[MIT](license.txt) — Copyright (c) 2026 Lifegence Inc.

## Contributing

Contributions are welcome. Please open an issue or pull request on [GitHub](https://github.com/lifegence/lifegence-drive).
