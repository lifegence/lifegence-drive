import frappe


def get_context(context):
	"""SPA entry point — must NOT be server-cached.

	drive_app.html embeds the current session's ``csrf_token`` (and the boot
	dict). Without ``no_cache``, Frappe's website cache serves a Guest copy to
	authenticated users → CSRFTokenError on every API call.

	The ``site_name`` alias and csrf_token injection happen in
	``lifegence_drive.boot.update_website_context`` (registered as a hook), which
	runs AFTER Frappe builds the default boot dict so the alias survives.
	"""
	context.no_cache = 1
	context.show_sidebar = False
