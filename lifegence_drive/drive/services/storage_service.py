import frappe
from frappe import _


def get_storage_usage() -> int:
	"""Return total storage used in bytes across all Drive Files."""
	result = frappe.db.sql(
		"SELECT COALESCE(SUM(file_size), 0) FROM `tabDrive File`"
	)
	return int(result[0][0]) if result else 0


def get_storage_info() -> dict:
	"""Return storage usage, limit, and remaining in bytes."""
	settings = frappe.get_single("Drive Settings")
	limit_bytes = settings.max_storage_gb * 1024 * 1024 * 1024
	used_bytes = get_storage_usage()
	return {
		"used": used_bytes,
		"limit": limit_bytes,
		"remaining": max(0, limit_bytes - used_bytes),
		"used_percent": round(used_bytes / limit_bytes * 100, 1) if limit_bytes else 0,
	}


def check_quota(new_file_size: int):
	"""Raise if adding new_file_size would exceed storage quota."""
	info = get_storage_info()
	if new_file_size > info["remaining"]:
		frappe.throw(
			_("Storage quota exceeded. Used {0} of {1}.").format(
				frappe.utils.formatters.format_value(info["used"], {"fieldtype": "Int"}),
				frappe.utils.formatters.format_value(info["limit"], {"fieldtype": "Int"}),
			),
			title=_("Storage Limit Exceeded"),
		)


def validate_file_size(file_size: int):
	"""Raise if file_size exceeds max_file_size_mb setting."""
	settings = frappe.get_single("Drive Settings")
	max_bytes = settings.max_file_size_mb * 1024 * 1024
	if file_size > max_bytes:
		frappe.throw(
			_("File size {0} MB exceeds maximum allowed {1} MB.").format(
				round(file_size / (1024 * 1024), 1),
				settings.max_file_size_mb,
			),
			title=_("File Too Large"),
		)


def validate_extension(extension: str):
	"""Raise if extension is not in the allowed list."""
	settings = frappe.get_single("Drive Settings")
	if not settings.allowed_extensions:
		return

	allowed = [ext.strip().lower() for ext in settings.allowed_extensions.split(",") if ext.strip()]
	if not allowed:
		return

	if extension.lower().lstrip(".") not in allowed:
		frappe.throw(
			_("File type '.{0}' is not allowed. Allowed types: {1}").format(
				extension, settings.allowed_extensions,
			),
			title=_("File Type Not Allowed"),
		)
