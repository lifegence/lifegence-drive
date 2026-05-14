"""Whitelisted endpoints for Drive maintenance tasks.

Both endpoints require the System Manager role since they walk the
entire Drive File table and can perform bulk deletions. UI surfaces
should never expose these to regular users.
"""

import frappe

from lifegence_drive.drive.services.integrity_check import delete_ghosts as _delete_ghosts
from lifegence_drive.drive.services.integrity_check import find_ghosts as _find_ghosts


def _require_system_manager():
	if "System Manager" not in frappe.get_roles(frappe.session.user):
		frappe.throw(
			frappe._("System Manager role required."),
			frappe.PermissionError,
		)


@frappe.whitelist()
def list_ghosts() -> list[dict]:
	"""Return Drive File rows whose backing storage is missing."""
	_require_system_manager()
	return _find_ghosts(verbose=False)


@frappe.whitelist()
def cleanup_ghosts(also_delete_frappe_file: int = 0) -> dict:
	"""Permanently delete ghost Drive File rows. Always commits."""
	_require_system_manager()
	return _delete_ghosts(commit=True, also_delete_frappe_file=bool(int(also_delete_frappe_file)))
