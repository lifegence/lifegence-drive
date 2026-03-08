import frappe
from frappe.utils import add_days, nowdate


def auto_delete_expired_trash():
	"""Delete trash items past retention period."""
	settings = frappe.get_single("Drive Settings")
	cutoff = add_days(nowdate(), -settings.trash_retention_days)
	expired = frappe.get_all(
		"Drive Trash",
		filters={"expires_on": ["<", cutoff]},
		fields=["name"],
		limit_page_length=500,
	)
	for item in expired:
		frappe.delete_doc("Drive Trash", item.name, ignore_permissions=True)
	if expired:
		frappe.db.commit()
		frappe.logger().info(f"Drive: Deleted {len(expired)} expired trash items")
