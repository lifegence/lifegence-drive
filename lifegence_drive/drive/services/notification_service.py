import frappe
from frappe import _


def notify_share(share_doc):
	"""Send a notification when a file/folder is shared with a user."""
	if not share_doc.shared_with:
		return

	shared_by = frappe.session.user
	shared_by_name = frappe.utils.get_fullname(shared_by)

	# Get the name of the shared item
	item_name = ""
	if share_doc.shared_doctype == "Drive File":
		item_name = frappe.db.get_value("Drive File", share_doc.shared_name, "file_name") or share_doc.shared_name
	elif share_doc.shared_doctype == "Drive Folder":
		item_name = frappe.db.get_value("Drive Folder", share_doc.shared_name, "folder_name") or share_doc.shared_name

	subject = _("{0} shared '{1}' with you").format(shared_by_name, item_name)

	frappe.sendmail(
		recipients=[share_doc.shared_with],
		subject=subject,
		message=_(
			"<p>{0} has shared a {1} with you:</p>"
			"<p><strong>{2}</strong></p>"
			"<p>Permission: {3}</p>"
			"<p><a href='{4}/app/drive-browser'>Open Drive</a></p>"
		).format(
			shared_by_name,
			_("file") if share_doc.shared_doctype == "Drive File" else _("folder"),
			item_name,
			share_doc.permission_level,
			frappe.utils.get_url(),
		),
		now=True,
	)

	# Also create a Frappe notification
	frappe.get_doc({
		"doctype": "Notification Log",
		"for_user": share_doc.shared_with,
		"from_user": shared_by,
		"subject": subject,
		"type": "Share",
		"document_type": share_doc.shared_doctype,
		"document_name": share_doc.shared_name,
	}).insert(ignore_permissions=True)
