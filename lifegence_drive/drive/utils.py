# Copyright (c) 2026, Lifegence and contributors
# For license information, please see license.txt


def verify_share_password(password, password_hash, legacy_password):
	"""Verify password against hash (preferred) or legacy plaintext with timing-safe comparison.

	Args:
		password: The password to verify.
		password_hash: Werkzeug-generated password hash (preferred).
		legacy_password: Legacy plaintext password for HMAC comparison.

	Returns:
		True if the password is correct, False otherwise.
	"""
	if not password:
		return False
	if password_hash:
		from werkzeug.security import check_password_hash
		return check_password_hash(password_hash, password)
	if legacy_password:
		import hmac
		return hmac.compare_digest(password.encode(), legacy_password.encode())
	return False
