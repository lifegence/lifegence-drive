import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate


class TestDriveSettingsDefaults(FrappeTestCase):
	def test_drive_settings_defaults(self):
		"""Drive Settings singleton should have sensible default values."""
		settings = frappe.get_single("Drive Settings")
		self.assertIsNotNone(settings)
		# Defaults from JSON
		self.assertEqual(settings.meta.get_field("max_file_size_mb").default, "100")
		self.assertEqual(settings.meta.get_field("max_storage_gb").default, "10")
		self.assertEqual(settings.meta.get_field("trash_retention_days").default, "30")
		self.assertEqual(settings.meta.get_field("enable_versioning").default, "1")


class TestDriveFolderCreation(FrappeTestCase):
	def test_drive_folder_creation(self):
		"""A Drive Folder can be created and persisted."""
		folder = frappe.get_doc({
			"doctype": "Drive Folder",
			"folder_name": "Test Root Folder",
		}).insert(ignore_permissions=True)

		self.assertTrue(folder.name)
		self.assertEqual(folder.folder_name, "Test Root Folder")
		self.assertIsNotNone(folder.lft)
		self.assertIsNotNone(folder.rgt)

	def tearDown(self):
		frappe.db.rollback()


class TestDriveFileCreation(FrappeTestCase):
	def test_drive_file_creation(self):
		"""A Drive File can be created and linked to a folder."""
		folder = frappe.get_doc({
			"doctype": "Drive Folder",
			"folder_name": "File Test Folder",
		}).insert(ignore_permissions=True)

		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "test-document.pdf",
			"folder": folder.name,
			"mime_type": "application/pdf",
			"extension": "pdf",
			"file_size": 12345,
		}).insert(ignore_permissions=True)

		self.assertTrue(drive_file.name)
		self.assertEqual(drive_file.file_name, "test-document.pdf")
		self.assertEqual(drive_file.folder, folder.name)
		self.assertEqual(drive_file.version, 1)

	def tearDown(self):
		frappe.db.rollback()


class TestDriveShareCreation(FrappeTestCase):
	def test_drive_share_creation(self):
		"""A Drive Share can be created between a file and a user."""
		folder = frappe.get_doc({
			"doctype": "Drive Folder",
			"folder_name": "Share Test Folder",
		}).insert(ignore_permissions=True)

		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "shared-file.docx",
			"folder": folder.name,
		}).insert(ignore_permissions=True)

		share = frappe.get_doc({
			"doctype": "Drive Share",
			"shared_doctype": "Drive File",
			"shared_name": drive_file.name,
			"shared_with": "Administrator",
			"permission_level": "Edit",
		}).insert(ignore_permissions=True)

		self.assertTrue(share.name)
		self.assertEqual(share.shared_with, "Administrator")
		self.assertEqual(share.permission_level, "Edit")

	def tearDown(self):
		frappe.db.rollback()


class TestDriveFavoriteToggle(FrappeTestCase):
	def test_drive_favorite_toggle(self):
		"""A Drive Favorite can be created and then deleted (toggle)."""
		folder = frappe.get_doc({
			"doctype": "Drive Folder",
			"folder_name": "Favorite Test Folder",
		}).insert(ignore_permissions=True)

		fav = frappe.get_doc({
			"doctype": "Drive Favorite",
			"favorited_doctype": "Drive Folder",
			"favorited_name": folder.name,
			"user": "Administrator",
		}).insert(ignore_permissions=True)

		self.assertTrue(fav.name)
		fav_name = fav.name

		# Toggle off: delete the favorite
		frappe.delete_doc("Drive Favorite", fav_name, ignore_permissions=True)
		self.assertFalse(frappe.db.exists("Drive Favorite", fav_name))

	def tearDown(self):
		frappe.db.rollback()


class TestDriveTagCreation(FrappeTestCase):
	def test_drive_tag_creation(self):
		"""A Drive Tag can be created with a unique name and color."""
		tag = frappe.get_doc({
			"doctype": "Drive Tag",
			"tag_name": "Important",
			"color": "#e74c3c",
		}).insert(ignore_permissions=True)

		self.assertEqual(tag.name, "Important")
		self.assertEqual(tag.color, "#e74c3c")

	def tearDown(self):
		frappe.db.rollback()


class TestDriveTrashAndRestore(FrappeTestCase):
	def test_drive_trash_and_restore(self):
		"""A Drive Trash record can be created to track deleted items."""
		folder = frappe.get_doc({
			"doctype": "Drive Folder",
			"folder_name": "Trash Test Folder",
		}).insert(ignore_permissions=True)

		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "to-be-deleted.txt",
			"folder": folder.name,
		}).insert(ignore_permissions=True)

		trash = frappe.get_doc({
			"doctype": "Drive Trash",
			"original_doctype": "Drive File",
			"original_name": drive_file.name,
			"deleted_by": "Administrator",
			"original_folder": folder.name,
			"expires_on": add_days(nowdate(), 30),
		}).insert(ignore_permissions=True)

		self.assertTrue(trash.name)
		self.assertEqual(trash.original_doctype, "Drive File")
		self.assertEqual(trash.original_name, drive_file.name)
		self.assertIsNotNone(trash.deleted_on)

		# Simulate restore by deleting trash record
		trash_name = trash.name
		frappe.delete_doc("Drive Trash", trash_name, ignore_permissions=True)
		self.assertFalse(frappe.db.exists("Drive Trash", trash_name))

	def tearDown(self):
		frappe.db.rollback()
