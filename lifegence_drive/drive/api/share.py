import frappe
from frappe import _

from lifegence_drive.drive.services.activity_service import log_activity


@frappe.whitelist()
def create_share(
	shared_doctype: str,
	shared_name: str,
	shared_with: str,
	permission_level: str = "View",
):
	"""Share a file or folder with a user."""
	if shared_doctype not in ("Drive File", "Drive Folder"):
		frappe.throw(_("Invalid doctype for sharing."))

	if not frappe.db.exists(shared_doctype, shared_name):
		frappe.throw(_(f"{shared_doctype} does not exist."))

	if not frappe.db.exists("User", shared_with):
		frappe.throw(_("User {0} does not exist.").format(shared_with))

	# Check for existing share
	existing = frappe.db.exists("Drive Share", {
		"shared_doctype": shared_doctype,
		"shared_name": shared_name,
		"shared_with": shared_with,
	})
	if existing:
		# Update permission level
		frappe.db.set_value("Drive Share", existing, "permission_level", permission_level)
		log_activity("Share", shared_doctype, shared_name, f"Updated share with {shared_with} to {permission_level}")
		return frappe.get_doc("Drive Share", existing)

	share = frappe.get_doc({
		"doctype": "Drive Share",
		"shared_doctype": shared_doctype,
		"shared_name": shared_name,
		"shared_with": shared_with,
		"permission_level": permission_level,
	})
	share.insert()

	log_activity("Share", shared_doctype, shared_name, f"Shared with {shared_with} ({permission_level})")

	# Send notification
	try:
		from lifegence_drive.drive.services.notification_service import notify_share
		notify_share(share)
	except Exception:
		frappe.log_error("Drive share notification failed")

	return share


@frappe.whitelist()
def remove_share(name: str):
	"""Remove a share."""
	share = frappe.get_doc("Drive Share", name)
	log_activity("Unshare", share.shared_doctype, share.shared_name, f"Unshared with {share.shared_with}")
	frappe.delete_doc("Drive Share", name)
	return {"removed": True}


@frappe.whitelist()
def generate_link(
	shared_doctype: str,
	shared_name: str,
	permission_level: str = "View",
	link_password: str | None = None,
	expires_on: str | None = None,
):
	"""Generate a shareable link for a file or folder."""
	if shared_doctype not in ("Drive File", "Drive Folder"):
		frappe.throw(_("Invalid doctype for sharing."))

	share = frappe.get_doc({
		"doctype": "Drive Share",
		"shared_doctype": shared_doctype,
		"shared_name": shared_name,
		"permission_level": permission_level,
		"share_link": frappe.generate_hash(length=20),
		"link_password": link_password or "",
		"expires_on": expires_on or "",
	})
	share.insert()

	log_activity("Share", shared_doctype, shared_name, "Generated share link")

	return {
		"share_link": share.share_link,
		"url": f"{frappe.utils.get_url()}/api/method/lifegence_drive.drive.api.file.download?share_link={share.share_link}",
	}


@frappe.whitelist()
def get_shares(shared_doctype: str, shared_name: str):
	"""Get all shares for a file or folder."""
	shares = frappe.get_all(
		"Drive Share",
		filters={"shared_doctype": shared_doctype, "shared_name": shared_name},
		fields=["name", "shared_with", "permission_level", "share_link", "link_password", "expires_on", "creation"],
		order_by="creation desc",
	)
	# Don't expose actual password — just flag whether one is set
	for s in shares:
		s["has_password"] = bool(s.pop("link_password", None))
	return shares


@frappe.whitelist()
def get_shared_with_me():
	"""Get all items shared with the current user."""
	shares = frappe.get_all(
		"Drive Share",
		filters={"shared_with": frappe.session.user},
		fields=["shared_doctype", "shared_name", "permission_level", "creation"],
		order_by="creation desc",
	)

	result = []
	for share in shares:
		if not frappe.db.exists(share.shared_doctype, share.shared_name):
			continue

		if share.shared_doctype == "Drive File":
			item = frappe.db.get_value(
				"Drive File", share.shared_name,
				["name", "file_name", "file_url", "file_size", "mime_type", "extension",
				 "uploaded_by", "modified"],
				as_dict=True,
			)
			if item:
				item["_type"] = "file"
				item["permission_level"] = share.permission_level
				result.append(item)
		elif share.shared_doctype == "Drive Folder":
			item = frappe.db.get_value(
				"Drive Folder", share.shared_name,
				["name", "folder_name", "created_by", "modified"],
				as_dict=True,
			)
			if item:
				item["_type"] = "folder"
				item["permission_level"] = share.permission_level
				result.append(item)

	return result
