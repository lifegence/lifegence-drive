"""Bridge between lifegence_core.SaaS Tenant and lifegence_drive.Drive Settings.

When a tenant's quota is reduced via the SaaS console, the Drive Settings
on the *same* site need to follow so that the quota check in
`storage_service.check_quota` enforces the new limit immediately.

This bridge is intentionally one-way (Tenant → Drive Settings). The reverse
direction (Drive admin changing the quota) is a tenant-local override and
is **not** propagated upstream.

Notes
-----
* lifegence_drive only sees this hook firing if SaaS Tenant is installed
  on the current site (Frappe ignores doc_events for missing doctypes).
* The hook is defensive: missing fields, missing Drive Settings, identical
  values all short-circuit so it stays cheap even if every tenant save
  fires through it.
"""

from __future__ import annotations

import frappe


def sync_drive_settings_from_tenant(doc, method=None):
	"""doc_events handler — invoked from `SaaS Tenant.on_update`."""
	if not doc or getattr(doc, "doctype", None) != "SaaS Tenant":
		return

	new_quota = getattr(doc, "max_storage_gb", None)
	if not new_quota:
		return

	try:
		settings = frappe.get_single("Drive Settings")
	except Exception:
		# Drive Settings missing — nothing to sync.
		return

	if int(settings.max_storage_gb or 0) == int(new_quota):
		return

	settings.max_storage_gb = int(new_quota)
	settings.save(ignore_permissions=True)
	frappe.db.commit()
