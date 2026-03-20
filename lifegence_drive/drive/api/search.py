import frappe
from frappe import _


@frappe.whitelist()
def search(
	query: str = "",
	file_type: str | None = None,
	date_from: str | None = None,
	date_to: str | None = None,
	owner: str | None = None,
	folder: str | None = None,
	tags: str | None = None,
	limit: int = 50,
	start: int = 0,
):
	"""Search Drive Files with various filters."""
	filters = {}

	if query:
		filters["file_name"] = ["like", f"%{query}%"]

	if file_type:
		type_map = {
			"document": ["pdf", "doc", "docx", "txt", "csv", "xls", "xlsx", "ppt", "pptx"],
			"image": ["jpg", "jpeg", "png", "gif", "svg", "webp"],
			"video": ["mp4", "webm"],
			"audio": ["mp3", "wav", "ogg"],
			"archive": ["zip", "gz", "tar", "rar"],
		}
		if file_type in type_map:
			filters["extension"] = ["in", type_map[file_type]]
		else:
			filters["extension"] = file_type

	if date_from:
		filters["creation"] = [">=", date_from]

	if date_to:
		if "creation" in filters:
			filters["creation"] = ["between", [date_from, date_to]]
		else:
			filters["creation"] = ["<=", date_to]

	if owner:
		filters["uploaded_by"] = owner

	if folder:
		filters["folder"] = folder

	files = frappe.get_all(
		"Drive File",
		filters=filters,
		fields=["name", "file_name", "file_url", "file_size", "mime_type",
				"extension", "folder", "uploaded_by", "is_private",
				"version", "creation", "modified"],
		order_by="modified desc",
		limit=limit,
		limit_start=start,
	)

	# Filter by tags if specified
	if tags:
		tag_list = [t.strip() for t in tags.split(",") if t.strip()]
		if tag_list:
			tagged_files = frappe.get_all(
				"Drive File Tag",
				filters={"drive_tag": ["in", tag_list]},
				fields=["parent"],
				distinct=True,
			)
			tagged_names = {t.parent for t in tagged_files}
			files = [f for f in files if f.name in tagged_names]

	return files
