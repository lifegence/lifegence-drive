import frappe
from frappe import _
from frappe.model.document import Document

from lifegence_drive.drive.services.storage_service import (
	validate_extension,
	validate_file_size,
)


class DriveFile(Document):
	def before_insert(self):
		if self.file_size:
			validate_file_size(self.file_size)
		if self.extension:
			validate_extension(self.extension)

	def after_insert(self):
		from lifegence_drive.drive.services.activity_service import log_activity
		log_activity("Upload", "Drive File", self.name, f"Uploaded {self.file_name}")

	def on_update(self):
		if self.has_value_changed("file_name"):
			from lifegence_drive.drive.services.activity_service import log_activity
			log_activity("Rename", "Drive File", self.name, f"Renamed to {self.file_name}")
		elif self.has_value_changed("folder"):
			from lifegence_drive.drive.services.activity_service import log_activity
			log_activity("Move", "Drive File", self.name, f"Moved to {self.folder or 'root'}")

	def on_trash(self):
		from lifegence_drive.drive.services.activity_service import log_activity
		log_activity("Delete", "Drive File", self.name, f"Deleted {self.file_name}")

	def after_delete(self):
		"""Clean up physical file when Drive File is permanently deleted."""
		if self.file_url:
			frappe_files = frappe.get_all("File", filters={"file_url": self.file_url}, pluck="name")
			for f in frappe_files:
				frappe.delete_doc("File", f, ignore_permissions=True)
