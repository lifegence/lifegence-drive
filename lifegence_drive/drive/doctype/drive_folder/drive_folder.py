import frappe
from frappe import _
from frappe.utils.nestedset import NestedSet


class DriveFolder(NestedSet):
	nsm_parent_field = "parent_folder"

	def validate(self):
		if self.parent_folder and self.parent_folder == self.name:
			frappe.throw(_("A folder cannot be its own parent."))

	def on_update(self):
		super().on_update()
		if self.has_value_changed("folder_name"):
			from lifegence_drive.drive.services.activity_service import log_activity
			log_activity("Rename", "Drive Folder", self.name, f"Renamed to {self.folder_name}")

	def on_trash(self):
		# Move child files to root before deleting folder
		child_files = frappe.get_all("Drive File", filters={"folder": self.name}, pluck="name")
		for f in child_files:
			frappe.db.set_value("Drive File", f, "folder", "")

		from lifegence_drive.drive.services.activity_service import log_activity
		log_activity("Delete", "Drive Folder", self.name, f"Deleted folder {self.folder_name}")

		super().on_trash()
