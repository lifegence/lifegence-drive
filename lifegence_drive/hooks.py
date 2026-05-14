app_name = "lifegence_drive"
app_title = "Lifegence Drive"
app_publisher = "Lifegence"
app_description = "File sharing for Lifegence Company OS"
app_email = "info@lifegence.co.jp"
app_license = "mit"

required_apps = ["frappe"]

export_python_type_annotations = True

after_install = "lifegence_drive.install.after_install"

# Expose csrf_token (and user) to the Vue SPA:
# - update_website_context: puts csrf_token on the jinja render context so
#   drive_app.html can emit `window.csrf_token = "{{ csrf_token }}"`.
# - boot_session: also lifts csrf_token + user.name into the boot dict so
#   frappe-ui's jinjaBootData expands them as window.csrf_token / window.user.
update_website_context = "lifegence_drive.boot.update_website_context"
boot_session = "lifegence_drive.boot.boot_session"

add_to_apps_screen = [
	{
		"name": "lifegence_drive",
		"logo": "/assets/lifegence_drive/images/drive-logo.svg",
		"title": "ドライブ",
		"route": "/drive_app",
	},
]

scheduler_events = {
	"daily": [
		"lifegence_drive.drive.services.trash_service.auto_delete_expired_trash",
	],
}

fixtures = [
	"Drive Settings",
]

# Guest-accessible web pages
website_route_rules = [
	{"from_route": "/drive-download", "to_route": "drive_download"},
	# Vue 3 SPA — the single entry point for the drive UI
	{"from_route": "/drive_app", "to_route": "drive_app"},
	{"from_route": "/drive_app/<path:path>", "to_route": "drive_app"},
]

guest_pages = ["drive-download"]
