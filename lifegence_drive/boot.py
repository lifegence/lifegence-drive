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


def _safe_get_csrf_token() -> str:
	"""Return the current session's csrf_token, generating one if needed.

	`frappe.local.csrf_token` is only set by middleware on actual HTTP
	requests, and even then it can be missing during the very first hit
	of a session. `frappe.sessions.get_csrf_token()` lazily creates and
	persists a token onto the current session — the same helper Frappe
	Desk's own boot relies on.
	"""
	try:
		from frappe.sessions import get_csrf_token

		return get_csrf_token() or ""
	except Exception:
		# Fall back to whatever middleware did stash, if anything.
		token = getattr(frappe.local, "csrf_token", None) if frappe.local else None
		return token or ""


def update_website_context(context):
	"""Expose csrf_token to the web page jinja context."""
	context.csrf_token = _safe_get_csrf_token()


def boot_session(bootinfo):
	"""Expose csrf_token (and user) on the SPA-visible boot dict."""
	token = _safe_get_csrf_token()
	if token:
		bootinfo["csrf_token"] = token
	if frappe.session and frappe.session.user:
		bootinfo.setdefault("user", {})
		bootinfo["user"]["name"] = frappe.session.user
