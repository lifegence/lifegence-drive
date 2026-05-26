import frappe


def get_context(context):
	"""SPA entry point — must NOT be server-cached.

	The HTML includes ``window.csrf_token = "{{ csrf_token }}"`` rendered
	from the current session. Without ``no_cache``, Frappe's website cache
	serves a Guest-rendered copy (with Guest's csrf_token) to authenticated
	users, so every POST from the SPA raises CSRFTokenError.
	"""
	context.no_cache = 1
	context.show_sidebar = False
