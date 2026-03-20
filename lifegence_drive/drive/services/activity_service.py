import frappe


def log_activity(
	action: str,
	target_doctype: str,
	target_name: str,
	details: str = "",
):
	"""Record a Drive Activity log entry."""
	frappe.get_doc({
		"doctype": "Drive Activity",
		"action": action,
		"target_doctype": target_doctype,
		"target_name": target_name,
		"performed_by": frappe.session.user,
		"details": details,
	}).insert(ignore_permissions=True)
