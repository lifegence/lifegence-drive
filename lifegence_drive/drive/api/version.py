import os
import mimetypes

import frappe
from frappe import _

from lifegence_drive.drive.services.storage_service import (
	check_quota,
	validate_extension,
	validate_file_size,
)
from lifegence_drive.drive.services.activity_service import log_activity


@frappe.whitelist()
def upload_new_version(name: str, comment: str = ""):
	"""Upload a new version of an existing Drive File.

	Saves the current version as a Drive File Version record,
	then replaces the file with the new upload.
	"""
	files = frappe.request.files
	if not files or "file" not in files:
		frappe.throw(_("No file uploaded."))

	drive_file = frappe.get_doc("Drive File", name)

	settings = frappe.get_single("Drive Settings")
	if not settings.enable_versioning:
		frappe.throw(_("Versioning is disabled."))

	uploaded = files["file"]
	filename = frappe.utils.escape_html(uploaded.filename)
	content = uploaded.read()
	file_size = len(content)
	extension = os.path.splitext(filename)[1].lstrip(".").lower()
	mime_type = uploaded.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

	# Validations
	validate_file_size(file_size)
	validate_extension(extension)
	check_quota(file_size)

	# Save current state as a version record
	frappe.get_doc({
		"doctype": "Drive File Version",
		"drive_file": drive_file.name,
		"version_number": drive_file.version,
		"file_url": drive_file.file_url,
		"file_size": drive_file.file_size,
		"uploaded_by": drive_file.uploaded_by,
		"comment": comment,
	}).insert(ignore_permissions=True)

	# Save new physical file
	frappe_file = frappe.get_doc({
		"doctype": "File",
		"file_name": filename,
		"content": content,
		"is_private": drive_file.is_private,
	})
	frappe_file.save(ignore_permissions=True)

	# Update Drive File with new version
	drive_file.file_name = filename
	drive_file.file_url = frappe_file.file_url
	drive_file.file_size = file_size
	drive_file.mime_type = mime_type
	drive_file.extension = extension
	drive_file.version = (drive_file.version or 1) + 1
	drive_file.save()

	log_activity("Upload", "Drive File", name, f"Uploaded version {drive_file.version}")

	return drive_file


@frappe.whitelist()
def get_versions(name: str):
	"""Get all versions of a Drive File."""
	versions = frappe.get_all(
		"Drive File Version",
		filters={"drive_file": name},
		fields=["name", "version_number", "file_url", "file_size",
				"uploaded_by", "uploaded_at", "comment"],
		order_by="version_number desc",
	)

	# Add current version as the first entry
	current = frappe.db.get_value(
		"Drive File", name,
		["file_name", "file_url", "file_size", "version", "uploaded_by", "modified"],
		as_dict=True,
	)
	if current:
		versions.insert(0, {
			"name": "",
			"version_number": current.version,
			"file_url": current.file_url,
			"file_size": current.file_size,
			"uploaded_by": current.uploaded_by,
			"uploaded_at": current.modified,
			"comment": _("Current version"),
			"is_current": True,
		})

	return versions


@frappe.whitelist()
def restore_version(name: str, version_name: str):
	"""Restore a Drive File to a previous version."""
	drive_file = frappe.get_doc("Drive File", name)
	version = frappe.get_doc("Drive File Version", version_name)

	if version.drive_file != name:
		frappe.throw(_("Version does not belong to this file."))

	# Save current as a version before restoring
	frappe.get_doc({
		"doctype": "Drive File Version",
		"drive_file": drive_file.name,
		"version_number": drive_file.version,
		"file_url": drive_file.file_url,
		"file_size": drive_file.file_size,
		"uploaded_by": drive_file.uploaded_by,
		"comment": _("Auto-saved before restore"),
	}).insert(ignore_permissions=True)

	# Restore from version
	drive_file.file_url = version.file_url
	drive_file.file_size = version.file_size
	drive_file.version = (drive_file.version or 1) + 1
	drive_file.save()

	log_activity("Restore", "Drive File", name,
				f"Restored to version {version.version_number}")

	return drive_file


@frappe.whitelist()
def download_version(version_name: str):
	"""Download a specific version of a file."""
	version = frappe.get_doc("Drive File Version", version_name)
	drive_file = frappe.get_doc("Drive File", version.drive_file)

	file_url = version.file_url
	if not file_url:
		frappe.throw(_("File URL not found for this version."))

	file_path = frappe.utils.get_files_path(
		file_url.replace("/files/", "").replace("/private/files/", ""),
		is_private="/private/" in file_url,
	)

	with open(file_path, "rb") as f:
		content = f.read()

	frappe.local.response.filename = f"v{version.version_number}_{drive_file.file_name}"
	frappe.local.response.filecontent = content
	frappe.local.response.type = "download"
