import frappe
from frappe import _

from lifegence_drive.drive.utils import verify_share_password


def get_context(context):
	"""Landing page for shared Drive file downloads.

	URL: /drive-download?share_link=xxx
	Supports password-protected links and guest access.
	"""
	share_link = frappe.form_dict.get("share_link")
	password = frappe.form_dict.get("password")

	context.no_cache = 1
	context.show_sidebar = False

	if not share_link:
		context.error = _("No share link provided.")
		return

	share = frappe.db.get_value(
		"Drive Share",
		{"share_link": share_link},
		["shared_doctype", "shared_name", "expires_on", "link_password"],
		as_dict=True,
	)

	if not share:
		context.error = _("Invalid or expired share link.")
		return

	if share.expires_on and frappe.utils.now_datetime() > share.expires_on:
		context.error = _("This share link has expired.")
		return

	if share.shared_doctype != "Drive File":
		context.error = _("This share link does not point to a file.")
		return

	# File info
	file_data = frappe.db.get_value(
		"Drive File",
		share.shared_name,
		["file_name", "file_size", "mime_type", "extension"],
		as_dict=True,
	)
	if not file_data:
		context.error = _("File not found.")
		return

	context.file_name = file_data.file_name
	context.file_size = format_bytes(file_data.file_size)
	context.extension = (file_data.extension or "").upper()
	context.share_link = share_link

	password_hash = frappe.db.get_value("Drive Share", {"share_link": share_link}, "password_hash")
	context.has_password = bool(share.link_password) or bool(password_hash)
	context.password_error = False

	# Download URL
	download_url = f"/api/method/lifegence_drive.drive.api.file.download?share_link={share_link}"

	if context.has_password:
		if password:
			if verify_share_password(password, password_hash, share.link_password):
				context.download_url = download_url + f"&password={frappe.utils.escape_html(password)}"
				context.authenticated = True
			else:
				context.password_error = True
				context.authenticated = False
		else:
			context.authenticated = False
	else:
		context.download_url = download_url
		context.authenticated = True

	context.title = _("Download — {0}").format(file_data.file_name)


def format_bytes(size):
	if not size:
		return "0 B"
	units = ["B", "KB", "MB", "GB", "TB"]
	i = 0
	while size >= 1024 and i < len(units) - 1:
		size /= 1024
		i += 1
	return f"{size:.1f} {units[i]}" if i > 0 else f"{size} {units[i]}"
