frappe.pages["drive-browser"].on_page_load = function (wrapper) {
	frappe.drive_browser = new DriveBrowser(wrapper);
};

frappe.pages["drive-browser"].on_page_show = function () {
	// Re-navigate to handle URL changes (e.g. back button)
	if (frappe.drive_browser) {
		const folder = frappe.get_route()[1] || null;
		frappe.drive_browser.navigate(folder, true);
	}
};

class DriveBrowser {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Drive"),
			single_column: true,
		});
		this.current_folder = null; // null = root
		this.folder_cache = {}; // name -> {folder_name, parent_folder, children_loaded}
		this.tree_state = {}; // name -> expanded (bool)

		this.page.main.html(frappe.render_template("drive_browser"));
		this.$container = this.page.main.find(".drive-browser-container");
		this.$tree = this.$container.find(".drive-tree");
		this.$items = this.$container.find(".drive-items");
		this.$breadcrumb = this.$container.find(".drive-breadcrumb");

		this.bind_toolbar();
		this.init_tree().then(() => {
			const initial_folder = frappe.get_route()[1] || null;
			this.navigate(initial_folder);
		});
	}

	// ── Toolbar ──────────────────────────────────────────────

	bind_toolbar() {
		this.$container.find(".btn-new-folder").on("click", () => this.create_folder());
		this.$container.find(".btn-upload-file").on("click", () => this.upload_files());
	}

	create_folder() {
		const d = new frappe.ui.Dialog({
			title: __("New Folder"),
			fields: [
				{ fieldname: "folder_name", fieldtype: "Data", label: __("Folder Name"), reqd: 1 },
			],
			primary_action_label: __("Create"),
			primary_action: (values) => {
				frappe.call({
					method: "frappe.client.insert",
					args: {
						doc: {
							doctype: "Drive Folder",
							folder_name: values.folder_name,
							parent_folder: this.current_folder || "",
						},
					},
					callback: (r) => {
						d.hide();
						frappe.show_alert({ message: __("Folder created"), indicator: "green" });
						// Refresh tree & content
						this.refresh_tree_node(this.current_folder);
						this.load_contents(this.current_folder);
					},
				});
			},
		});
		d.show();
	}

	upload_files() {
		const $input = $('<input type="file" multiple style="display:none">');
		$input.on("change", () => {
			const files = $input[0].files;
			if (!files.length) return;

			let completed = 0;
			const total = files.length;
			frappe.show_progress(__("Uploading..."), 0, total);

			Array.from(files).forEach((file) => {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("folder", this.current_folder || "");
				formData.append("is_private", 0);

				const xhr = new XMLHttpRequest();
				xhr.open("POST", "/api/method/lifegence_drive.drive.api.file.upload");
				xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);
				xhr.onload = () => {
					completed++;
					frappe.show_progress(__("Uploading..."), completed, total);
					if (completed === total) {
						frappe.hide_progress();
						frappe.show_alert({ message: __("{0} file(s) uploaded", [total]), indicator: "green" });
						this.load_contents(this.current_folder);
					}
				};
				xhr.onerror = () => {
					completed++;
					if (completed === total) {
						frappe.hide_progress();
						this.load_contents(this.current_folder);
					}
				};
				xhr.send(formData);
			});
		});
		$input.trigger("click");
	}

	// ── Tree ─────────────────────────────────────────────────

	async init_tree() {
		const folders = await this.fetch_all_folders();
		this.build_tree_data(folders);
		this.render_tree();
	}

	fetch_all_folders() {
		return new Promise((resolve) => {
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Drive Folder",
					fields: ["name", "folder_name", "parent_folder"],
					order_by: "folder_name asc",
					limit_page_length: 0,
				},
				callback: (r) => resolve(r.message || []),
			});
		});
	}

	build_tree_data(folders) {
		this.folder_cache = {};
		this.tree_roots = [];
		const children_map = {};

		for (const f of folders) {
			this.folder_cache[f.name] = { ...f, children: [] };
			if (!children_map[f.parent_folder || "__root__"]) {
				children_map[f.parent_folder || "__root__"] = [];
			}
			children_map[f.parent_folder || "__root__"].push(f.name);
		}

		// Link children
		for (const [parent, child_names] of Object.entries(children_map)) {
			if (parent === "__root__") {
				this.tree_roots = child_names;
			} else if (this.folder_cache[parent]) {
				this.folder_cache[parent].children = child_names;
			}
		}
	}

	render_tree() {
		this.$tree.empty();

		// Root item
		const $root = $(`<div class="drive-tree-label ${!this.current_folder ? "selected" : ""}" data-folder="">
			<span class="tree-toggle"></span>
			<i class="fa fa-hdd tree-icon" style="color: var(--text-muted);"></i>
			<span>${__("All Files")}</span>
		</div>`);
		$root.on("click", () => this.navigate(null));
		this.$tree.append($root);

		for (const name of this.tree_roots) {
			this.$tree.append(this.render_tree_node(name, 0));
		}
	}

	render_tree_node(name, depth) {
		const folder = this.folder_cache[name];
		if (!folder) return "";

		const has_children = folder.children && folder.children.length > 0;
		const is_expanded = this.tree_state[name];
		const is_selected = this.current_folder === name;

		const $node = $(`<div class="drive-tree-node"></div>`);

		const $label = $(`<div class="drive-tree-label ${is_selected ? "selected" : ""}" data-folder="${name}">
			<span class="tree-toggle">${has_children ? (is_expanded ? "&#9660;" : "&#9654;") : ""}</span>
			<i class="fa ${is_expanded ? "fa-folder-open" : "fa-folder"} tree-icon"></i>
			<span>${frappe.utils.escape_html(folder.folder_name)}</span>
		</div>`);

		$label.find(".tree-toggle").on("click", (e) => {
			e.stopPropagation();
			if (has_children) {
				this.tree_state[name] = !this.tree_state[name];
				this.render_tree();
			}
		});

		$label.on("click", () => this.navigate(name));
		$node.append($label);

		if (has_children) {
			const $children = $(`<div class="drive-tree-children ${is_expanded ? "" : "collapsed"}"></div>`);
			for (const child of folder.children) {
				$children.append(this.render_tree_node(child, depth + 1));
			}
			$node.append($children);
		}

		return $node;
	}

	refresh_tree_node(folder_name) {
		// Re-fetch all folders and rebuild tree
		this.fetch_all_folders().then((folders) => {
			this.build_tree_data(folders);
			this.render_tree();
		});
	}

	// ── Navigation ───────────────────────────────────────────

	navigate(folder_name, skip_route) {
		this.current_folder = folder_name || null;
		this.load_contents(this.current_folder);
		this.update_breadcrumb();
		this.render_tree(); // Update selection

		if (!skip_route) {
			const route = folder_name ? `drive-browser/${folder_name}` : "drive-browser";
			frappe.set_route(route);
		}
	}

	// ── Breadcrumb ───────────────────────────────────────────

	update_breadcrumb() {
		this.$breadcrumb.empty();

		const path = this.get_folder_path(this.current_folder);

		// Root
		const $root = $(`<span class="breadcrumb-item ${!this.current_folder ? "active" : ""}">
			<i class="fa fa-hdd"></i> ${__("Drive")}
		</span>`);
		if (this.current_folder) {
			$root.on("click", () => this.navigate(null));
		}
		this.$breadcrumb.append($root);

		for (let i = 0; i < path.length; i++) {
			const f = path[i];
			const is_last = i === path.length - 1;
			this.$breadcrumb.append(`<span class="breadcrumb-sep">/</span>`);
			const $item = $(`<span class="breadcrumb-item ${is_last ? "active" : ""}">${frappe.utils.escape_html(f.folder_name)}</span>`);
			if (!is_last) {
				$item.on("click", () => this.navigate(f.name));
			}
			this.$breadcrumb.append($item);
		}
	}

	get_folder_path(folder_name) {
		const path = [];
		let current = folder_name;
		while (current && this.folder_cache[current]) {
			path.unshift(this.folder_cache[current]);
			current = this.folder_cache[current].parent_folder;
		}
		return path;
	}

	// ── Main Content ─────────────────────────────────────────

	load_contents(folder_name) {
		const folder_filter = folder_name || ["is", "not set"];

		// Fetch subfolders and files in parallel
		Promise.all([
			this.fetch_subfolders(folder_name),
			this.fetch_files(folder_filter),
		]).then(([folders, files]) => {
			this.render_contents(folders, files);
		});
	}

	fetch_subfolders(parent) {
		const filters = parent
			? { parent_folder: parent }
			: { parent_folder: ["is", "not set"] };
		return new Promise((resolve) => {
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Drive Folder",
					filters: filters,
					fields: ["name", "folder_name", "modified"],
					order_by: "folder_name asc",
					limit_page_length: 200,
				},
				callback: (r) => resolve(r.message || []),
			});
		});
	}

	fetch_files(folder_filter) {
		return new Promise((resolve) => {
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Drive File",
					filters: { folder: folder_filter },
					fields: ["name", "file_name", "file_size", "extension", "mime_type", "modified"],
					order_by: "file_name asc",
					limit_page_length: 500,
				},
				callback: (r) => resolve(r.message || []),
			});
		});
	}

	render_contents(folders, files) {
		this.$items.empty();

		if (!folders.length && !files.length) {
			this.$items.html(`<div class="drive-items-empty">
				<div>
					<i class="fa fa-folder-open" style="font-size: 48px; color: var(--text-light); display: block; margin-bottom: 12px;"></i>
					${__("This folder is empty")}
				</div>
			</div>`);
			return;
		}

		// Folders first
		for (const f of folders) {
			const $row = $(`<div class="drive-item-row" data-type="folder" data-name="${f.name}">
				<div class="item-icon folder-icon"><i class="fa fa-folder"></i></div>
				<div class="item-name">${frappe.utils.escape_html(f.folder_name)}</div>
				<div class="item-meta">${frappe.datetime.prettyDate(f.modified)}</div>
			</div>`);
			$row.on("click", () => this.navigate(f.name));
			this.$items.append($row);
		}

		// Files
		for (const f of files) {
			const icon = this.get_file_icon(f.extension, f.mime_type);
			const $row = $(`<div class="drive-item-row" data-type="file" data-name="${f.name}">
				<div class="item-icon"><i class="fa ${icon}" style="color: var(--text-muted);"></i></div>
				<div class="item-name">${frappe.utils.escape_html(f.file_name)}</div>
				<div class="item-meta">${this.format_bytes(f.file_size)}</div>
				<div class="item-meta">${frappe.datetime.prettyDate(f.modified)}</div>
			</div>`);
			$row.on("click", () => {
				frappe.set_route("Form", "Drive File", f.name);
			});
			this.$items.append($row);
		}
	}

	// ── Utilities ─────────────────────────────────────────────

	get_file_icon(ext, mime) {
		ext = (ext || "").toLowerCase();
		mime = mime || "";
		if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) return "fa-file-image";
		if (ext === "pdf" || mime === "application/pdf") return "fa-file-pdf";
		if (["doc", "docx", "odt"].includes(ext)) return "fa-file-word";
		if (["xls", "xlsx", "ods", "csv"].includes(ext)) return "fa-file-excel";
		if (["ppt", "pptx", "odp"].includes(ext)) return "fa-file-powerpoint";
		if (["zip", "gz", "tar", "7z", "rar"].includes(ext)) return "fa-file-archive";
		if (["mp4", "webm", "mov"].includes(ext) || mime.startsWith("video/")) return "fa-file-video";
		if (["mp3", "wav", "ogg"].includes(ext) || mime.startsWith("audio/")) return "fa-file-audio";
		if (["json", "xml", "py", "js", "ts", "html", "css", "sh", "sql"].includes(ext)) return "fa-file-code";
		if (["txt", "md", "log"].includes(ext)) return "fa-file-alt";
		return "fa-file";
	}

	format_bytes(bytes) {
		if (!bytes) return "—";
		const units = ["B", "KB", "MB", "GB"];
		let i = 0;
		let size = bytes;
		while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
		return size.toFixed(i === 0 ? 0 : 1) + " " + units[i];
	}
}
