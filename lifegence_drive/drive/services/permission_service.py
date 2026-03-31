import frappe


def get_accessible_file_names(user: str | None = None) -> set[str]:
    """Get set of Drive File names accessible to the user (owned + shared)."""
    user = user or frappe.session.user
    if user == "Administrator":
        return set(frappe.get_all("Drive File", pluck="name"))

    owned = set(frappe.get_all(
        "Drive File",
        filters={"uploaded_by": user},
        pluck="name",
    ))
    shared = set(frappe.get_all(
        "Drive Share",
        filters={"shared_with": user, "shared_doctype": "Drive File"},
        pluck="shared_name",
    ))
    return owned | shared


def can_manage_file(user: str | None, name: str) -> bool:
    """Check if user is the file owner (can share/delete/rename)."""
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    owner = frappe.db.get_value("Drive File", name, "uploaded_by")
    return owner == user


def can_view_file(user: str | None, name: str) -> bool:
    """Check if user owns OR has been shared the file."""
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    owner = frappe.db.get_value("Drive File", name, "uploaded_by")
    if owner == user:
        return True
    return frappe.db.exists("Drive Share", {
        "shared_with": user,
        "shared_doctype": "Drive File",
        "shared_name": name,
    })


def can_manage_folder(user: str | None, name: str) -> bool:
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    creator = frappe.db.get_value("Drive Folder", name, "created_by")
    return creator == user


def can_view_folder(user: str | None, name: str) -> bool:
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    if can_manage_folder(user, name):
        return True
    return frappe.db.exists("Drive Share", {"shared_with": user, "shared_doctype": "Drive Folder", "shared_name": name})


def check_manage_permission(doctype: str, name: str, user: str | None = None):
    from frappe import _
    user = user or frappe.session.user
    if doctype == "Drive File":
        if not can_manage_file(user, name):
            frappe.throw(_("You don't have permission to modify this file."), frappe.PermissionError)
    elif doctype == "Drive Folder":
        if not can_manage_folder(user, name):
            frappe.throw(_("You don't have permission to modify this folder."), frappe.PermissionError)


def check_view_permission(doctype: str, name: str, user: str | None = None):
    from frappe import _
    user = user or frappe.session.user
    if doctype == "Drive File":
        if not can_view_file(user, name):
            frappe.throw(_("You don't have permission to view this file."), frappe.PermissionError)
    elif doctype == "Drive Folder":
        if not can_view_folder(user, name):
            frappe.throw(_("You don't have permission to view this folder."), frappe.PermissionError)
