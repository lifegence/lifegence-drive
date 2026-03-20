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

	result = []
	for fav in favs:
		if not frappe.db.exists(fav.favorited_doctype, fav.favorited_name):
			continue

		if fav.favorited_doctype == "Drive File":
			item = frappe.db.get_value(
				"Drive File", fav.favorited_name,
				["name", "file_name", "file_url", "file_size", "mime_type",
				 "extension", "uploaded_by", "modified", "creation"],
				as_dict=True,
			)
			if item:
				item["_type"] = "file"
				result.append(item)
		elif fav.favorited_doctype == "Drive Folder":
			item = frappe.db.get_value(
				"Drive Folder", fav.favorited_name,
				["name", "folder_name", "created_by", "modified", "creation"],
				as_dict=True,
			)
			if item:
				item["_type"] = "folder"
				result.append(item)

	return result
