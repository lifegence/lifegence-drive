import frappe
from frappe import _
from frappe.utils import add_days, nowdate

from lifegence_drive.drive.services.activity_service import log_activity
from lifegence_drive.drive.services.permission_service import check_manage_permission


@frappe.whitelist()
def move_to_trash(doctype: str, name: str):
	"""Soft-delete a Drive File or Drive Folder by moving it to trash."""
	if doctype not in ("Drive File", "Drive Folder"):
		frappe.throw(_("Invalid doctype for trash."))

	if not frappe.db.exists(doctype, name):
		frappe.throw(_(f"{doctype} {name} does not exist."))

	if frappe.db.exists("Drive Trash", {"original_doctype": doctype, "original_name": name}):
		frappe.throw(_("Item is already in trash."))

	check_manage_permission(doctype, name)

	settings = frappe.get_single("Drive Settings")
	original_folder = ""
	if doctype == "Drive File":
		original_folder = frappe.db.get_value("Drive File", name, "folder") or ""

	trash = frappe.get_doc({
		"doctype": "Drive Trash",
		"original_doctype": doctype,
		"original_name": name,
		"deleted_by": frappe.session.user,
		"original_folder": original_folder,
		"expires_on": add_days(nowdate(), settings.trash_retention_days),
	})
	trash.insert()

	log_activity("Delete", doctype, name, "Moved to trash")

	return trash


@frappe.whitelist()
def restore(trash_name: str):
	"""Restore a trashed item."""
	trash = frappe.get_doc("Drive Trash", trash_name)
	check_manage_permission(trash.original_doctype, trash.original_name)

	if not frappe.db.exists(trash.original_doctype, trash.original_name):
		frappe.throw(_("Original item no longer exists and cannot be restored."))

	# If original folder was deleted, restore to root
	if trash.original_folder and not frappe.db.exists("Drive Folder", trash.original_folder):
		if trash.original_doctype == "Drive File":
			frappe.db.set_value("Drive File", trash.original_name, "folder", "")

	log_activity("Restore", trash.original_doctype, trash.original_name, "Restored from trash")

	frappe.delete_doc("Drive Trash", trash_name, ignore_permissions=True)

	return {"restored": True, "doctype": trash.original_doctype, "name": trash.original_name}


@frappe.whitelist()
def delete_permanently(trash_name: str):
	"""Permanently delete a trashed item."""
	trash = frappe.get_doc("Drive Trash", trash_name)
	check_manage_permission(trash.original_doctype, trash.original_name)

	# Delete the original document if it exists
	if frappe.db.exists(trash.original_doctype, trash.original_name):
		# If it's a file, also delete the physical file
		if trash.original_doctype == "Drive File":
			file_url = frappe.db.get_value("Drive File", trash.original_name, "file_url")
			if file_url:
				frappe_files = frappe.get_all("File", filters={"file_url": file_url}, pluck="name")
				for f in frappe_files:
					frappe.delete_doc("File", f, ignore_permissions=True)

		frappe.delete_doc(trash.original_doctype, trash.original_name, ignore_permissions=True)

	frappe.delete_doc("Drive Trash", trash_name, ignore_permissions=True)

	return {"deleted": True}


@frappe.whitelist()
def get_trash(limit: int = 50, start: int = 0):
	"""List items in trash."""
	items = frappe.get_all(
		"Drive Trash",
		fields=["name", "original_doctype", "original_name", "deleted_by", "deleted_on",
				"original_folder", "expires_on"],
		order_by="deleted_on desc",
		limit=limit,
		limit_start=start,
	)

	# Collect names by doctype for batch fetching
	file_names = [i.original_name for i in items if i.original_doctype == "Drive File"]
	folder_names = [i.original_name for i in items if i.original_doctype == "Drive Folder"]

	# Batch-fetch file details
	file_map = {}
	if file_names:
		for row in frappe.get_all(
			"Drive File",
			filters={"name": ["in", file_names]},
			fields=["name", "file_name", "file_size", "mime_type", "extension"],
		):
			file_map[row.name] = row

	# Batch-fetch folder details
	folder_map = {}
	if folder_names:
		for row in frappe.get_all(
			"Drive Folder",
			filters={"name": ["in", folder_names]},
			fields=["name", "folder_name"],
		):
			folder_map[row.name] = row

	# Enrich with original document details
	for item in items:
		if item.original_doctype == "Drive File":
			details = file_map.get(item.original_name)
			if details:
				item.update(details)
		elif item.original_doctype == "Drive Folder":
			details = folder_map.get(item.original_name)
			if details:
				item.update(details)

	return items
