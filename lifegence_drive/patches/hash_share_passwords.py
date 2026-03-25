import frappe
from werkzeug.security import generate_password_hash


def execute():
	"""Migrate plaintext share link passwords to werkzeug hashes."""
	# Get shares that have a link_password but no password_hash
	shares = frappe.db.sql(
		"""
		SELECT ds.name, dv.password
		FROM `tabDrive Share` ds
		JOIN `__Auth` dv ON dv.doctype = 'Drive Share' AND dv.name = ds.name AND dv.fieldname = 'link_password'
		WHERE dv.password IS NOT NULL AND dv.password != ''
		AND (ds.password_hash IS NULL OR ds.password_hash = '')
		""",
		as_dict=True,
	)

	for share in shares:
		if share.password:
			hashed = generate_password_hash(share.password)
			frappe.db.set_value("Drive Share", share.name, "password_hash", hashed, update_modified=False)
			# Clear the legacy password
			frappe.db.sql(
				"DELETE FROM `__Auth` WHERE doctype = 'Drive Share' AND name = %s AND fieldname = 'link_password'",
				share.name,
			)

	if shares:
		frappe.db.commit()
