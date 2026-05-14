"""Detect & repair Drive File records whose backing storage is missing.

A "ghost" Drive File is one whose `file_url` does not resolve to either
a corresponding Frappe File row or a real file on disk. These can leak
in when an upload aborts mid-way, or when a Frappe File is removed
directly via Desk without cascading through Drive.

This module is the source of truth for both the bench-CLI entry point
(`bench --site <site> execute lifegence_drive.drive.services.integrity_check.find_ghosts`)
and the whitelisted API in `drive/api/maintenance.py`.
"""

import os

import frappe


def _disk_path_for(file_url: str) -> str | None:
	"""Resolve a `/files/x` or `/private/files/x` URL to an absolute disk path."""
	if not file_url:
		return None
	site_path = frappe.get_site_path()
	if file_url.startswith("/private/files/"):
		return os.path.join(site_path, "private", "files", file_url[len("/private/files/"):])
	if file_url.startswith("/files/"):
		return os.path.join(site_path, "public", "files", file_url[len("/files/"):])
	return None


def find_ghosts(verbose: bool = True) -> list[dict]:
	"""Return Drive File records whose physical backing is missing.

	A row is reported as ghost when ANY of the following hold:
	- file_url is empty / NULL
	- no `tabFile` row exists with the same file_url
	- the file_url points to a path that does not exist on disk
	"""
	rows = frappe.get_all(
		"Drive File",
		fields=["name", "file_name", "file_url", "file_size", "folder", "owner", "modified"],
	)
	ghosts: list[dict] = []
	for row in rows:
		reason = _ghost_reason(row.file_url)
		if reason is None:
			continue
		ghosts.append({
			"name": row.name,
			"file_name": row.file_name,
			"file_url": row.file_url,
			"file_size": row.file_size,
			"folder": row.folder,
			"owner": row.owner,
			"modified": str(row.modified) if row.modified else None,
			"reason": reason,
		})

	if verbose:
		print(f"Drive File ghosts: {len(ghosts)} / {len(rows)} total")
		for g in ghosts[:20]:
			print(f"  - {g['name']:14} {g['file_name']!r:30} {g['reason']}")
		if len(ghosts) > 20:
			print(f"  ... and {len(ghosts) - 20} more")

	return ghosts


def _ghost_reason(file_url: str | None) -> str | None:
	if not file_url:
		return "empty file_url"
	if not frappe.db.exists("File", {"file_url": file_url}):
		# No Frappe File row backs this Drive File.
		# Still allow it if the path itself exists on disk (rare but possible).
		disk = _disk_path_for(file_url)
		if disk and os.path.exists(disk):
			return None
		return "no Frappe File and disk path missing"
	disk = _disk_path_for(file_url)
	if not disk:
		return "unrecognised file_url scheme"
	if not os.path.exists(disk):
		return "disk path missing"
	return None


def delete_ghosts(commit: bool = False, also_delete_frappe_file: bool = False) -> dict:
	"""Delete Drive File rows reported as ghosts.

	Call with `commit=True` to actually delete; the default is dry-run so
	repeated invocations are safe. Frappe File rows are left alone unless
	`also_delete_frappe_file=True` is passed.
	"""
	ghosts = find_ghosts(verbose=False)
	deleted: list[str] = []
	errors: list[dict] = []

	for g in ghosts:
		if not commit:
			deleted.append(g["name"])
			continue
		try:
			frappe.delete_doc("Drive File", g["name"], ignore_permissions=True, force=1)
			deleted.append(g["name"])

			if also_delete_frappe_file and g["file_url"]:
				frappe_file = frappe.db.get_value("File", {"file_url": g["file_url"]}, "name")
				if frappe_file:
					frappe.delete_doc("File", frappe_file, ignore_permissions=True, force=1)
		except Exception as e:
			errors.append({"name": g["name"], "error": str(e)})

	if commit:
		frappe.db.commit()

	print(
		f"{'Deleted' if commit else 'Would delete'} {len(deleted)} ghost Drive File(s); "
		f"errors: {len(errors)}"
	)
	return {
		"dry_run": not commit,
		"ghost_count": len(ghosts),
		"deleted_count": len(deleted),
		"deleted_names": deleted,
		"errors": errors,
	}
