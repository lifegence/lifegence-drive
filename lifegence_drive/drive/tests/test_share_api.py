import frappe
from frappe.tests.utils import FrappeTestCase

from lifegence_drive.drive.api.share import (
	create_share,
	generate_link,
	get_shared_with_me,
	get_shares,
	remove_share,
)
from lifegence_drive.drive.api.favorite import toggle, get_favorites
from lifegence_drive.drive.api.search import search


class TestShareAPI(FrappeTestCase):
	def setUp(self):
		self.file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "share-test.pdf",
			"extension": "pdf",
			"file_size": 1024,
		}).insert(ignore_permissions=True)

	def test_create_share(self):
		share = create_share("Drive File", self.file.name, "Administrator", "View")
		self.assertTrue(share.name)
		self.assertEqual(share.permission_level, "View")

	def test_update_share_permission(self):
		create_share("Drive File", self.file.name, "Administrator", "View")
		updated = create_share("Drive File", self.file.name, "Administrator", "Edit")
		self.assertEqual(updated.permission_level, "Edit")

	def test_remove_share(self):
		share = create_share("Drive File", self.file.name, "Administrator", "View")
		result = remove_share(share.name)
		self.assertTrue(result["removed"])
		self.assertFalse(frappe.db.exists("Drive Share", share.name))

	def test_generate_link(self):
		result = generate_link("Drive File", self.file.name)
		self.assertIn("share_link", result)
		self.assertIn("url", result)
		self.assertTrue(len(result["share_link"]) > 0)

	def test_get_shares(self):
		create_share("Drive File", self.file.name, "Administrator", "View")
		shares = get_shares("Drive File", self.file.name)
		self.assertTrue(len(shares) > 0)

	def tearDown(self):
		frappe.db.rollback()


class TestFavoriteAPI(FrappeTestCase):
	def setUp(self):
		self.file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "fav-test.pdf",
			"extension": "pdf",
		}).insert(ignore_permissions=True)

	def test_toggle_favorite_on(self):
		result = toggle("Drive File", self.file.name)
		self.assertTrue(result["favorited"])

	def test_toggle_favorite_off(self):
		toggle("Drive File", self.file.name)
		result = toggle("Drive File", self.file.name)
		self.assertFalse(result["favorited"])

	def test_get_favorites(self):
		toggle("Drive File", self.file.name)
		favs = get_favorites()
		matched = [f for f in favs if f.name == self.file.name]
		self.assertEqual(len(matched), 1)

	def tearDown(self):
		frappe.db.rollback()


class TestSearchAPI(FrappeTestCase):
	def setUp(self):
		self.file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "searchable-document.pdf",
			"extension": "pdf",
			"file_size": 2048,
			"mime_type": "application/pdf",
		}).insert(ignore_permissions=True)

	def test_search_by_name(self):
		results = search(query="searchable")
		matched = [f for f in results if f.name == self.file.name]
		self.assertEqual(len(matched), 1)

	def test_search_by_file_type(self):
		results = search(file_type="document")
		matched = [f for f in results if f.name == self.file.name]
		self.assertEqual(len(matched), 1)

	def test_search_no_results(self):
		results = search(query="nonexistent-xyz-12345")
		self.assertEqual(len(results), 0)

	def tearDown(self):
		frappe.db.rollback()
