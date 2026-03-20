import os

import frappe
from frappe import _

# Supported thumbnail formats
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "svg"}
THUMBNAIL_SIZE = (200, 200)


def get_thumbnail_url(drive_file_name: str) -> str | None:
	"""Get or generate a thumbnail URL for a Drive File.

	Returns the thumbnail URL if the file is an image, otherwise None.
	For non-image files, returns a placeholder icon reference.
	"""
	file_data = frappe.db.get_value(
		"Drive File", drive_file_name,
		["file_url", "extension", "mime_type"],
		as_dict=True,
	)

	if not file_data or not file_data.file_url:
		return None

	ext = (file_data.extension or "").lower()

	# SVG files can be used directly as thumbnails
	if ext == "svg":
		return file_data.file_url

	# For supported image formats, try to generate a thumbnail
	if ext in IMAGE_EXTENSIONS:
		return _get_or_create_image_thumbnail(file_data.file_url, drive_file_name)

	return None


def _get_or_create_image_thumbnail(file_url: str, drive_file_name: str) -> str:
	"""Generate a thumbnail for an image file using Pillow if available."""
	try:
		from PIL import Image
	except ImportError:
		# Pillow not installed, return original URL
		return file_url

	is_private = "/private/" in file_url
	relative_path = file_url.replace("/files/", "").replace("/private/files/", "")
	original_path = frappe.utils.get_files_path(relative_path, is_private=is_private)

	if not os.path.exists(original_path):
		return file_url

	# Thumbnail path
	thumb_filename = f"thumb_{drive_file_name}.jpg"
	thumb_dir = frappe.utils.get_files_path("drive_thumbnails", is_private=False)
	os.makedirs(thumb_dir, exist_ok=True)
	thumb_path = os.path.join(thumb_dir, thumb_filename)

	# Return existing thumbnail
	if os.path.exists(thumb_path):
		return f"/files/drive_thumbnails/{thumb_filename}"

	# Generate thumbnail
	try:
		img = Image.open(original_path)
		img.thumbnail(THUMBNAIL_SIZE)

		# Convert to RGB if necessary (for PNG with alpha)
		if img.mode in ("RGBA", "P"):
			img = img.convert("RGB")

		img.save(thumb_path, "JPEG", quality=80)
		return f"/files/drive_thumbnails/{thumb_filename}"
	except Exception:
		frappe.log_error(f"Thumbnail generation failed for {drive_file_name}")
		return file_url


def get_file_icon_class(extension: str) -> str:
	"""Return a Font Awesome icon class for a file extension."""
	ext = (extension or "").lower()
	icon_map = {
		"pdf": "fa-file-pdf",
		"doc": "fa-file-word", "docx": "fa-file-word",
		"xls": "fa-file-excel", "xlsx": "fa-file-excel",
		"ppt": "fa-file-powerpoint", "pptx": "fa-file-powerpoint",
		"jpg": "fa-file-image", "jpeg": "fa-file-image", "png": "fa-file-image",
		"gif": "fa-file-image", "svg": "fa-file-image", "webp": "fa-file-image",
		"mp4": "fa-file-video", "webm": "fa-file-video",
		"mp3": "fa-file-audio", "wav": "fa-file-audio",
		"zip": "fa-file-archive", "gz": "fa-file-archive", "tar": "fa-file-archive",
		"txt": "fa-file-alt", "csv": "fa-file-alt", "md": "fa-file-alt",
		"js": "fa-file-code", "py": "fa-file-code", "html": "fa-file-code",
		"css": "fa-file-code", "json": "fa-file-code", "xml": "fa-file-code",
	}
	return icon_map.get(ext, "fa-file")


@frappe.whitelist()
def get_thumbnail(name: str):
	"""API endpoint to get thumbnail URL for a Drive File."""
	url = get_thumbnail_url(name)
	return {"thumbnail_url": url}
