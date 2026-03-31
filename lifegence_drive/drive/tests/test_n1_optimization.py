"""Tests for N+1 query optimization in share, favorite, and trash listing APIs."""

import frappe
from frappe.tests.utils import FrappeTestCase
from unittest.mock import patch

from lifegence_drive.drive.api.share import get_shared_with_me
from lifegence_drive.drive.api.favorite import get_favorites
from lifegence_drive.drive.api.trash import get_trash


class TestShareBatchFetch(FrappeTestCase):
	"""Test that get_shared_with_me uses batch fetching."""

	def setUp(self):
		# Create multiple files for batch testing
		self.files = []
		for i in range(3):
			f = frappe.get_doc({
				"doctype": "Drive File",
				"file_name": f"share-batch-{i}.pdf",
				"extension": "pdf",
				"file_size": 1024 * (i + 1),
			}).insert(ignore_permissions=True)
			self.files.append(f)

		# Create a folder
		self.folder = frappe.get_doc({
			"doctype": "Drive Folder",
			"folder_name": "share-batch-folder",
		}).insert(ignore_permissions=True)

		# Share all items with current user
		for f in self.files:
			frappe.get_doc({
				"doctype": "Drive Share",
				"shared_doctype": "Drive File",
				"shared_name": f.name,
				"shared_with": frappe.session.user,
				"permission_level": "View",
			}).insert(ignore_permissions=True)

		frappe.get_doc({
			"doctype": "Drive Share",
			"shared_doctype": "Drive Folder",
			"shared_name": self.folder.name,
			"shared_with": frappe.session.user,
			"permission_level": "Edit",
		}).insert(ignore_permissions=True)

	def test_returns_all_shared_items(self):
		result = get_shared_with_me()
		names = {r["name"] for r in result}
		for f in self.files:
			self.assertIn(f.name, names)
		self.assertIn(self.folder.name, names)

	def test_file_items_have_correct_type(self):
		result = get_shared_with_me()
		file_items = [r for r in result if r["_type"] == "file"]
		self.assertEqual(len(file_items), 3)
		for item in file_items:
			self.assertIn("file_name", item)
			self.assertIn("file_size", item)
			self.assertEqual(item["permission_level"], "View")

	def test_folder_items_have_correct_type(self):
		result = get_shared_with_me()
		folder_items = [r for r in result if r["_type"] == "folder"]
		self.assertEqual(len(folder_items), 1)
		self.assertEqual(folder_items[0]["folder_name"], "share-batch-folder")
		self.assertEqual(folder_items[0]["permission_level"], "Edit")

	def test_skips_deleted_originals(self):
		"""Items whose originals were deleted should be silently skipped."""
		# Delete one file directly (simulating deletion without cleanup)
		frappe.delete_doc("Drive File", self.files[0].name, ignore_permissions=True, force=True)
		result = get_shared_with_me()
		names = {r["name"] for r in result}
		self.assertNotIn(self.files[0].name, names)
		# Other items still present
		self.assertIn(self.files[1].name, names)
		self.assertIn(self.files[2].name, names)

	def test_uses_batch_queries(self):
		"""Verify batch fetching is used (no individual db.exists or db.get_value per item)."""
		original_get_all = frappe.get_all
		get_all_calls = []

		def tracking_get_all(*args, **kwargs):
			get_all_calls.append((args, kwargs))
			return original_get_all(*args, **kwargs)

		with patch.object(frappe, "get_all", side_effect=tracking_get_all):
			get_shared_with_me()

		# Should be exactly 3 get_all calls: 1 for shares, 1 for files batch, 1 for folders batch
		self.assertEqual(len(get_all_calls), 3)

	def tearDown(self):
		frappe.db.rollback()


class TestFavoriteBatchFetch(FrappeTestCase):
	"""Test that get_favorites uses batch fetching."""

	def setUp(self):
		self.files = []
		for i in range(3):
			f = frappe.get_doc({
				"doctype": "Drive File",
				"file_name": f"fav-batch-{i}.pdf",
				"extension": "pdf",
				"file_size": 512 * (i + 1),
			}).insert(ignore_permissions=True)
			self.files.append(f)

		self.folder = frappe.get_doc({
			"doctype": "Drive Folder",
			"folder_name": "fav-batch-folder",
		}).insert(ignore_permissions=True)

		# Favorite all items
		for f in self.files:
			frappe.get_doc({
				"doctype": "Drive Favorite",
				"favorited_doctype": "Drive File",
				"favorited_name": f.name,
				"user": frappe.session.user,
			}).insert(ignore_permissions=True)

		frappe.get_doc({
			"doctype": "Drive Favorite",
			"favorited_doctype": "Drive Folder",
			"favorited_name": self.folder.name,
			"user": frappe.session.user,
		}).insert(ignore_permissions=True)

	def test_returns_all_favorites(self):
		result = get_favorites()
		names = {r["name"] for r in result}
		for f in self.files:
			self.assertIn(f.name, names)
		self.assertIn(self.folder.name, names)

	def test_file_favorites_have_details(self):
		result = get_favorites()
		file_items = [r for r in result if r["_type"] == "file"]
		self.assertEqual(len(file_items), 3)
		for item in file_items:
			self.assertIn("file_name", item)
			self.assertIn("creation", item)

	def test_skips_deleted_originals(self):
		frappe.delete_doc("Drive File", self.files[0].name, ignore_permissions=True, force=True)
		result = get_favorites()
		names = {r["name"] for r in result}
		self.assertNotIn(self.files[0].name, names)
		self.assertIn(self.files[1].name, names)

	def test_uses_batch_queries(self):
		original_get_all = frappe.get_all
		get_all_calls = []

		def tracking_get_all(*args, **kwargs):
			get_all_calls.append((args, kwargs))
			return original_get_all(*args, **kwargs)

		with patch.object(frappe, "get_all", side_effect=tracking_get_all):
			get_favorites()

		# 1 for favorites list, 1 for files batch, 1 for folders batch
		self.assertEqual(len(get_all_calls), 3)

	def tearDown(self):
		frappe.db.rollback()


class TestTrashBatchFetch(FrappeTestCase):
	"""Test that get_trash uses batch fetching."""

	def setUp(self):
		self.files = []
		for i in range(3):
			f = frappe.get_doc({
				"doctype": "Drive File",
				"file_name": f"trash-batch-{i}.pdf",
				"extension": "pdf",
				"file_size": 2048 * (i + 1),
				"mime_type": "application/pdf",
			}).insert(ignore_permissions=True)
			self.files.append(f)

		self.folder = frappe.get_doc({
			"doctype": "Drive Folder",
			"folder_name": "trash-batch-folder",
		}).insert(ignore_permissions=True)

		# Create trash entries
		for f in self.files:
			frappe.get_doc({
				"doctype": "Drive Trash",
				"original_doctype": "Drive File",
				"original_name": f.name,
				"deleted_by": frappe.session.user,
			}).insert(ignore_permissions=True)

		frappe.get_doc({
			"doctype": "Drive Trash",
			"original_doctype": "Drive Folder",
			"original_name": self.folder.name,
			"deleted_by": frappe.session.user,
		}).insert(ignore_permissions=True)

	def test_enriches_file_details(self):
		result = get_trash()
		file_items = [r for r in result if r.original_doctype == "Drive File"]
		self.assertEqual(len(file_items), 3)
		for item in file_items:
			self.assertIn("file_name", item)
			self.assertIn("file_size", item)

	def test_enriches_folder_details(self):
		result = get_trash()
		folder_items = [r for r in result if r.original_doctype == "Drive Folder"]
		self.assertEqual(len(folder_items), 1)
		self.assertEqual(folder_items[0].get("folder_name"), "trash-batch-folder")

	def test_handles_deleted_originals(self):
		"""When originals are deleted, trash items remain but without enrichment."""
		frappe.delete_doc("Drive File", self.files[0].name, ignore_permissions=True, force=True)
		result = get_trash()
		# Trash entry still present
		trash_for_deleted = [r for r in result if r.original_name == self.files[0].name]
		self.assertEqual(len(trash_for_deleted), 1)
		# But no enrichment (file_name not added)
		self.assertNotIn("file_name", trash_for_deleted[0])

	def test_uses_batch_queries(self):
		original_get_all = frappe.get_all
		get_all_calls = []

		def tracking_get_all(*args, **kwargs):
			get_all_calls.append((args, kwargs))
			return original_get_all(*args, **kwargs)

		with patch.object(frappe, "get_all", side_effect=tracking_get_all):
			get_trash()

		# 1 for trash list, 1 for files batch, 1 for folders batch
		self.assertEqual(len(get_all_calls), 3)

	def tearDown(self):
		frappe.db.rollback()
