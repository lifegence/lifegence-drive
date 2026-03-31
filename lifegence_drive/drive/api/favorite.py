import frappe
from frappe import _


@frappe.whitelist()
def toggle(doctype: str, name: str):
	"""Toggle favorite status for a file or folder. Returns the new state."""
	if doctype not in ("Drive File", "Drive Folder"):
		frappe.throw(_("Invalid doctype for favorite."))

	existing = frappe.db.exists("Drive Favorite", {
		"favorited_doctype": doctype,
		"favorited_name": name,
		"user": frappe.session.user,
	})

	if existing:
		frappe.delete_doc("Drive Favorite", existing, ignore_permissions=True)
		return {"favorited": False}

	frappe.get_doc({
		"doctype": "Drive Favorite",
		"favorited_doctype": doctype,
		"favorited_name": name,
		"user": frappe.session.user,
	}).insert(ignore_permissions=True)

	return {"favorited": True}


@frappe.whitelist()
def get_favorites():
	"""Get all favorites for the current user with details."""
	favs = frappe.get_all(
		"Drive Favorite",
		filters={"user": frappe.session.user},
		fields=["favorited_doctype", "favorited_name"],
	)

	# Collect names by doctype for batch fetching
	file_names = [f.favorited_name for f in favs if f.favorited_doctype == "Drive File"]
	folder_names = [f.favorited_name for f in favs if f.favorited_doctype == "Drive Folder"]

	# Batch-fetch file details
	file_map = {}
	if file_names:
		for row in frappe.get_all(
			"Drive File",
			filters={"name": ["in", file_names]},
			fields=["name", "file_name", "file_url", "file_size", "mime_type",
					"extension", "uploaded_by", "modified", "creation"],
		):
			file_map[row.name] = row

	# Batch-fetch folder details
	folder_map = {}
	if folder_names:
		for row in frappe.get_all(
			"Drive Folder",
			filters={"name": ["in", folder_names]},
			fields=["name", "folder_name", "created_by", "modified", "creation"],
		):
			folder_map[row.name] = row

	result = []
	for fav in favs:
		if fav.favorited_doctype == "Drive File":
			item = file_map.get(fav.favorited_name)
			if item:
				item["_type"] = "file"
				result.append(item)
		elif fav.favorited_doctype == "Drive Folder":
			item = folder_map.get(fav.favorited_name)
			if item:
				item["_type"] = "folder"
				result.append(item)

	return result
