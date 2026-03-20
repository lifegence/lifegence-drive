# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-03-20

### Added
- **File Browser UI** — Google Drive-style SPA at `/app/drive-browser`
  - Grid / List view toggle
  - Breadcrumb navigation
  - Drag & drop file upload with progress indicator
  - Right-click context menu
  - Sidebar (My Files, Shared, Favorites, Recent, Trash)
  - Storage usage display
  - Keyboard shortcuts (Ctrl+U, Ctrl+N, Ctrl+F, F2, Delete, Escape)
- **File Operations API** — upload, download, rename, move, list
- **Folder API** — create, rename, move, list, breadcrumb, combined contents
- **Sharing API** — user shares, shareable links (password + expiry), email notifications
- **Search API** — query by name, file type, date range, owner, tags
- **Favorites API** — toggle on/off, list with details
- **Version History** — new Drive File Version DocType, upload new versions, restore, download old versions
- **Trash API** — move to trash, restore, permanent delete, list with details
- **Storage Service** — quota check, file size validation, extension whitelist
- **Thumbnail Service** — image thumbnail generation (Pillow optional)
- **Notification Service** — email + Frappe notification on share
- **Activity Service** — centralized audit logging
- **Preview** — images, PDF, text/code, video in-browser preview
- **42 automated tests** across all APIs and services
- **Responsive CSS** — mobile-friendly layout

### Changed
- Drive File controller — added before_insert validation, after_insert/on_update/on_trash activity logging
- Drive Folder controller — added validate, on_update, on_trash with child file protection
- Drive Share DocType — `shared_with` field changed from required to optional (for link-only shares)
- Updated `hooks.py` — CSS include, app route to `/app/drive-browser`
- Replaced deprecated `limit_page_length` with `limit` in all queries

## [0.1.0] - 2026-03-08

### Added
- Initial release with 8 DocTypes (Drive File, Drive Folder, Drive Share, Drive Tag, Drive File Tag, Drive Favorite, Drive Activity, Drive Trash, Drive Settings)
- Drive Settings singleton with storage/trash configuration
- Scheduled daily trash auto-delete
- Drive User and Drive Manager roles
- Workspace with shortcuts
- 7 baseline tests
