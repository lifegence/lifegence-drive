"""Recently modified files API."""

import frappe

from lifegence_drive.drive.services.permission_service import get_accessible_file_names


@frappe.whitelist()
def get_recent_files(limit: int = 50):
	"""List recently modified files accessible to the current user.

	Files in trash are excluded. Sort order is modified desc.
	"""
	accessible = get_accessible_file_names()
	if not accessible:
		return []

	trashed = set(
		frappe.get_all(
			"Drive Trash",
			filters={"original_doctype": "Drive File"},
			pluck="original_name",
		)
	)
	candidate = list(accessible - trashed) if trashed else list(accessible)
	if not candidate:
		return []

	try:
		limit = int(limit)
	except (TypeError, ValueError):
		limit = 50
	limit = max(1, min(limit, 200))

	return frappe.get_all(
		"Drive File",
		filters={"name": ("in", candidate)},
		fields=[
			"name",
			"file_name",
			"file_url",
			"file_size",
			"mime_type",
			"extension",
			"uploaded_by",
			"modified",
			"folder",
		],
		order_by="modified desc",
		limit=limit,
	)
