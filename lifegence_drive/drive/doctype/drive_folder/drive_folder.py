import frappe
from frappe.utils.nestedset import NestedSet


class DriveFolder(NestedSet):
	nsm_parent_field = "parent_folder"
