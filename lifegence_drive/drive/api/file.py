import hmac
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
from lifegence_drive.drive.services.permission_service import get_accessible_file_names


@frappe.whitelist()
def upload(folder: str | None = None, is_private: int = 0):
	"""Upload a file to Drive.

	Accepts multipart form data with a file attachment.
	Returns the created Drive File document.
	"""
	files = frappe.request.files
	if not files or "file" not in files:
		frappe.throw(_("No file uploaded."))

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

	if folder and not frappe.db.exists("Drive Folder", folder):
		frappe.throw(_("Folder {0} does not exist.").format(folder))

	# Save physical file via Frappe's File doctype
	frappe_file = frappe.get_doc({
		"doctype": "File",
		"file_name": filename,
		"content": content,
		"is_private": int(is_private),
	})
	frappe_file.save(ignore_permissions=True)

	# Create Drive File record
	drive_file = frappe.get_doc({
		"doctype": "Drive File",
		"file_name": filename,
		"file_url": frappe_file.file_url,
		"file_size": file_size,
		"mime_type": mime_type,
		"extension": extension,
		"folder": folder or "",
		"is_private": int(is_private),
		"uploaded_by": frappe.session.user,
	})
	drive_file.insert()

	log_activity("Upload", "Drive File", drive_file.name, f"Uploaded {filename}")

	return drive_file


@frappe.whitelist(allow_guest=True)
def download(name: str | None = None, share_link: str | None = None, password: str | None = None):
	"""Download a Drive File by name or share_link.

	Returns a file download response.
	For share links with a password, pass ?password=xxx as a query parameter.
	"""
	via_share_link = False

	if share_link:
		share = frappe.db.get_value(
			"Drive Share",
			{"share_link": share_link},
			["shared_doctype", "shared_name", "expires_on", "link_password"],
			as_dict=True,
		)
		if not share:
			frappe.throw(_("Invalid or expired share link."), frappe.PermissionError)

		if share.expires_on and frappe.utils.now_datetime() > share.expires_on:
			frappe.throw(_("This share link has expired."), frappe.PermissionError)

		if share.shared_doctype != "Drive File":
			frappe.throw(_("Share link does not point to a file."))

		# Password verification (check hash first, fall back to legacy)
		password_hash = frappe.db.get_value("Drive Share", {"share_link": share_link}, "password_hash")
		if password_hash or share.link_password:
			if not password:
				frappe.throw(_("This link requires a password. Add &password=xxx to the URL."), frappe.PermissionError)
			if password_hash:
				from werkzeug.security import check_password_hash
				if not check_password_hash(password_hash, password):
					frappe.throw(_("Incorrect password."), frappe.PermissionError)
			elif not hmac.compare_digest(password.encode(), share.link_password.encode()):
				frappe.throw(_("Incorrect password."), frappe.PermissionError)

		name = share.shared_name
		via_share_link = True

	if not name:
		frappe.throw(_("File name is required."))

	if via_share_link:
		# Bypass permission check for valid share links (guest access)
		file_data = frappe.db.get_value(
			"Drive File", name, ["file_name", "file_url"], as_dict=True,
		)
		if not file_data:
			frappe.throw(_("File not found."))
		file_url = file_data.file_url
		filename = file_data.file_name
	else:
		drive_file = frappe.get_doc("Drive File", name)
		file_url = drive_file.file_url
		filename = drive_file.file_name
		log_activity("Download", "Drive File", name, f"Downloaded {filename}")

	if not file_url:
		frappe.throw(_("File URL not found."))

	frappe.local.response.filename = filename
	frappe.local.response.filecontent = _read_file_content(file_url)
	frappe.local.response.type = "download"


@frappe.whitelist(allow_guest=True)
def preview_share(share_link: str | None = None, password: str | None = None):
	"""Landing page for shared links. Returns file info (or password prompt).

	Guest-safe endpoint that returns metadata without file content.
	"""
	if not share_link:
		frappe.throw(_("Share link is required."))

	share = frappe.db.get_value(
		"Drive Share",
		{"share_link": share_link},
		["shared_doctype", "shared_name", "expires_on", "link_password"],
		as_dict=True,
	)
	if not share:
		frappe.throw(_("Invalid or expired share link."), frappe.PermissionError)

	if share.expires_on and frappe.utils.now_datetime() > share.expires_on:
		frappe.throw(_("This share link has expired."), frappe.PermissionError)

	if share.shared_doctype != "Drive File":
		frappe.throw(_("Share link does not point to a file."))

	password_hash = frappe.db.get_value("Drive Share", {"share_link": share_link}, "password_hash")
	has_password = bool(share.link_password) or bool(password_hash)

	# If password required, verify before showing info
	if has_password and not password:
		return {"requires_password": True}

	if has_password:
		if password_hash:
			from werkzeug.security import check_password_hash
			if not check_password_hash(password_hash, password):
				frappe.throw(_("Incorrect password."), frappe.PermissionError)
		elif not hmac.compare_digest(password.encode(), share.link_password.encode()):
			frappe.throw(_("Incorrect password."), frappe.PermissionError)

	file_data = frappe.db.get_value(
		"Drive File", share.shared_name,
		["file_name", "file_size", "mime_type", "extension"],
		as_dict=True,
	)
	if not file_data:
		frappe.throw(_("File not found."))

	return {
		"requires_password": False,
		"file_name": file_data.file_name,
		"file_size": file_data.file_size,
		"mime_type": file_data.mime_type,
		"extension": file_data.extension,
	}


def _read_file_content(file_url: str) -> bytes:
	"""Read file content from Frappe's file system."""
	file_path = frappe.utils.get_files_path(
		file_url.replace("/files/", "").replace("/private/files/", ""),
		is_private="/private/" in file_url,
	)
	with open(file_path, "rb") as f:
		return f.read()


@frappe.whitelist()
def rename(name: str, new_name: str):
	"""Rename a Drive File."""
	drive_file = frappe.get_doc("Drive File", name)
	old_name = drive_file.file_name
	drive_file.file_name = frappe.utils.escape_html(new_name)
	drive_file.save()

	log_activity("Rename", "Drive File", name, f"Renamed '{old_name}' to '{new_name}'")

	return drive_file


@frappe.whitelist()
def move(name: str, target_folder: str | None = None):
	"""Move a Drive File to another folder."""
	drive_file = frappe.get_doc("Drive File", name)
	old_folder = drive_file.folder

	if target_folder and not frappe.db.exists("Drive Folder", target_folder):
		frappe.throw(_("Target folder does not exist."))

	drive_file.folder = target_folder or ""
	drive_file.save()

	log_activity(
		"Move", "Drive File", name,
		f"Moved from '{old_folder or 'root'}' to '{target_folder or 'root'}'",
	)

	return drive_file


@frappe.whitelist()
def get_files(folder: str | None = None, order_by: str = "modified desc", limit: int = 50, start: int = 0):
	"""List Drive Files in a folder (or root if no folder specified)."""
	filters = {}
	if folder:
		filters["folder"] = folder
	else:
		filters["folder"] = ("in", ["", None])

	# Exclude trashed files
	trashed = frappe.get_all("Drive Trash", filters={"original_doctype": "Drive File"}, pluck="original_name")
	if trashed:
		filters["name"] = ("not in", trashed)

	# Permission filter: only show files the user can access
	accessible = get_accessible_file_names()
	if accessible is not None:
		if "name" in filters:
			# Combine with existing name filter (trashed)
			existing = filters["name"]
			if isinstance(existing, tuple) and existing[0] == "not in":
				combined = set(existing[1])
				all_names = set(frappe.get_all("Drive File", pluck="name"))
				allowed = (all_names - combined) & accessible
				filters["name"] = ("in", list(allowed))
		else:
			filters["name"] = ("in", list(accessible))

	allowed_orders = {
		"modified desc", "modified asc", "file_name asc", "file_name desc",
		"file_size asc", "file_size desc", "creation desc", "creation asc",
	}
	if order_by not in allowed_orders:
		order_by = "modified desc"

	return frappe.get_all(
		"Drive File",
		filters=filters,
		fields=["name", "file_name", "file_url", "file_size", "mime_type", "extension",
				"folder", "uploaded_by", "is_private", "version", "creation", "modified"],
		order_by=order_by,
		limit=limit,
		limit_start=start,
	)
