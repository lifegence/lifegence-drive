"""Web page context + boot extensions for the Vue SPA.

frappe-ui's vite plugin emits an HTML preamble that iterates the `boot`
dict and assigns each entry to `window[key]`. The default Frappe
`get_bootinfo()` payload does not include `csrf_token`, so authenticated
POSTs from the SPA had no `X-Frappe-CSRF-Token` and were rejected.

We expose csrf_token via two paths:

1. `update_website_context` puts csrf_token on the jinja render context
   so the index.html template can emit `window.csrf_token = "{{ csrf_token }}"`.
2. `boot_session` also pushes it (and user.name) into the boot dict for
   authenticated sessions, so SPA code can read window.csrf_token /
   window.user without hitting a second API.
"""

import frappe


def update_website_context(context):
	"""Expose csrf_token to the web page jinja context.

	`frappe.local.csrf_token` may be None for guest sessions; coerce to ""
	so the template renders a clean empty string rather than "None".
	"""
	token = getattr(frappe.local, "csrf_token", None) if frappe.local else None
	context.csrf_token = token or ""


def boot_session(bootinfo):
	"""Expose csrf_token (and user) on the SPA-visible boot dict."""
	if frappe.local and getattr(frappe.local, "csrf_token", None):
		bootinfo["csrf_token"] = frappe.local.csrf_token
	if frappe.session and frappe.session.user:
		bootinfo.setdefault("user", {})
		bootinfo["user"]["name"] = frappe.session.user
