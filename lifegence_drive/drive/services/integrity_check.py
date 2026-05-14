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


def find_empty_folders(verbose: bool = True) -> list[dict]:
	"""Return Drive Folder rows that contain zero files and zero subfolders.

	Trashed files are excluded from the count (an empty-looking folder
	that still has soft-deleted files is NOT reported as empty).
	"""
	folders = frappe.get_all(
		"Drive Folder",
		fields=["name", "folder_name", "parent_folder", "creation", "modified", "created_by"],
	)
	if not folders:
		if verbose:
			print("No folders to check.")
		return []

	names = [f.name for f in folders]
	placeholders = ", ".join(["%s"] * len(names))

	trashed_files = set(
		frappe.get_all(
			"Drive Trash",
			filters={"original_doctype": "Drive File"},
			pluck="original_name",
		)
	)
	trashed_folders = set(
		frappe.get_all(
			"Drive Trash",
			filters={"original_doctype": "Drive Folder"},
			pluck="original_name",
		)
	)

	# Counts in a single round-trip each
	file_rows = frappe.db.sql(
		f"SELECT folder, name FROM `tabDrive File` WHERE folder IN ({placeholders})",
		tuple(names),
	)
	sub_rows = frappe.db.sql(
		f"SELECT parent_folder, name FROM `tabDrive Folder` WHERE parent_folder IN ({placeholders})",
		tuple(names),
	)

	file_count: dict[str, int] = {}
	for folder, file_name in file_rows:
		if file_name in trashed_files:
			continue
		file_count[folder] = file_count.get(folder, 0) + 1

	sub_count: dict[str, int] = {}
	for parent, child in sub_rows:
		if child in trashed_folders:
			continue
		sub_count[parent] = sub_count.get(parent, 0) + 1

	empties: list[dict] = []
	for f in folders:
		if f.name in trashed_folders:
			continue
		if file_count.get(f.name, 0) == 0 and sub_count.get(f.name, 0) == 0:
			empties.append({
				"name": f.name,
				"folder_name": f.folder_name,
				"parent_folder": f.parent_folder,
				"created_by": f.created_by,
				"modified": str(f.modified) if f.modified else None,
			})

	if verbose:
		print(f"Empty Drive Folder rows: {len(empties)} / {len(folders)} total")
		# Group by name so duplicates collapse for human reading
		by_name: dict[str, int] = {}
		for e in empties:
			by_name[e["folder_name"]] = by_name.get(e["folder_name"], 0) + 1
		for name, n in sorted(by_name.items(), key=lambda x: -x[1])[:30]:
			print(f"  {n:4} × {name}")

	return empties


def delete_empty_folders(commit: bool = False) -> dict:
	"""Delete every Drive Folder reported by find_empty_folders.

	Iterates bottom-up via repeated passes so that nested empties also
	clear (after a parent's children disappear, the parent becomes
	empty in the next pass). Dry-run by default.
	"""
	all_deleted: list[str] = []
	errors: list[dict] = []
	rounds = 0
	while True:
		rounds += 1
		empties = find_empty_folders(verbose=False)
		if not empties:
			break
		for e in empties:
			if not commit:
				all_deleted.append(e["name"])
				continue
			try:
				frappe.delete_doc("Drive Folder", e["name"], ignore_permissions=True, force=1)
				all_deleted.append(e["name"])
			except Exception as ex:
				errors.append({"name": e["name"], "error": str(ex)})
		if not commit:
			# Dry-run: a second pass would find the same names again.
			break
		if rounds > 20:
			break

	if commit:
		frappe.db.commit()

	print(
		f"{'Deleted' if commit else 'Would delete'} {len(all_deleted)} empty folder(s)"
		f" in {rounds} pass(es); errors: {len(errors)}"
	)
	return {
		"dry_run": not commit,
		"deleted_count": len(all_deleted),
		"deleted_names": all_deleted,
		"errors": errors,
		"rounds": rounds,
	}
