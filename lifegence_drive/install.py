import frappe


def after_install():
	_init_drive_settings()
	_create_drive_roles()
	frappe.db.commit()
	print("Lifegence Drive: Installation complete.")


def _init_drive_settings():
	frappe.reload_doc("drive", "doctype", "drive_settings")
	settings = frappe.get_single("Drive Settings")
	if not settings.max_file_size_mb:
		settings.max_file_size_mb = 100
		settings.trash_retention_days = 30
		settings.allowed_extensions = "pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,jpg,jpeg,png,gif,svg,mp4,mp3,zip"
		settings.max_storage_gb = 10
		settings.save(ignore_permissions=True)


def _create_drive_roles():
	for role_name in ("Drive User", "Drive Manager"):
		if not frappe.db.exists("Role", role_name):
			frappe.get_doc({
				"doctype": "Role",
				"role_name": role_name,
				"desk_access": 1,
			}).insert(ignore_permissions=True)
