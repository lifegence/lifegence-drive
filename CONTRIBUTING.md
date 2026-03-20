# Contributing to Lifegence Drive

Thank you for your interest in contributing!

## Getting Started

1. Fork this repository
2. Clone your fork into a Frappe bench:
   ```bash
   bench get-app /path/to/your/fork
   bench --site your-site install-app lifegence_drive
   ```
3. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```

## Development Setup

```bash
# Enable developer mode
bench set-config -g developer_mode 1

# Run the dev server
bench start

# Access the file browser
open http://your-site:8000/app/drive-browser
```

## Making Changes

### Code Style

- Python: follow [Ruff](https://docs.astral.sh/ruff/) rules defined in `pyproject.toml`
- JavaScript: follow the `.eslintrc` configuration
- Use tabs for indentation (matching Frappe conventions)

### Adding a New API Endpoint

1. Create or edit a file in `lifegence_drive/drive/api/`
2. Decorate with `@frappe.whitelist()`
3. Add tests in `lifegence_drive/drive/tests/`

### Adding a New DocType

1. Use `bench new-doctype` or create JSON manually in `drive/doctype/`
2. Set `module = "Drive"`
3. Add appropriate permissions for Drive User / Drive Manager

## Testing

```bash
# Run all tests
bench --site your-site run-tests --app lifegence_drive

# Run a specific test file
bench --site your-site run-tests --module lifegence_drive.drive.tests.test_file_api
```

All pull requests must pass the existing test suite. Please add tests for new features.

## Pull Requests

1. Keep PRs focused — one feature or fix per PR
2. Update `CHANGELOG.md` under an `[Unreleased]` section
3. Ensure all tests pass
4. Write a clear PR description

## Reporting Issues

Please use [GitHub Issues](https://github.com/lifegence/lifegence-drive/issues) and include:

- Frappe version (`bench version`)
- Steps to reproduce
- Expected vs actual behavior
- Error logs if applicable

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](license.txt).
