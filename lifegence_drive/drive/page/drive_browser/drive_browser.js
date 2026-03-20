frappe.pages["drive-browser"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Drive"),
		single_column: true,
	});

	wrapper.drive_browser = new DriveBrowser(page);
};

frappe.pages["drive-browser"].on_page_show = function (wrapper) {
	wrapper.drive_browser && wrapper.drive_browser.refresh();
};

class DriveBrowser {
	constructor(page) {
		this.page = page;
		this.current_folder = null;
		this.view_mode = "grid";
		this.current_view = "my-files";
		this.selected_items = [];

		this.$wrapper = $(this.page.body);
		this.setup();
		this.refresh();
	}

	setup() {
		this.setup_nav();
		this.setup_toolbar();
		this.setup_upload();
		this.setup_context_menu();
		this.setup_drag_drop();
		this.setup_search();
		this.setup_keyboard_shortcuts();
		this.load_storage_info();
	}

	// --- Navigation ---

	setup_nav() {
		this.$wrapper.on("click", ".drive-nav-item", (e) => {
			const view = $(e.currentTarget).data("view");
			this.$wrapper.find(".drive-nav-item").removeClass("active");
			$(e.currentTarget).addClass("active");
			this.current_view = view;
			this.current_folder = null;
			this.refresh();
		});
	}

	// --- Toolbar ---

	setup_toolbar() {
		// View mode toggle
		this.$wrapper.on("click", "[data-view-mode]", (e) => {
			this.view_mode = $(e.currentTarget).data("view-mode");
			this.$wrapper.find("[data-view-mode]").removeClass("active");
			$(e.currentTarget).addClass("active");
			this.render_content();
		});

		// New folder button
		this.$wrapper.on("click", ".btn-new-folder", () => this.create_folder());

		// Upload button
		this.$wrapper.on("click", ".btn-upload", () => this.trigger_upload());
	}

	// --- Data Loading ---

	refresh() {
		switch (this.current_view) {
			case "my-files":
				this.load_contents();
				break;
			case "trash":
				this.load_trash();
				break;
			case "favorites":
				this.load_favorites();
				break;
			case "recent":
				this.load_recent();
				break;
			case "shared":
				this.load_shared();
				break;
		}
	}

	load_contents() {
		frappe.call({
			method: "lifegence_drive.drive.api.folder.get_contents",
			args: { folder: this.current_folder || "" },
			callback: (r) => {
				this.folders = r.message.folders || [];
				this.files = r.message.files || [];
				this.breadcrumb = r.message.breadcrumb || [];
				this.render_breadcrumb();
				this.render_content();
			},
		});
	}

	load_trash() {
		frappe.call({
			method: "lifegence_drive.drive.api.trash.get_trash",
			callback: (r) => {
				this.folders = [];
				this.files = (r.message || []).map((item) => ({
					...item,
					name: item.original_name,
					file_name: item.file_name || item.folder_name || item.original_name,
					_is_trash: true,
					_trash_name: item.name,
					_original_doctype: item.original_doctype,
				}));
				this.breadcrumb = [];
				this.render_breadcrumb();
				this.render_content();
			},
		});
	}

	load_favorites() {
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Drive Favorite",
				filters: { user: frappe.session.user },
				fields: ["name", "favorited_doctype", "favorited_name"],
			},
			callback: (r) => {
				const items = r.message || [];
				this.folders = [];
				this.files = [];

				if (!items.length) {
					this.breadcrumb = [];
					this.render_breadcrumb();
					this.render_content();
					return;
				}

				// Load details for favorited items
				const file_names = items
					.filter((i) => i.favorited_doctype === "Drive File")
					.map((i) => i.favorited_name);

				if (file_names.length) {
					frappe.call({
						method: "frappe.client.get_list",
						args: {
							doctype: "Drive File",
							filters: { name: ["in", file_names] },
							fields: ["name", "file_name", "file_url", "file_size",
								"mime_type", "extension", "folder", "uploaded_by",
								"is_private", "version", "creation", "modified"],
						},
						callback: (r2) => {
							this.files = r2.message || [];
							this.breadcrumb = [];
							this.render_breadcrumb();
							this.render_content();
						},
					});
				} else {
					this.breadcrumb = [];
					this.render_breadcrumb();
					this.render_content();
				}
			},
		});
	}

	load_recent() {
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Drive File",
				fields: ["name", "file_name", "file_url", "file_size",
					"mime_type", "extension", "folder", "uploaded_by",
					"is_private", "version", "creation", "modified"],
				order_by: "modified desc",
				limit: 50,
			},
			callback: (r) => {
				this.folders = [];
				this.files = r.message || [];
				this.breadcrumb = [];
				this.render_breadcrumb();
				this.render_content();
			},
		});
	}

	load_shared() {
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Drive Share",
				filters: { shared_with: frappe.session.user },
				fields: ["shared_doctype", "shared_name", "permission_level"],
			},
			callback: (r) => {
				const items = r.message || [];
				this.folders = [];
				this.files = [];

				const file_names = items
					.filter((i) => i.shared_doctype === "Drive File")
					.map((i) => i.shared_name);

				if (file_names.length) {
					frappe.call({
						method: "frappe.client.get_list",
						args: {
							doctype: "Drive File",
							filters: { name: ["in", file_names] },
							fields: ["name", "file_name", "file_url", "file_size",
								"mime_type", "extension", "folder", "uploaded_by",
								"is_private", "version", "creation", "modified"],
						},
						callback: (r2) => {
							this.files = r2.message || [];
							this.breadcrumb = [];
							this.render_breadcrumb();
							this.render_content();
						},
					});
				} else {
					this.breadcrumb = [];
					this.render_breadcrumb();
					this.render_content();
				}
			},
		});
	}

	// --- Rendering ---

	render_breadcrumb() {
		const $bc = this.$wrapper.find(".drive-breadcrumb");
		let html = `<a href="#" class="breadcrumb-home" data-folder="">${__("Home")}</a>`;

		for (const crumb of this.breadcrumb) {
			html += ` <span class="breadcrumb-sep">/</span> `;
			html += `<a href="#" class="breadcrumb-item" data-folder="${crumb.name}">${frappe.utils.escape_html(crumb.folder_name)}</a>`;
		}

		$bc.html(html);

		$bc.find("a").on("click", (e) => {
			e.preventDefault();
			this.current_folder = $(e.currentTarget).data("folder") || null;
			this.current_view = "my-files";
			this.$wrapper.find(".drive-nav-item").removeClass("active");
			this.$wrapper.find('[data-view="my-files"]').addClass("active");
			this.load_contents();
		});
	}

	render_content() {
		const all_items = [
			...this.folders.map((f) => ({ ...f, _type: "folder" })),
			...this.files.map((f) => ({ ...f, _type: "file" })),
		];

		if (!all_items.length) {
			this.$wrapper.find(".drive-grid, .drive-list").hide();
			this.$wrapper.find(".drive-empty").show();
			return;
		}

		this.$wrapper.find(".drive-empty").hide();

		if (this.view_mode === "grid") {
			this.render_grid(all_items);
		} else {
			this.render_list(all_items);
		}
	}

	render_grid(items) {
		this.$wrapper.find(".drive-list").hide();
		const $grid = this.$wrapper.find(".drive-grid").show().empty();

		for (const item of items) {
			const icon = item._type === "folder" ? "fa-folder" : this.get_file_icon(item.extension);
			const name = item._type === "folder" ? item.folder_name : item.file_name;
			const size = item.file_size ? this.format_size(item.file_size) : "";
			const is_image = item.mime_type && item.mime_type.startsWith("image/") && item.file_url;

			let icon_html;
			if (is_image) {
				icon_html = `<div class="grid-item-thumbnail"><img src="${item.file_url}" alt="" loading="lazy" /></div>`;
			} else {
				icon_html = `<div class="grid-item-icon"><i class="fa ${icon}"></i></div>`;
			}

			const $card = $(`
				<div class="drive-grid-item" data-name="${item.name}" data-type="${item._type}"
					${item._is_trash ? `data-trash-name="${item._trash_name}" data-original-doctype="${item._original_doctype}"` : ""}>
					${icon_html}
					<div class="grid-item-name" title="${frappe.utils.escape_html(name)}">
						${frappe.utils.escape_html(name)}
					</div>
					${size ? `<div class="grid-item-size text-muted small">${size}</div>` : ""}
				</div>
			`);

			$card.on("dblclick", () => this.open_item(item));
			$card.on("click", (e) => {
				e.stopPropagation();
				this.select_item($card, item);
			});
			$card.on("contextmenu", (e) => {
				e.preventDefault();
				this.show_context_menu(e, item);
			});

			$grid.append($card);
		}
	}

	render_list(items) {
		this.$wrapper.find(".drive-grid").hide();
		const $list = this.$wrapper.find(".drive-list").show().empty();

		const $table = $(`
			<table class="table table-hover">
				<thead>
					<tr>
						<th>${__("Name")}</th>
						<th>${__("Size")}</th>
						<th>${__("Type")}</th>
						<th>${__("Modified")}</th>
						<th>${__("Owner")}</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		`);

		const $tbody = $table.find("tbody");

		for (const item of items) {
			const icon = item._type === "folder" ? "fa-folder" : this.get_file_icon(item.extension);
			const name = item._type === "folder" ? item.folder_name : item.file_name;
			const size = item.file_size ? this.format_size(item.file_size) : "-";
			const ext = item.extension || (item._type === "folder" ? __("Folder") : "-");
			const modified = item.modified ? frappe.datetime.prettyDate(item.modified) : "-";
			const owner = item.uploaded_by || item.created_by || "-";

			const $row = $(`
				<tr class="drive-list-item" data-name="${item.name}" data-type="${item._type}"
					${item._is_trash ? `data-trash-name="${item._trash_name}" data-original-doctype="${item._original_doctype}"` : ""}>
					<td><i class="fa ${icon} mr-2"></i> ${frappe.utils.escape_html(name)}</td>
					<td>${size}</td>
					<td>${frappe.utils.escape_html(ext)}</td>
					<td>${modified}</td>
					<td>${frappe.utils.escape_html(frappe.user.full_name(owner))}</td>
				</tr>
			`);

			$row.on("dblclick", () => this.open_item(item));
			$row.on("click", (e) => {
				e.stopPropagation();
				this.select_item($row, item);
			});
			$row.on("contextmenu", (e) => {
				e.preventDefault();
				this.show_context_menu(e, item);
			});

			$tbody.append($row);
		}

		$list.append($table);
	}

	// --- Item Actions ---

	open_item(item) {
		if (item._type === "folder") {
			this.current_folder = item.name;
			this.current_view = "my-files";
			this.load_contents();
		} else if (item._is_trash) {
			// No action for trash items
		} else {
			this.preview_file(item);
		}
	}

	select_item($el, item) {
		this.$wrapper.find(".drive-grid-item, .drive-list-item").removeClass("selected");
		$el.addClass("selected");
		this.selected_items = [item];
		this.show_detail_panel(item);
	}

	preview_file(item) {
		const ext = (item.extension || "").toLowerCase();
		const mime = item.mime_type || "";

		if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
			this.show_image_preview(item);
		} else if (ext === "pdf") {
			this.show_pdf_preview(item);
		} else if (["txt", "csv", "json", "xml", "md", "py", "js", "html", "css"].includes(ext)) {
			this.show_text_preview(item);
		} else if (["mp4", "webm"].includes(ext)) {
			this.show_video_preview(item);
		} else {
			// Download for unsupported types
			this.download_file(item);
		}
	}

	show_image_preview(item) {
		const d = new frappe.ui.Dialog({
			title: item.file_name,
			size: "extra-large",
		});
		d.$body.html(`<div class="text-center p-3"><img src="${item.file_url}" style="max-width:100%; max-height:80vh;" /></div>`);
		d.show();
	}

	show_pdf_preview(item) {
		const d = new frappe.ui.Dialog({
			title: item.file_name,
			size: "extra-large",
		});
		d.$body.html(`<iframe src="${item.file_url}" style="width:100%; height:80vh; border:none;"></iframe>`);
		d.show();
	}

	show_text_preview(item) {
		fetch(item.file_url)
			.then((r) => r.text())
			.then((text) => {
				const d = new frappe.ui.Dialog({
					title: item.file_name,
					size: "extra-large",
				});
				d.$body.html(`<pre class="p-3" style="max-height:80vh; overflow:auto;">${frappe.utils.escape_html(text)}</pre>`);
				d.show();
			});
	}

	show_video_preview(item) {
		const d = new frappe.ui.Dialog({
			title: item.file_name,
			size: "extra-large",
		});
		d.$body.html(`<video controls style="width:100%; max-height:80vh;"><source src="${item.file_url}"></video>`);
		d.show();
	}

	// --- Detail Panel ---

	show_detail_panel(item) {
		const $panel = this.$wrapper.find(".drive-detail-panel");
		const name = item._type === "folder" ? item.folder_name : item.file_name;
		const icon = item._type === "folder" ? "fa-folder" : this.get_file_icon(item.extension);
		const is_image = item.mime_type && item.mime_type.startsWith("image/");

		$panel.find(".detail-title").text(name);

		let preview_html;
		if (is_image && item.file_url) {
			preview_html = `<div class="text-center py-3"><img src="${item.file_url}" class="detail-preview-img" /></div>`;
		} else {
			preview_html = `<div class="text-center py-4"><i class="fa ${icon} fa-4x text-muted"></i></div>`;
		}

		let details_html = `
			<div class="detail-section">
				${preview_html}
				<table class="table table-sm">
		`;

		if (item._type === "file") {
			details_html += `
				<tr><td class="text-muted">${__("Size")}</td><td>${this.format_size(item.file_size)}</td></tr>
				<tr><td class="text-muted">${__("Type")}</td><td>${frappe.utils.escape_html(item.extension || "-")}</td></tr>
				<tr><td class="text-muted">${__("MIME")}</td><td>${frappe.utils.escape_html(item.mime_type || "-")}</td></tr>
				<tr><td class="text-muted">${__("Version")}</td><td>${item.version || 1}</td></tr>
			`;
		}

		details_html += `
				<tr><td class="text-muted">${__("Owner")}</td><td>${frappe.utils.escape_html(frappe.user.full_name(item.uploaded_by || item.created_by || ""))}</td></tr>
				<tr><td class="text-muted">${__("Modified")}</td><td>${item.modified ? frappe.datetime.prettyDate(item.modified) : "-"}</td></tr>
				<tr><td class="text-muted">${__("Created")}</td><td>${item.creation ? frappe.datetime.prettyDate(item.creation) : "-"}</td></tr>
			</table>
			</div>
		`;

		// Version history button for files
		if (item._type === "file" && !item._is_trash) {
			details_html += `
				<div class="detail-actions mt-3">
					<button class="btn btn-default btn-sm btn-block btn-version-history" data-name="${item.name}">
						<i class="fa fa-history"></i> ${__("Version History")}
					</button>
					<button class="btn btn-default btn-sm btn-block btn-upload-version mt-1" data-name="${item.name}">
						<i class="fa fa-upload"></i> ${__("Upload New Version")}
					</button>
				</div>
			`;
		}

		$panel.find(".detail-body").html(details_html);
		$panel.show();

		$panel.find(".detail-close").off("click").on("click", () => $panel.hide());

		// Version history handler
		$panel.find(".btn-version-history").on("click", (e) => {
			this.show_version_history($(e.currentTarget).data("name"));
		});

		// Upload new version handler
		$panel.find(".btn-upload-version").on("click", (e) => {
			this.upload_new_version($(e.currentTarget).data("name"));
		});
	}

	// --- Version History ---

	show_version_history(file_name) {
		frappe.call({
			method: "lifegence_drive.drive.api.version.get_versions",
			args: { name: file_name },
			callback: (r) => {
				const versions = r.message || [];
				if (!versions.length) {
					frappe.msgprint(__("No version history available."));
					return;
				}

				const d = new frappe.ui.Dialog({
					title: __("Version History"),
					size: "large",
				});

				let html = `<table class="table table-hover">
					<thead><tr>
						<th>${__("Version")}</th>
						<th>${__("Size")}</th>
						<th>${__("By")}</th>
						<th>${__("Date")}</th>
						<th>${__("Comment")}</th>
						<th></th>
					</tr></thead><tbody>`;

				for (const v of versions) {
					const is_current = v.is_current;
					html += `<tr class="${is_current ? "font-weight-bold" : ""}">
						<td>v${v.version_number} ${is_current ? `<span class="badge badge-info">${__("Current")}</span>` : ""}</td>
						<td>${this.format_size(v.file_size)}</td>
						<td>${frappe.utils.escape_html(frappe.user.full_name(v.uploaded_by || ""))}</td>
						<td>${v.uploaded_at ? frappe.datetime.prettyDate(v.uploaded_at) : "-"}</td>
						<td>${frappe.utils.escape_html(v.comment || "")}</td>
						<td>
							${!is_current ? `
								<button class="btn btn-xs btn-default btn-download-version" data-version="${v.name}">
									<i class="fa fa-download"></i>
								</button>
								<button class="btn btn-xs btn-primary btn-restore-version" data-version="${v.name}" data-file="${file_name}">
									<i class="fa fa-undo"></i> ${__("Restore")}
								</button>
							` : ""}
						</td>
					</tr>`;
				}

				html += "</tbody></table>";
				d.$body.html(html);

				d.$body.on("click", ".btn-download-version", (e) => {
					const version_name = $(e.currentTarget).data("version");
					window.open(`/api/method/lifegence_drive.drive.api.version.download_version?version_name=${version_name}`);
				});

				d.$body.on("click", ".btn-restore-version", (e) => {
					const version_name = $(e.currentTarget).data("version");
					const fname = $(e.currentTarget).data("file");
					frappe.confirm(__("Restore this version? The current version will be saved in history."), () => {
						frappe.call({
							method: "lifegence_drive.drive.api.version.restore_version",
							args: { name: fname, version_name },
							callback: () => {
								d.hide();
								frappe.show_alert({ message: __("Version restored"), indicator: "green" });
								this.refresh();
							},
						});
					});
				});

				d.show();
			},
		});
	}

	upload_new_version(file_name) {
		const d = new frappe.ui.Dialog({
			title: __("Upload New Version"),
			fields: [
				{
					fieldname: "file_html",
					fieldtype: "HTML",
					options: `<input type="file" class="version-file-input form-control">`,
				},
				{
					fieldname: "comment",
					fieldtype: "Small Text",
					label: __("Version Comment"),
				},
			],
			primary_action_label: __("Upload"),
			primary_action: (values) => {
				const file_input = d.$body.find(".version-file-input")[0];
				if (!file_input.files.length) {
					frappe.throw(__("Please select a file."));
					return;
				}

				const formData = new FormData();
				formData.append("file", file_input.files[0]);
				formData.append("name", file_name);
				formData.append("comment", values.comment || "");

				fetch("/api/method/lifegence_drive.drive.api.version.upload_new_version", {
					method: "POST",
					body: formData,
					headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
				})
					.then((r) => r.json())
					.then((r) => {
						if (r.exc) {
							frappe.show_alert({ message: __("Upload failed"), indicator: "red" });
							return;
						}
						d.hide();
						frappe.show_alert({ message: __("New version uploaded"), indicator: "green" });
						this.refresh();
						this.load_storage_info();
					});
			},
		});
		d.show();
	}

	// --- File Upload ---

	setup_upload() {
		// Hidden file input
		this.$file_input = $('<input type="file" multiple style="display:none;">');
		this.$wrapper.append(this.$file_input);

		this.$file_input.on("change", (e) => {
			const files = e.target.files;
			if (files.length) {
				this.upload_files(files);
			}
			this.$file_input.val("");
		});
	}

	trigger_upload() {
		this.$file_input.trigger("click");
	}

	upload_files(files) {
		const total = files.length;
		let completed = 0;
		let failed = 0;

		// Show progress indicator
		const $progress = this._show_upload_progress(total);

		const upload_next = (index) => {
			if (index >= total) {
				this._finish_upload(completed, failed, total);
				return;
			}

			const file = files[index];
			const formData = new FormData();
			formData.append("file", file);
			formData.append("folder", this.current_folder || "");
			formData.append("is_private", "0");

			const xhr = new XMLHttpRequest();
			xhr.open("POST", "/api/method/lifegence_drive.drive.api.file.upload");
			xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);

			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable) {
					const file_pct = Math.round((e.loaded / e.total) * 100);
					const overall_pct = Math.round(((completed + file_pct / 100) / total) * 100);
					this._update_upload_progress($progress, overall_pct, completed + 1, total, file.name);
				}
			};

			xhr.onload = () => {
				if (xhr.status === 200) {
					completed++;
				} else {
					failed++;
				}
				upload_next(index + 1);
			};

			xhr.onerror = () => {
				failed++;
				upload_next(index + 1);
			};

			xhr.send(formData);
		};

		// Upload files sequentially for progress tracking
		upload_next(0);
	}

	_show_upload_progress(total) {
		const $progress = $(`
			<div class="drive-upload-progress">
				<div class="upload-progress-header">
					<span class="upload-progress-title">${__("Uploading")} 0/${total}</span>
					<button class="btn btn-xs btn-default upload-progress-close" style="display:none;">&times;</button>
				</div>
				<div class="upload-progress-file text-muted small"></div>
				<div class="progress mt-1">
					<div class="progress-bar" role="progressbar" style="width: 0%"></div>
				</div>
			</div>
		`);
		this.$wrapper.append($progress);
		return $progress;
	}

	_update_upload_progress($progress, pct, current, total, filename) {
		$progress.find(".progress-bar").css("width", `${pct}%`);
		$progress.find(".upload-progress-title").text(`${__("Uploading")} ${current}/${total}`);
		$progress.find(".upload-progress-file").text(filename);
	}

	_finish_upload(completed, failed, total) {
		const $progress = this.$wrapper.find(".drive-upload-progress");

		if (failed === 0) {
			$progress.find(".upload-progress-title").text(`${__("Upload complete")} (${completed}/${total})`);
			$progress.find(".progress-bar").css("width", "100%").addClass("bg-success");
		} else {
			$progress.find(".upload-progress-title").text(`${completed} ${__("uploaded")}, ${failed} ${__("failed")}`);
			$progress.find(".progress-bar").addClass("bg-warning");
		}

		$progress.find(".upload-progress-close").show().on("click", () => $progress.remove());

		// Auto-remove after 5s
		setTimeout(() => $progress.remove(), 5000);

		this.refresh();
		this.load_storage_info();
	}

	// --- Drag & Drop ---

	setup_drag_drop() {
		const $main = this.$wrapper.find(".drive-main");
		const $dropzone = this.$wrapper.find(".drive-dropzone");

		let drag_counter = 0;

		$main.on("dragenter", (e) => {
			e.preventDefault();
			drag_counter++;
			$dropzone.show();
		});

		$main.on("dragleave", (e) => {
			e.preventDefault();
			drag_counter--;
			if (drag_counter === 0) {
				$dropzone.hide();
			}
		});

		$main.on("dragover", (e) => {
			e.preventDefault();
		});

		$main.on("drop", (e) => {
			e.preventDefault();
			drag_counter = 0;
			$dropzone.hide();

			const files = e.originalEvent.dataTransfer.files;
			if (files.length) {
				this.upload_files(files);
			}
		});
	}

	// --- Search ---

	setup_search() {
		let search_timeout;
		this.$wrapper.find(".drive-search input").on("input", (e) => {
			clearTimeout(search_timeout);
			const query = $(e.target).val().trim();

			search_timeout = setTimeout(() => {
				if (query.length >= 2) {
					this.search_files(query);
				} else if (!query) {
					this.refresh();
				}
			}, 300);
		});
	}

	search_files(query) {
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Drive File",
				filters: { file_name: ["like", `%${query}%`] },
				fields: ["name", "file_name", "file_url", "file_size",
					"mime_type", "extension", "folder", "uploaded_by",
					"is_private", "version", "creation", "modified"],
				order_by: "modified desc",
				limit: 50,
			},
			callback: (r) => {
				this.folders = [];
				this.files = r.message || [];
				this.breadcrumb = [];
				this.render_breadcrumb();
				this.render_content();
			},
		});
	}

	// --- Keyboard Shortcuts ---

	setup_keyboard_shortcuts() {
		$(document).on("keydown", (e) => {
			// Only handle when drive browser is active
			if (!this.$wrapper.is(":visible")) return;
			// Skip if typing in input
			if ($(e.target).is("input, textarea, select")) return;

			const item = this.selected_items[0];

			switch (e.key) {
				case "Delete":
				case "Backspace":
					if (item && !item._is_trash) {
						e.preventDefault();
						this.trash_item(item);
					}
					break;
				case "F2":
					if (item && !item._is_trash) {
						e.preventDefault();
						this.rename_item(item);
					}
					break;
				case "Enter":
					if (item) {
						e.preventDefault();
						this.open_item(item);
					}
					break;
				case "u":
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						this.trigger_upload();
					}
					break;
				case "n":
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						this.create_folder();
					}
					break;
				case "f":
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						this.$wrapper.find(".drive-search input").focus();
					}
					break;
				case "Escape":
					this.$wrapper.find(".drive-context-menu").hide();
					this.$wrapper.find(".drive-detail-panel").hide();
					this.$wrapper.find(".drive-grid-item, .drive-list-item").removeClass("selected");
					this.selected_items = [];
					break;
			}
		});
	}

	// --- Context Menu ---

	setup_context_menu() {
		const $menu = this.$wrapper.find(".drive-context-menu");

		// Hide on click elsewhere
		$(document).on("click", () => $menu.hide());

		$menu.on("click", "li[data-action]", (e) => {
			const action = $(e.currentTarget).data("action");
			const item = $menu.data("item");
			$menu.hide();

			if (!item) return;

			switch (action) {
				case "open":
					this.open_item(item);
					break;
				case "download":
					this.download_file(item);
					break;
				case "rename":
					this.rename_item(item);
					break;
				case "move":
					this.move_item(item);
					break;
				case "share":
					this.share_item(item);
					break;
				case "favorite":
					this.toggle_favorite(item);
					break;
				case "details":
					this.show_detail_panel(item);
					break;
				case "versions":
					if (item._type === "file") this.show_version_history(item.name);
					break;
				case "trash":
					this.trash_item(item);
					break;
			}
		});
	}

	show_context_menu(e, item) {
		const $menu = this.$wrapper.find(".drive-context-menu");
		$menu.data("item", item);

		// Adjust menu items for trash view
		if (item._is_trash) {
			$menu.find("[data-action]").hide();
			$menu.find('[data-action="details"]').show();
		} else {
			$menu.find("[data-action]").show();
			if (item._type === "folder") {
				$menu.find('[data-action="download"]').hide();
			}
		}

		$menu.css({ left: e.pageX, top: e.pageY }).show();
	}

	// --- CRUD Operations ---

	create_folder() {
		const d = new frappe.ui.Dialog({
			title: __("New Folder"),
			fields: [
				{ fieldname: "folder_name", fieldtype: "Data", label: __("Folder Name"), reqd: 1 },
			],
			primary_action_label: __("Create"),
			primary_action: (values) => {
				frappe.call({
					method: "lifegence_drive.drive.api.folder.create",
					args: {
						folder_name: values.folder_name,
						parent_folder: this.current_folder || "",
					},
					callback: () => {
						d.hide();
						this.refresh();
					},
				});
			},
		});
		d.show();
	}

	download_file(item) {
		if (item.file_url) {
			window.open(item.file_url);
		}
	}

	rename_item(item) {
		const current_name = item._type === "folder" ? item.folder_name : item.file_name;
		const d = new frappe.ui.Dialog({
			title: __("Rename"),
			fields: [
				{ fieldname: "new_name", fieldtype: "Data", label: __("New Name"), default: current_name, reqd: 1 },
			],
			primary_action_label: __("Rename"),
			primary_action: (values) => {
				const method = item._type === "folder"
					? "lifegence_drive.drive.api.folder.rename"
					: "lifegence_drive.drive.api.file.rename";

				frappe.call({
					method,
					args: { name: item.name, new_name: values.new_name },
					callback: () => {
						d.hide();
						this.refresh();
					},
				});
			},
		});
		d.show();
	}

	move_item(item) {
		const d = new frappe.ui.Dialog({
			title: __("Move to"),
			fields: [
				{
					fieldname: "target_folder",
					fieldtype: "Link",
					label: __("Target Folder"),
					options: "Drive Folder",
				},
			],
			primary_action_label: __("Move"),
			primary_action: (values) => {
				const method = item._type === "folder"
					? "lifegence_drive.drive.api.folder.move"
					: "lifegence_drive.drive.api.file.move";

				const args = item._type === "folder"
					? { name: item.name, target_parent: values.target_folder || "" }
					: { name: item.name, target_folder: values.target_folder || "" };

				frappe.call({
					method,
					args,
					callback: () => {
						d.hide();
						this.refresh();
					},
				});
			},
		});
		d.show();
	}

	share_item(item) {
		const d = new frappe.ui.Dialog({
			title: __("Share"),
			fields: [
				{
					fieldname: "shared_with",
					fieldtype: "Link",
					label: __("Share With"),
					options: "User",
					reqd: 1,
				},
				{
					fieldname: "permission_level",
					fieldtype: "Select",
					label: __("Permission"),
					options: "View\nEdit\nManage",
					default: "View",
				},
			],
			primary_action_label: __("Share"),
			primary_action: (values) => {
				frappe.call({
					method: "frappe.client.insert",
					args: {
						doc: {
							doctype: "Drive Share",
							shared_doctype: item._type === "folder" ? "Drive Folder" : "Drive File",
							shared_name: item.name,
							shared_with: values.shared_with,
							permission_level: values.permission_level,
						},
					},
					callback: () => {
						d.hide();
						frappe.show_alert({ message: __("Shared successfully"), indicator: "green" });
					},
				});
			},
		});
		d.show();
	}

	toggle_favorite(item) {
		const doctype = item._type === "folder" ? "Drive Folder" : "Drive File";

		// Check if already favorited
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Drive Favorite",
				filters: {
					favorited_doctype: doctype,
					favorited_name: item.name,
					user: frappe.session.user,
				},
			},
			callback: (r) => {
				if (r.message && r.message.length) {
					// Remove favorite
					frappe.call({
						method: "frappe.client.delete",
						args: { doctype: "Drive Favorite", name: r.message[0].name },
						callback: () => {
							frappe.show_alert({ message: __("Removed from favorites"), indicator: "blue" });
							if (this.current_view === "favorites") this.refresh();
						},
					});
				} else {
					// Add favorite
					frappe.call({
						method: "frappe.client.insert",
						args: {
							doc: {
								doctype: "Drive Favorite",
								favorited_doctype: doctype,
								favorited_name: item.name,
								user: frappe.session.user,
							},
						},
						callback: () => {
							frappe.show_alert({ message: __("Added to favorites"), indicator: "green" });
						},
					});
				}
			},
		});
	}

	trash_item(item) {
		frappe.confirm(
			__("Move {0} to trash?", [item._type === "folder" ? item.folder_name : item.file_name]),
			() => {
				const doctype = item._type === "folder" ? "Drive Folder" : "Drive File";
				frappe.call({
					method: "lifegence_drive.drive.api.trash.move_to_trash",
					args: { doctype, name: item.name },
					callback: () => {
						frappe.show_alert({ message: __("Moved to trash"), indicator: "orange" });
						this.refresh();
						this.load_storage_info();
					},
				});
			}
		);
	}

	// --- Storage Info ---

	load_storage_info() {
		frappe.call({
			method: "lifegence_drive.drive.api.storage.get_info",
			callback: (r) => {
				if (!r.message) return;
				const info = r.message;
				this.$wrapper.find(".storage-text").text(
					`${this.format_size(info.used)} / ${this.format_size(info.limit)}`
				);
				this.$wrapper.find(".progress-bar").css("width", `${info.used_percent}%`);
			},
		});
	}

	// --- Utilities ---

	get_file_icon(ext) {
		ext = (ext || "").toLowerCase();
		const icons = {
			pdf: "fa-file-pdf",
			doc: "fa-file-word", docx: "fa-file-word",
			xls: "fa-file-excel", xlsx: "fa-file-excel",
			ppt: "fa-file-powerpoint", pptx: "fa-file-powerpoint",
			jpg: "fa-file-image", jpeg: "fa-file-image", png: "fa-file-image",
			gif: "fa-file-image", svg: "fa-file-image", webp: "fa-file-image",
			mp4: "fa-file-video", webm: "fa-file-video",
			mp3: "fa-file-audio", wav: "fa-file-audio",
			zip: "fa-file-archive", gz: "fa-file-archive", tar: "fa-file-archive",
			txt: "fa-file-alt", csv: "fa-file-alt", md: "fa-file-alt",
			js: "fa-file-code", py: "fa-file-code", html: "fa-file-code",
			css: "fa-file-code", json: "fa-file-code", xml: "fa-file-code",
		};
		return icons[ext] || "fa-file";
	}

	format_size(bytes) {
		if (!bytes) return "0 B";
		const units = ["B", "KB", "MB", "GB", "TB"];
		let i = 0;
		let size = bytes;
		while (size >= 1024 && i < units.length - 1) {
			size /= 1024;
			i++;
		}
		return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
	}
}
