import frappe
from frappe import _

from lifegence_drive.drive.services.activity_service import log_activity
from lifegence_drive.drive.services.permission_service import (
	check_manage_permission,
	check_view_permission,
	get_accessible_file_names,
	get_accessible_folder_names,
)


@frappe.whitelist()
def create(folder_name: str, parent_folder: str | None = None, is_private: int = 0):
	"""Create a new Drive Folder."""
	if parent_folder and not frappe.db.exists("Drive Folder", parent_folder):
		frappe.throw(_("Parent folder does not exist."))

	folder = frappe.get_doc({
		"doctype": "Drive Folder",
		"folder_name": frappe.utils.escape_html(folder_name),
		"parent_folder": parent_folder or "",
		"is_private": int(is_private),
		"created_by": frappe.session.user,
	})
	folder.insert()

	log_activity("Upload", "Drive Folder", folder.name, f"Created folder '{folder_name}'")

	return folder


@frappe.whitelist()
def rename(name: str, new_name: str):
	"""Rename a Drive Folder."""
	check_manage_permission("Drive Folder", name)

	folder = frappe.get_doc("Drive Folder", name)
	old_name = folder.folder_name
	folder.folder_name = frappe.utils.escape_html(new_name)
	folder.save()

	log_activity("Rename", "Drive Folder", name, f"Renamed '{old_name}' to '{new_name}'")

	return folder


@frappe.whitelist()
def move(name: str, target_parent: str | None = None):
	"""Move a Drive Folder to another parent folder."""
	check_manage_permission("Drive Folder", name)

	folder = frappe.get_doc("Drive Folder", name)
	old_parent = folder.parent_folder

	if target_parent:
		if not frappe.db.exists("Drive Folder", target_parent):
			frappe.throw(_("Target parent folder does not exist."))
		if target_parent == name:
			frappe.throw(_("Cannot move a folder into itself."))

	folder.parent_folder = target_parent or ""
	folder.save()

	log_activity(
		"Move", "Drive Folder", name,
		f"Moved from '{old_parent or 'root'}' to '{target_parent or 'root'}'",
	)

	return folder


@frappe.whitelist()
def get_folders(
	parent_folder: str | None = None,
	order_by: str = "folder_name asc",
	with_counts: int | bool = 0,
):
	"""List Drive Folders under a parent (or root if none specified).

	When `with_counts` is truthy, each row carries an `item_count`
	attribute (sum of immediate child folders + non-trashed files).
	The counts are computed in two grouped queries so the API stays
	flat and avoids N+1 lookups.
	"""
	filters = {}
	if parent_folder:
		filters["parent_folder"] = parent_folder
	else:
		filters["parent_folder"] = ("in", ["", None])

	# Row-level access: restrict to folders the user owns or was shared, minus
	# trashed ones. Without this, get_all exposed every user's folders.
	trashed = set(
		frappe.get_all("Drive Trash", filters={"original_doctype": "Drive Folder"}, pluck="original_name")
	)
	accessible = get_accessible_folder_names()
	filters["name"] = ("in", list(accessible - trashed))

	allowed_orders = {"folder_name asc", "folder_name desc", "modified desc", "modified asc", "creation desc"}
	if order_by not in allowed_orders:
		order_by = "folder_name asc"

	folders = frappe.get_all(
		"Drive Folder",
		filters=filters,
		fields=["name", "folder_name", "parent_folder", "is_private", "created_by", "creation", "modified"],
		order_by=order_by,
	)

	if int(with_counts or 0) and folders:
		names = [f.name for f in folders]
		placeholders = ", ".join(["%s"] * len(names))

		trashed_files = set(
			frappe.get_all(
				"Drive Trash",
				filters={"original_doctype": "Drive File"},
				pluck="original_name",
			)
		)

		file_rows = frappe.db.sql(
			f"SELECT folder, name FROM `tabDrive File` WHERE folder IN ({placeholders})",
			tuple(names),
		)
		file_count: dict[str, int] = {}
		for folder, fname in file_rows:
			if fname in trashed_files:
				continue
			file_count[folder] = file_count.get(folder, 0) + 1

		sub_rows = frappe.db.sql(
			f"SELECT parent_folder, COUNT(*) FROM `tabDrive Folder` "
			f"WHERE parent_folder IN ({placeholders}) GROUP BY parent_folder",
			tuple(names),
		)
		sub_count = dict(sub_rows)

		for f in folders:
			f["item_count"] = file_count.get(f.name, 0) + int(sub_count.get(f.name, 0) or 0)

	return folders


@frappe.whitelist()
def get_breadcrumb(folder: str):
	"""Return the breadcrumb path from root to the given folder.

	Returns empty unless the user can view the target folder, so folder
	names/hierarchy can't be enumerated by guessing ids.
	"""
	if not folder:
		return []
	accessible = get_accessible_folder_names()
	if folder not in accessible:
		return []

	breadcrumb = []
	current = folder

	while current:
		doc = frappe.db.get_value(
			"Drive Folder", current,
			["name", "folder_name", "parent_folder"],
			as_dict=True,
		)
		if not doc:
			break
		breadcrumb.insert(0, {"name": doc.name, "folder_name": doc.folder_name})
		current = doc.parent_folder

	return breadcrumb


@frappe.whitelist()
def get_tree_children(doctype=None, parent="", include_disabled=False, **filters):
	"""Return folder children + files for the Tree View."""
	# Get child folders (standard tree behavior), then drop any the user
	# can't access — _get_children is unfiltered and would expose all folders.
	from frappe.desk.treeview import _get_children
	children = _get_children("Drive Folder", parent, include_disabled=include_disabled)
	accessible_folders = get_accessible_folder_names()
	children = [c for c in children if c.get("value") in accessible_folders]

	# Get files in this folder, restricted to ones the user can access.
	folder_filter = parent if parent else ["in", ["", None]]
	accessible_files = get_accessible_file_names()
	files = frappe.get_all(
		"Drive File",
		filters={"folder": folder_filter, "name": ["in", list(accessible_files)]},
		fields=["name", "file_name", "file_size", "extension", "mime_type"],
		order_by="file_name asc",
		limit_page_length=200,
	)

	for f in files:
		children.append({
			"value": f"file:{f.name}",
			"title": f.file_name,
			"expandable": 0,
			"is_file": 1,
			"file_name": f.name,
		})

	return children


@frappe.whitelist()
def get_contents(folder: str | None = None, order_by: str = "modified desc", limit: int = 50, start: int = 0):
	"""List both folders and files in a given folder, folders first."""
	from lifegence_drive.drive.api.file import get_files

	# Reject browsing into a folder the user can't view (defense in depth;
	# the listings below are already row-filtered).
	if folder:
		check_view_permission("Drive Folder", folder)

	folders = get_folders(parent_folder=folder, order_by="folder_name asc", with_counts=1)
	files = get_files(folder=folder, order_by=order_by, limit=limit, start=start)

	return {
		"folders": folders,
		"files": files,
		"breadcrumb": get_breadcrumb(folder) if folder else [],
	}
