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
