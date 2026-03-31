"""Tests for permission security checks on Drive mutating operations."""
import unittest
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests import IntegrationTestCase

from lifegence_drive.drive.services.permission_service import (
    can_manage_file,
    can_manage_folder,
    can_view_file,
    can_view_folder,
    check_manage_permission,
    check_view_permission,
)


class TestPermissionSecurity(IntegrationTestCase):
    """Verify owner / non-owner / Administrator permission logic."""

    OWNER = "owner@example.com"
    OTHER = "other@example.com"
    FILE_NAME = "TEST-FILE-001"
    FOLDER_NAME = "TEST-FOLDER-001"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Ensure test users exist
        for email in (cls.OWNER, cls.OTHER):
            if not frappe.db.exists("User", email):
                frappe.get_doc({
                    "doctype": "User",
                    "email": email,
                    "first_name": email.split("@")[0],
                    "user_type": "Website User",
                }).insert(ignore_permissions=True)

        # Create test Drive File
        if not frappe.db.exists("Drive File", cls.FILE_NAME):
            frappe.get_doc({
                "doctype": "Drive File",
                "name": cls.FILE_NAME,
                "file_name": "test.txt",
                "file_url": "/files/test.txt",
                "uploaded_by": cls.OWNER,
            }).insert(ignore_permissions=True)

        # Create test Drive Folder
        if not frappe.db.exists("Drive Folder", cls.FOLDER_NAME):
            frappe.get_doc({
                "doctype": "Drive Folder",
                "name": cls.FOLDER_NAME,
                "folder_name": "Test Folder",
                "created_by": cls.OWNER,
            }).insert(ignore_permissions=True)

        frappe.db.commit()

    # ── can_manage_file ──────────────────────────────────────────────

    def test_owner_can_manage_file(self):
        self.assertTrue(can_manage_file(self.OWNER, self.FILE_NAME))

    def test_non_owner_cannot_manage_file(self):
        self.assertFalse(can_manage_file(self.OTHER, self.FILE_NAME))

    def test_admin_can_manage_file(self):
        self.assertTrue(can_manage_file("Administrator", self.FILE_NAME))

    # ── can_manage_folder ────────────────────────────────────────────

    def test_owner_can_manage_folder(self):
        self.assertTrue(can_manage_folder(self.OWNER, self.FOLDER_NAME))

    def test_non_owner_cannot_manage_folder(self):
        self.assertFalse(can_manage_folder(self.OTHER, self.FOLDER_NAME))

    def test_admin_can_manage_folder(self):
        self.assertTrue(can_manage_folder("Administrator", self.FOLDER_NAME))

    # ── can_view_file ────────────────────────────────────────────────

    def test_owner_can_view_file(self):
        self.assertTrue(can_view_file(self.OWNER, self.FILE_NAME))

    def test_non_owner_cannot_view_file_without_share(self):
        self.assertFalse(can_view_file(self.OTHER, self.FILE_NAME))

    def test_admin_can_view_file(self):
        self.assertTrue(can_view_file("Administrator", self.FILE_NAME))

    # ── can_view_folder ──────────────────────────────────────────────

    def test_owner_can_view_folder(self):
        self.assertTrue(can_view_folder(self.OWNER, self.FOLDER_NAME))

    def test_non_owner_cannot_view_folder_without_share(self):
        self.assertFalse(can_view_folder(self.OTHER, self.FOLDER_NAME))

    def test_admin_can_view_folder(self):
        self.assertTrue(can_view_folder("Administrator", self.FOLDER_NAME))

    # ── check_manage_permission (throws) ─────────────────────────────

    def test_check_manage_permission_owner_no_throw(self):
        # Should NOT raise
        check_manage_permission("Drive File", self.FILE_NAME, user=self.OWNER)
        check_manage_permission("Drive Folder", self.FOLDER_NAME, user=self.OWNER)

    def test_check_manage_permission_non_owner_throws(self):
        with self.assertRaises(frappe.PermissionError):
            check_manage_permission("Drive File", self.FILE_NAME, user=self.OTHER)
        with self.assertRaises(frappe.PermissionError):
            check_manage_permission("Drive Folder", self.FOLDER_NAME, user=self.OTHER)

    def test_check_manage_permission_admin_no_throw(self):
        check_manage_permission("Drive File", self.FILE_NAME, user="Administrator")
        check_manage_permission("Drive Folder", self.FOLDER_NAME, user="Administrator")

    # ── check_view_permission (throws) ───────────────────────────────

    def test_check_view_permission_owner_no_throw(self):
        check_view_permission("Drive File", self.FILE_NAME, user=self.OWNER)
        check_view_permission("Drive Folder", self.FOLDER_NAME, user=self.OWNER)

    def test_check_view_permission_non_owner_throws(self):
        with self.assertRaises(frappe.PermissionError):
            check_view_permission("Drive File", self.FILE_NAME, user=self.OTHER)
        with self.assertRaises(frappe.PermissionError):
            check_view_permission("Drive Folder", self.FOLDER_NAME, user=self.OTHER)

    def test_check_view_permission_admin_no_throw(self):
        check_view_permission("Drive File", self.FILE_NAME, user="Administrator")
        check_view_permission("Drive Folder", self.FOLDER_NAME, user="Administrator")
