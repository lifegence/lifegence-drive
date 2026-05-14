import os

import frappe
from frappe import _

# Supported thumbnail formats
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "svg"}
THUMBNAIL_SIZE = (200, 200)
# PDF thumbnail render scale relative to the source page. ~1.4 yields
# ~140 dpi for an A4 page which downsamples cleanly to 200 px.
PDF_RENDER_SCALE = 1.4


def get_thumbnail_url(drive_file_name: str) -> str | None:
	"""Get or generate a thumbnail URL for a Drive File.

	Returns the thumbnail URL if the file is an image OR a PDF whose
	first page rendered cleanly; otherwise None so the UI can fall back
	to its file-type icon.
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

	# PDFs — render the first page as a JPEG thumbnail
	if ext == "pdf" or (file_data.mime_type or "").lower() == "application/pdf":
		return _get_or_create_pdf_thumbnail(file_data.file_url, drive_file_name)

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


def _get_or_create_pdf_thumbnail(file_url: str, drive_file_name: str) -> str | None:
	"""Render the first page of a PDF to a JPEG thumbnail.

	Uses pypdfium2 (already a runtime dep via lifegence_scanner). Returns
	None if pypdfium2 is unavailable or rendering fails so the caller can
	fall back to a generic icon.
	"""
	try:
		import pypdfium2 as pdfium
	except ImportError:
		return None
	try:
		from PIL import Image  # noqa: F401  (Image is reached indirectly via pdfium → PIL)
	except ImportError:
		return None

	is_private = "/private/" in file_url
	relative_path = file_url.replace("/files/", "").replace("/private/files/", "")
	original_path = frappe.utils.get_files_path(relative_path, is_private=is_private)
	if not os.path.exists(original_path):
		return None

	thumb_filename = f"thumb_pdf_{drive_file_name}.jpg"
	thumb_dir = frappe.utils.get_files_path("drive_thumbnails", is_private=False)
	os.makedirs(thumb_dir, exist_ok=True)
	thumb_path = os.path.join(thumb_dir, thumb_filename)

	if os.path.exists(thumb_path):
		return f"/files/drive_thumbnails/{thumb_filename}"

	try:
		pdf = pdfium.PdfDocument(original_path)
		if len(pdf) == 0:
			return None
		page = pdf[0]
		pil_image = page.render(scale=PDF_RENDER_SCALE).to_pil()
		page.close()
		pdf.close()

		pil_image.thumbnail(THUMBNAIL_SIZE)
		if pil_image.mode in ("RGBA", "P"):
			pil_image = pil_image.convert("RGB")
		pil_image.save(thumb_path, "JPEG", quality=80)
		return f"/files/drive_thumbnails/{thumb_filename}"
	except Exception:
		frappe.log_error(f"PDF thumbnail generation failed for {drive_file_name}")
		return None


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


@frappe.whitelist()
def get_thumbnails(names) -> dict:
	"""Batch variant — return {drive_file_name: thumbnail_url_or_null}.

	Accepts a JSON-encoded list (typical Frappe POST) or a Python list.
	Used by the Vue SPA to fetch all thumbnails for the current view
	in a single round-trip instead of N+1.
	"""
	import json

	if isinstance(names, str):
		try:
			names = json.loads(names)
		except json.JSONDecodeError:
			names = [names]
	if not isinstance(names, list):
		return {}

	result = {}
	for n in names:
		if not isinstance(n, str):
			continue
		result[n] = get_thumbnail_url(n)
	return result
