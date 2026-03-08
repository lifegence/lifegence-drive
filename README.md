# Lifegence Drive

File sharing (ファイル共有) for [Frappe](https://frappeframework.com/).

Provides drag & drop file upload, folder management, sharing links, tagging, and full-text search.

## Features

- Drag & drop file upload with preview
- Folder hierarchy management
- Share links with permission control
- Favorites and tagging
- Activity logging
- Trash with restore capability
- Storage quota management

## Modules

### Drive (ファイル共有) — 8 DocTypes

| DocType | Description |
|---------|-------------|
| Drive Settings | Global configuration |
| Drive File | File entries |
| Drive Folder | Folder hierarchy |
| Drive Share | Sharing links and permissions |
| Drive Favorite | User favorites |
| Drive Tag | File/folder tags |
| Drive Activity | Activity log |
| Drive Trash | Trash management |

## Prerequisites

- Python 3.10+
- Frappe Framework v16+

## Installation

```bash
bench get-app https://github.com/lifegence/lifegence-drive.git
bench --site your-site install-app lifegence_drive
bench --site your-site migrate
```

## License

MIT - see [LICENSE](LICENSE)

## Contributing

Contributions are welcome. Please open an issue or pull request on [GitHub](https://github.com/lifegence/lifegence-drive).
