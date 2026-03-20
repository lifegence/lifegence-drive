import frappe

from lifegence_drive.drive.services.storage_service import get_storage_info as _get_storage_info


@frappe.whitelist()
def get_info():
	"""Return storage usage information."""
	return _get_storage_info()
