import frappe
from frappe.tests.utils import FrappeTestCase

from lifegence_drive.drive.services.storage_service import (
	get_storage_info,
	get_storage_usage,
	validate_extension,
	validate_file_size,
)


class TestStorageService(FrappeTestCase):
	def test_get_storage_usage_returns_int(self):
		usage = get_storage_usage()
		self.assertIsInstance(usage, int)

	def test_get_storage_info_keys(self):
		info = get_storage_info()
		self.assertIn("used", info)
		self.assertIn("limit", info)
		self.assertIn("remaining", info)
		self.assertIn("used_percent", info)

	def test_validate_file_size_within_limit(self):
		# Should not raise for small file
		validate_file_size(1024)

	def test_validate_file_size_exceeds_limit(self):
		# Default max is 100MB
		with self.assertRaises(frappe.ValidationError):
			validate_file_size(200 * 1024 * 1024)

	def test_validate_extension_allowed(self):
		self._ensure_allowed_extensions()
		validate_extension("pdf")

	def test_validate_extension_not_allowed(self):
		self._ensure_allowed_extensions()
		with self.assertRaises(frappe.ValidationError):
			validate_extension("exe")

	def _ensure_allowed_extensions(self):
		settings = frappe.get_single("Drive Settings")
		if not settings.allowed_extensions:
			settings.allowed_extensions = "pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,jpg,jpeg,png,gif,svg,mp4,mp3,zip"
			settings.save(ignore_permissions=True)

	def tearDown(self):
		frappe.db.rollback()


class TestDriveFileController(FrappeTestCase):
	def test_file_size_validation_on_insert(self):
		"""DriveFile.before_insert should reject oversized files."""
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc({
				"doctype": "Drive File",
				"file_name": "huge.pdf",
				"file_size": 200 * 1024 * 1024,
				"extension": "pdf",
			}).insert(ignore_permissions=True)

	def test_extension_validation_on_insert(self):
		"""DriveFile.before_insert should reject disallowed extensions."""
		settings = frappe.get_single("Drive Settings")
		if not settings.allowed_extensions:
			settings.allowed_extensions = "pdf,doc,docx,txt,csv,jpg,png"
			settings.save(ignore_permissions=True)
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc({
				"doctype": "Drive File",
				"file_name": "malware.exe",
				"file_size": 1024,
				"extension": "exe",
			}).insert(ignore_permissions=True)

	def test_activity_logged_on_insert(self):
		"""Inserting a Drive File should create an Upload activity."""
		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "activity-test.pdf",
			"file_size": 1024,
			"extension": "pdf",
			"mime_type": "application/pdf",
		}).insert(ignore_permissions=True)

		activities = frappe.get_all(
			"Drive Activity",
			filters={"target_doctype": "Drive File", "target_name": drive_file.name, "action": "Upload"},
		)
		self.assertTrue(len(activities) > 0)

	def tearDown(self):
		frappe.db.rollback()


class TestFolderAPI(FrappeTestCase):
	def test_create_folder(self):
		from lifegence_drive.drive.api.folder import create
		folder = create(folder_name="API Test Folder")
		self.assertTrue(folder.name)
		self.assertEqual(folder.folder_name, "API Test Folder")

	def test_create_nested_folder(self):
		from lifegence_drive.drive.api.folder import create
		parent = create(folder_name="Parent")
		child = create(folder_name="Child", parent_folder=parent.name)
		self.assertEqual(child.parent_folder, parent.name)

	def test_get_breadcrumb(self):
		from lifegence_drive.drive.api.folder import create, get_breadcrumb
		root = create(folder_name="Root")
		mid = create(folder_name="Mid", parent_folder=root.name)
		leaf = create(folder_name="Leaf", parent_folder=mid.name)

		breadcrumb = get_breadcrumb(leaf.name)
		self.assertEqual(len(breadcrumb), 3)
		self.assertEqual(breadcrumb[0]["folder_name"], "Root")
		self.assertEqual(breadcrumb[2]["folder_name"], "Leaf")

	def test_get_contents(self):
		from lifegence_drive.drive.api.folder import create, get_contents
		folder = create(folder_name="Contents Test")

		frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "in-folder.pdf",
			"folder": folder.name,
			"extension": "pdf",
		}).insert(ignore_permissions=True)

		contents = get_contents(folder=folder.name)
		self.assertIn("folders", contents)
		self.assertIn("files", contents)
		self.assertIn("breadcrumb", contents)
		self.assertEqual(len(contents["files"]), 1)

	def tearDown(self):
		frappe.db.rollback()


class TestTrashAPI(FrappeTestCase):
	def test_move_to_trash_and_restore(self):
		from lifegence_drive.drive.api.trash import move_to_trash, restore

		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "trash-test.txt",
			"extension": "txt",
		}).insert(ignore_permissions=True)

		trash = move_to_trash("Drive File", drive_file.name)
		self.assertTrue(trash.name)
		self.assertEqual(trash.original_name, drive_file.name)

		result = restore(trash.name)
		self.assertTrue(result["restored"])
		self.assertFalse(frappe.db.exists("Drive Trash", trash.name))

	def test_move_to_trash_duplicate_prevented(self):
		from lifegence_drive.drive.api.trash import move_to_trash

		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "dup-trash.txt",
			"extension": "txt",
		}).insert(ignore_permissions=True)

		move_to_trash("Drive File", drive_file.name)

		with self.assertRaises(frappe.ValidationError):
			move_to_trash("Drive File", drive_file.name)

	def test_get_trash_list(self):
		from lifegence_drive.drive.api.trash import move_to_trash, get_trash

		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "list-trash.txt",
			"extension": "txt",
		}).insert(ignore_permissions=True)

		move_to_trash("Drive File", drive_file.name)

		items = get_trash()
		self.assertTrue(len(items) > 0)
		matched = [i for i in items if i.original_name == drive_file.name]
		self.assertEqual(len(matched), 1)
		self.assertEqual(matched[0].file_name, "list-trash.txt")

	def tearDown(self):
		frappe.db.rollback()
