import frappe

from lifegence_drive.drive.services.permission_service import (
	get_accessible_file_names,
	get_accessible_folder_names,
)


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
	"""Search Drive Files and Drive Folders with various filters.

	Returns
	-------
	dict
		{
		    "files":   [Drive File rows with `folder_name` attached],
		    "folders": [Drive Folder rows matching the query],
		}
	"""
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
		fields=[
			"name",
			"file_name",
			"file_url",
			"file_size",
			"mime_type",
			"extension",
			"folder",
			"uploaded_by",
			"is_private",
			"version",
			"creation",
			"modified",
		],
		order_by="modified desc",
		limit=limit,
		limit_start=start,
	)

	# Permission filter: only show files the user can access
	accessible = get_accessible_file_names()
	files = [f for f in files if f.name in accessible]

	# Tag filter
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

	# Attach folder_name for each file (single round-trip)
	folder_ids = {f.folder for f in files if f.folder}
	folder_name_map: dict[str, str] = {}
	if folder_ids:
		for row in frappe.get_all(
			"Drive Folder",
			filters={"name": ["in", list(folder_ids)]},
			fields=["name", "folder_name"],
		):
			folder_name_map[row.name] = row.folder_name
	for f in files:
		f["folder_name"] = folder_name_map.get(f.folder) if f.folder else None

	# Folder search (skip when user is narrowing by other Drive-File-only
	# filters like file_type / owner / tags / folder)
	folders: list[dict] = []
	if query and not any([file_type, owner, tags, folder]):
		trashed_folders = set(
			frappe.get_all(
				"Drive Trash",
				filters={"original_doctype": "Drive Folder"},
				pluck="original_name",
			)
		)
		folder_filters = {"folder_name": ["like", f"%{query}%"]}
		if trashed_folders:
			folder_filters["name"] = ["not in", list(trashed_folders)]
		folders = frappe.get_all(
			"Drive Folder",
			filters=folder_filters,
			fields=[
				"name",
				"folder_name",
				"parent_folder",
				"is_private",
				"created_by",
				"creation",
				"modified",
			],
			order_by="modified desc",
			limit=limit,
		)
		# Row-level access: drop folders the user neither owns nor was shared.
		accessible_folders = get_accessible_folder_names()
		folders = [f for f in folders if f.name in accessible_folders]

		# Also enrich each folder with its parent's name for breadcrumb display
		parent_ids = {f.parent_folder for f in folders if f.parent_folder}
		parent_name_map: dict[str, str] = {}
		if parent_ids:
			for row in frappe.get_all(
				"Drive Folder",
				filters={"name": ["in", list(parent_ids)]},
				fields=["name", "folder_name"],
			):
				parent_name_map[row.name] = row.folder_name
		for f in folders:
			f["parent_folder_name"] = parent_name_map.get(f.parent_folder) if f.parent_folder else None

	return {"files": files, "folders": folders}
