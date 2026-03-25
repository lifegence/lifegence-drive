app_name = "lifegence_drive"
app_title = "Lifegence Drive"
app_publisher = "Lifegence"
app_description = "File sharing for Lifegence Company OS"
app_email = "info@lifegence.co.jp"
app_license = "mit"

required_apps = ["frappe"]

export_python_type_annotations = True

after_install = "lifegence_drive.install.after_install"

add_to_apps_screen = [
	{
		"name": "lifegence_drive",
		"logo": "/assets/lifegence_drive/images/drive-logo.svg",
		"title": "ドライブ",
		"route": "/app/drive-file",
	},
]

scheduler_events = {
	"daily": [
		"lifegence_drive.drive.services.trash_service.auto_delete_expired_trash",
	],
}

doctype_tree_js = {
	"Drive Folder": "public/js/drive_folder_tree.js",
}

fixtures = [
	"Drive Settings",
]

# Guest-accessible web pages
website_route_rules = [
	{"from_route": "/drive-download", "to_route": "drive_download"},
]

guest_pages = ["drive-download"]
