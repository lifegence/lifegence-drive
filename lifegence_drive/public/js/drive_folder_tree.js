frappe.provide("frappe.treeview_settings");

frappe.treeview_settings["Drive Folder"] = {
	get_tree_nodes: "lifegence_drive.drive.api.folder.get_tree_children",
	root_label: "Drive",
	get_label: function (node) {
		if (node.data && node.data.is_file) {
			return get_file_icon_html(node.data.title) + " " + node.data.title;
		}
		return node.data ? node.data.title || node.data.value : node.label;
	},
	onrender: function (node) {
		if (node.data && node.data.is_file) {
			// Make file nodes clickable to open Drive File form
			node.is_leaf = true;
			node.$tree_link &&
				node.$tree_link.off("click").on("click", function () {
					frappe.set_route("Form", "Drive File", node.data.file_name);
				});
		}
	},
	toolbar: [
		{
			label: __("View"),
			condition: function (node) {
				return node.data && node.data.is_file;
			},
			click: function (node) {
				frappe.set_route("Form", "Drive File", node.data.file_name);
			},
			btnClass: "hidden-xs",
		},
	],
};

function get_file_icon_html(filename) {
	var ext = (filename || "").split(".").pop().toLowerCase();
	var icon_map = {
		jpg: "image", jpeg: "image", png: "image", gif: "image", svg: "image", webp: "image",
		pdf: "file",
		json: "file", xml: "file", csv: "file", txt: "file", md: "file", log: "file",
		doc: "file", docx: "file", xls: "file", xlsx: "file",
		zip: "file", gz: "file",
		mp4: "file", mp3: "file",
	};
	var icon = icon_map[ext] || "file";
	return '<span class="text-muted"><svg class="icon icon-sm"><use href="#icon-' + icon + '"></use></svg></span>';
}
