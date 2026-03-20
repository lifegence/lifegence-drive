import frappe
from frappe.tests.utils import FrappeTestCase

from lifegence_drive.drive.services.thumbnail_service import get_file_icon_class


class TestDriveFileVersionDocType(FrappeTestCase):
	def test_create_version(self):
		"""A Drive File Version can be created and linked to a file."""
		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "version-test.pdf",
			"file_url": "/files/version-test.pdf",
			"extension": "pdf",
			"file_size": 1024,
		}).insert(ignore_permissions=True)

		version = frappe.get_doc({
			"doctype": "Drive File Version",
			"drive_file": drive_file.name,
			"version_number": 1,
			"file_url": "/files/version-test-v1.pdf",
			"file_size": 1024,
			"uploaded_by": "Administrator",
			"comment": "Initial version",
		}).insert(ignore_permissions=True)

		self.assertTrue(version.name)
		self.assertEqual(version.drive_file, drive_file.name)
		self.assertEqual(version.version_number, 1)

	def test_multiple_versions(self):
		"""Multiple versions can be created for the same file."""
		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "multi-ver.pdf",
			"file_url": "/files/multi-ver.pdf",
			"extension": "pdf",
			"file_size": 2048,
			"version": 3,
		}).insert(ignore_permissions=True)

		for i in range(1, 3):
			frappe.get_doc({
				"doctype": "Drive File Version",
				"drive_file": drive_file.name,
				"version_number": i,
				"file_url": f"/files/multi-ver-v{i}.pdf",
				"file_size": 1024 * i,
				"uploaded_by": "Administrator",
			}).insert(ignore_permissions=True)

		versions = frappe.get_all(
			"Drive File Version",
			filters={"drive_file": drive_file.name},
		)
		self.assertEqual(len(versions), 2)

	def tearDown(self):
		frappe.db.rollback()


class TestVersionAPI(FrappeTestCase):
	def test_get_versions_includes_current(self):
		"""get_versions should include the current version as first entry."""
		from lifegence_drive.drive.api.version import get_versions

		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "get-ver-test.pdf",
			"file_url": "/files/get-ver-test.pdf",
			"extension": "pdf",
			"file_size": 1024,
			"version": 2,
		}).insert(ignore_permissions=True)

		frappe.get_doc({
			"doctype": "Drive File Version",
			"drive_file": drive_file.name,
			"version_number": 1,
			"file_url": "/files/get-ver-test-v1.pdf",
			"file_size": 512,
			"uploaded_by": "Administrator",
		}).insert(ignore_permissions=True)

		versions = get_versions(drive_file.name)
		self.assertEqual(len(versions), 2)
		self.assertTrue(versions[0].get("is_current"))
		self.assertEqual(versions[0]["version_number"], 2)
		self.assertEqual(versions[1]["version_number"], 1)

	def test_restore_version(self):
		"""Restoring a version should save current and update file."""
		from lifegence_drive.drive.api.version import restore_version

		drive_file = frappe.get_doc({
			"doctype": "Drive File",
			"file_name": "restore-test.pdf",
			"file_url": "/files/restore-v2.pdf",
			"extension": "pdf",
			"file_size": 2048,
			"version": 2,
		}).insert(ignore_permissions=True)

		old_version = frappe.get_doc({
			"doctype": "Drive File Version",
			"drive_file": drive_file.name,
			"version_number": 1,
			"file_url": "/files/restore-v1.pdf",
			"file_size": 1024,
			"uploaded_by": "Administrator",
		}).insert(ignore_permissions=True)

		restored = restore_version(drive_file.name, old_version.name)
		self.assertEqual(restored.file_url, "/files/restore-v1.pdf")
		self.assertEqual(restored.version, 3)

		# Should have created a version record for the old current
		all_versions = frappe.get_all(
			"Drive File Version",
			filters={"drive_file": drive_file.name},
		)
		self.assertEqual(len(all_versions), 2)

	def tearDown(self):
		frappe.db.rollback()


class TestThumbnailService(FrappeTestCase):
	def test_icon_class_for_pdf(self):
		self.assertEqual(get_file_icon_class("pdf"), "fa-file-pdf")

	def test_icon_class_for_image(self):
		self.assertEqual(get_file_icon_class("jpg"), "fa-file-image")
		self.assertEqual(get_file_icon_class("PNG"), "fa-file-image")

	def test_icon_class_for_unknown(self):
		self.assertEqual(get_file_icon_class("xyz"), "fa-file")
		self.assertEqual(get_file_icon_class(""), "fa-file")

	def test_icon_class_for_code(self):
		self.assertEqual(get_file_icon_class("py"), "fa-file-code")
		self.assertEqual(get_file_icon_class("js"), "fa-file-code")
