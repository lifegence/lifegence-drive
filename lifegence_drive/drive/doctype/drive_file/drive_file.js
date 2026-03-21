frappe.ui.form.on("Drive File", {
	refresh(frm) {
		const $preview = frm.fields_dict.preview_html.$wrapper;

		// New or no file — show upload UI instead of preview
		if (frm.is_new() || !frm.doc.file_url) {
			$preview.empty();
			if (frm.is_new()) {
				render_upload_zone(frm, $preview);
			}
			return;
		}

		// --- Primary actions ---
		frm.add_custom_button(__("Download"), () => {
			window.open(frm.doc.file_url);
		}, null, "primary");

		// --- Actions menu ---
		frm.add_custom_button(__("Share"), () => share_dialog(frm), __("Actions"));
		frm.add_custom_button(__("Shareable Link"), () => generate_link(frm), __("Actions"));
		frm.add_custom_button(__("Toggle Favorite"), () => toggle_favorite(frm), __("Actions"));
		frm.add_custom_button(__("Move to Folder"), () => move_dialog(frm), __("Actions"));
		frm.add_custom_button(__("Move to Trash"), () => move_to_trash(frm), __("Actions"));

		// --- Version menu ---
		frm.add_custom_button(__("Version History"), () => show_version_history(frm), __("Version"));
		frm.add_custom_button(__("Upload New Version"), () => upload_new_version(frm), __("Version"));

		// Render preview
		render_preview(frm);
	},
});

// ============================================================
// Upload zone (for new Drive File form)
// ============================================================

function render_upload_zone(frm, $container) {
	$container.html(`
		<div class="drive-upload-zone" style="
			padding: 48px 24px; background: var(--bg-light-gray);
			border: 2px dashed var(--border-color); border-radius: 8px;
			text-align: center; cursor: pointer; font-size: 14px;
			transition: border-color 0.2s, background 0.2s;
		">
			<i class="fa fa-cloud-upload" style="font-size: 48px; color: var(--text-muted);"></i>
			<div class="mt-3" style="font-size: 16px; font-weight: 500;">${__("Drop file here or click to upload")}</div>
			<div class="mt-1 text-muted">${__("File will be saved to Drive automatically")}</div>
			<input type="file" class="drive-file-input" style="display: none;">
			<div class="drive-upload-progress mt-3" style="display: none;">
				<div class="progress" style="height: 8px;">
					<div class="progress-bar" role="progressbar" style="width: 0%;"></div>
				</div>
				<div class="mt-1 text-muted drive-upload-status"></div>
			</div>
		</div>
	`);

	const $zone = $container.find(".drive-upload-zone");
	const $input = $container.find(".drive-file-input");

	// Click to select file
	$zone.on("click", (e) => {
		if (!$(e.target).is("input")) $input.trigger("click");
	});

	// Drag & drop
	$zone.on("dragover", (e) => {
		e.preventDefault();
		$zone.css({ "border-color": "var(--primary)", "background": "var(--control-bg)" });
	});
	$zone.on("dragleave drop", () => {
		$zone.css({ "border-color": "var(--border-color)", "background": "var(--bg-light-gray)" });
	});
	$zone.on("drop", (e) => {
		e.preventDefault();
		const files = e.originalEvent.dataTransfer.files;
		if (files.length) do_upload(frm, $container, files[0]);
	});

	// File input change
	$input.on("change", () => {
		if ($input[0].files.length) do_upload(frm, $container, $input[0].files[0]);
	});
}

function do_upload(frm, $container, file) {
	const $progress = $container.find(".drive-upload-progress");
	const $bar = $container.find(".progress-bar");
	const $status = $container.find(".drive-upload-status");
	$progress.show();
	$status.text(__("Uploading {0}...", [file.name]));

	const formData = new FormData();
	formData.append("file", file);
	formData.append("folder", frm.doc.folder || "");
	formData.append("is_private", frm.doc.is_private || 0);

	const xhr = new XMLHttpRequest();
	xhr.open("POST", "/api/method/lifegence_drive.drive.api.file.upload");
	xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);

	xhr.upload.onprogress = (e) => {
		if (e.lengthComputable) {
			const pct = Math.round((e.loaded / e.total) * 100);
			$bar.css("width", pct + "%");
			$status.text(__("Uploading {0}... {1}%", [file.name, pct]));
		}
	};

	xhr.onload = () => {
		if (xhr.status === 200) {
			const resp = JSON.parse(xhr.responseText);
			if (resp.exc) {
				$status.text(__("Upload failed"));
				frappe.show_alert({ message: __("Upload failed"), indicator: "red" });
				return;
			}
			const doc = resp.message;
			frappe.show_alert({ message: __("File uploaded: {0}", [doc.file_name]), indicator: "green" });
			frappe.set_route("Form", "Drive File", doc.name);
		} else {
			$status.text(__("Upload failed"));
			frappe.show_alert({ message: __("Upload failed"), indicator: "red" });
		}
	};

	xhr.onerror = () => {
		$status.text(__("Upload failed"));
		frappe.show_alert({ message: __("Upload failed"), indicator: "red" });
	};

	xhr.send(formData);
}

// ============================================================
// Preview rendering
// ============================================================

function render_preview(frm) {
	const url = frm.doc.file_url;
	const ext = (frm.doc.extension || "").toLowerCase();
	const mime = frm.doc.mime_type || "";
	const $wrapper = frm.fields_dict.preview_html.$wrapper;
	// Wrap in a font-size-controlled container
	$wrapper.html('<div class="drive-preview" style="font-size: 14px;"></div>');
	const $target = $wrapper.find(".drive-preview");

	// Image
	if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext)) {
		$target.html(`
			<div class="text-center" style="padding: 16px; background: var(--bg-light-gray); border-radius: 8px;">
				<img src="${url}" alt="${frappe.utils.escape_html(frm.doc.file_name)}"
					style="max-width: 100%; max-height: 500px; border-radius: 4px; cursor: pointer;"
					onclick="window.open('${url}')" title="${__("Click to open full size")}" />
			</div>
		`);
		return;
	}

	// PDF
	if (ext === "pdf" || mime === "application/pdf") {
		$target.html(`
			<div style="border-radius: 8px; overflow: hidden;">
				<iframe src="${url}" style="width: 100%; height: 600px; border: none;"></iframe>
			</div>
		`);
		return;
	}

	// Video
	if (["mp4", "webm", "ogv", "mov", "avi"].includes(ext) || mime.startsWith("video/")) {
		$target.html(`
			<div style="padding: 16px; background: var(--bg-light-gray); border-radius: 8px;">
				<video controls style="width: 100%; max-height: 500px;">
					<source src="${url}" type="${mime || "video/" + ext}">
					${__("Your browser does not support video playback.")}
				</video>
			</div>
		`);
		return;
	}

	// Audio
	if (["mp3", "wav", "ogg", "flac", "aac", "m4a", "wma"].includes(ext) || mime.startsWith("audio/")) {
		$target.html(`
			<div style="padding: 24px; background: var(--bg-light-gray); border-radius: 8px;">
				<div class="text-center mb-3">
					<i class="fa fa-music" style="font-size: 48px; color: var(--text-muted);"></i>
					<div class="mt-2 text-muted">${frappe.utils.escape_html(frm.doc.file_name)}</div>
				</div>
				<audio controls style="width: 100%;">
					<source src="${url}" type="${mime || "audio/" + ext}">
					${__("Your browser does not support audio playback.")}
				</audio>
			</div>
		`);
		return;
	}

	// Markdown — render as HTML
	if (ext === "md") {
		fetch(url)
			.then((r) => r.text())
			.then((text) => {
				const rendered = frappe.markdown(text);
				$target.html(`
					<div style="background: var(--fg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 24px; max-height: 600px; overflow: auto;">
						<div class="ql-editor read-mode">${rendered}</div>
					</div>
				`);
			})
			.catch(() => $target.html(file_icon_html(ext, frm.doc)));
		return;
	}

	// CSV — render as table
	if (ext === "csv") {
		fetch(url)
			.then((r) => r.text())
			.then((text) => {
				$target.html(render_csv_table(text));
			})
			.catch(() => $target.html(file_icon_html(ext, frm.doc)));
		return;
	}

	// HTML — render in sandboxed iframe
	if (ext === "html" || ext === "htm") {
		$target.html(`
			<div style="border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
				<iframe sandbox="allow-same-origin" src="${url}"
					style="width: 100%; height: 500px; border: none; background: white;"></iframe>
			</div>
		`);
		return;
	}

	// Text / Code files — syntax display
	const text_exts = [
		"txt", "json", "xml", "py", "js", "ts", "jsx", "tsx",
		"css", "scss", "less", "log", "yml", "yaml", "toml", "ini", "cfg",
		"sh", "bash", "zsh", "sql", "r", "rb", "php", "java", "c", "cpp",
		"h", "go", "rs", "swift", "kt", "dart", "lua", "pl", "ex", "exs",
		"vue", "svelte", "env", "gitignore", "dockerignore", "editorconfig",
	];
	if (text_exts.includes(ext)) {
		fetch(url)
			.then((r) => r.text())
			.then((text) => {
				const escaped = frappe.utils.escape_html(text);
				const preview = escaped.length > 100000
					? escaped.substring(0, 100000) + "\n\n... (" + __("truncated") + ")"
					: escaped;
				$target.html(`
					<div style="background: var(--bg-light-gray); border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
						<div style="padding: 8px 16px; background: var(--bg-color); border-bottom: 1px solid var(--border-color);">
							<span class="text-muted small"><i class="fa fa-file-code"></i> ${frappe.utils.escape_html(frm.doc.file_name)}</span>
						</div>
						<pre style="max-height: 500px; overflow: auto; padding: 16px; margin: 0; font-size: 12px; line-height: 1.5;">${preview}</pre>
					</div>
				`);
			})
			.catch(() => $target.html(file_icon_html(ext, frm.doc)));
		return;
	}

	// Office documents — icon with info
	const office_exts = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp"];
	if (office_exts.includes(ext)) {
		$target.html(office_preview_html(ext, frm.doc));
		return;
	}

	// Fallback — file icon
	$target.html(file_icon_html(ext, frm.doc));
}

// ============================================================
// Preview helpers
// ============================================================

function render_csv_table(text) {
	const lines = text.split("\n").filter((l) => l.trim());
	const max_rows = 200;
	const display_lines = lines.slice(0, max_rows + 1);

	let table_html = '<div style="border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">';
	table_html += '<div style="max-height: 500px; overflow: auto;">';
	table_html += '<table class="table table-bordered table-sm" style="margin: 0; font-size: 12px;">';

	display_lines.forEach((line, idx) => {
		const cells = parse_csv_line(line);
		const tag = idx === 0 ? "th" : "td";
		const row_tag = idx === 0 ? "thead" : "";
		if (idx === 0) table_html += "<thead>";
		if (idx === 1) table_html += "<tbody>";
		table_html += "<tr>";
		cells.forEach((cell) => {
			table_html += `<${tag} style="white-space: nowrap;">${frappe.utils.escape_html(cell)}</${tag}>`;
		});
		table_html += "</tr>";
		if (idx === 0) table_html += "</thead>";
	});

	if (lines.length > max_rows + 1) {
		table_html += `<tr><td colspan="100" class="text-center text-muted">${__("Showing first {0} of {1} rows", [max_rows, lines.length - 1])}</td></tr>`;
	}

	table_html += "</tbody></table></div></div>";
	return table_html;
}

function parse_csv_line(line) {
	const cells = [];
	let current = "";
	let in_quotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (in_quotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				in_quotes = !in_quotes;
			}
		} else if (ch === "," && !in_quotes) {
			cells.push(current);
			current = "";
		} else {
			current += ch;
		}
	}
	cells.push(current);
	return cells;
}

function office_preview_html(ext, doc) {
	const icons = {
		doc: "fa-file-word", docx: "fa-file-word",
		xls: "fa-file-excel", xlsx: "fa-file-excel",
		ppt: "fa-file-powerpoint", pptx: "fa-file-powerpoint",
		odt: "fa-file-word", ods: "fa-file-excel", odp: "fa-file-powerpoint",
	};
	const colors = {
		doc: "#2b579a", docx: "#2b579a",
		xls: "#217346", xlsx: "#217346",
		ppt: "#d24726", pptx: "#d24726",
		odt: "#2b579a", ods: "#217346", odp: "#d24726",
	};
	const labels = {
		doc: "Word", docx: "Word",
		xls: "Excel", xlsx: "Excel",
		ppt: "PowerPoint", pptx: "PowerPoint",
		odt: "Writer", ods: "Calc", odp: "Impress",
	};
	const icon = icons[ext] || "fa-file";
	const color = colors[ext] || "var(--text-muted)";
	const label = labels[ext] || ext.toUpperCase();

	return `
		<div class="text-center" style="padding: 40px; background: var(--bg-light-gray); border-radius: 8px;">
			<i class="fa ${icon}" style="font-size: 72px; color: ${color};"></i>
			<div class="mt-3" style="font-size: 14px; font-weight: 500;">${frappe.utils.escape_html(doc.file_name)}</div>
			<div class="mt-1 text-muted">${label} &mdash; ${format_bytes(doc.file_size)}</div>
			<div class="mt-3">
				<a href="${doc.file_url}" target="_blank" class="btn btn-sm btn-primary">
					<i class="fa fa-download"></i> ${__("Download")}
				</a>
			</div>
		</div>
	`;
}

function file_icon_html(ext, doc) {
	const icons = {
		zip: "fa-file-archive", gz: "fa-file-archive", tar: "fa-file-archive",
		"7z": "fa-file-archive", rar: "fa-file-archive",
	};
	const icon = icons[(ext || "").toLowerCase()] || "fa-file";

	return `
		<div class="text-center" style="padding: 32px; background: var(--bg-light-gray); border-radius: 8px;">
			<i class="fa ${icon}" style="font-size: 64px; color: var(--text-muted);"></i>
			<div class="mt-3">${frappe.utils.escape_html(doc.file_name)}</div>
			<div class="text-muted">${format_bytes(doc.file_size)}</div>
			<a href="${doc.file_url}" target="_blank" class="btn btn-sm btn-default mt-3">
				<i class="fa fa-download"></i> ${__("Download")}
			</a>
		</div>
	`;
}

// ============================================================
// Actions (recovered from drive-browser)
// ============================================================

function share_dialog(frm) {
	const d = new frappe.ui.Dialog({
		title: __("Share File"),
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
		primary_action(values) {
			frappe.call({
				method: "lifegence_drive.drive.api.share.create_share",
				args: {
					shared_doctype: "Drive File",
					shared_name: frm.doc.name,
					shared_with: values.shared_with,
					permission_level: values.permission_level,
				},
				callback() {
					d.hide();
					frappe.show_alert({ message: __("Shared successfully"), indicator: "green" });
				},
			});
		},
	});
	d.show();
}

function generate_link(frm) {
	const d = new frappe.ui.Dialog({
		title: __("Generate Shareable Link"),
		fields: [
			{
				fieldname: "password",
				fieldtype: "Password",
				label: __("Password (optional)"),
			},
			{
				fieldname: "expires_in_days",
				fieldtype: "Int",
				label: __("Expires in (days)"),
				description: __("Leave empty for no expiration"),
			},
		],
		primary_action_label: __("Generate"),
		primary_action(values) {
			frappe.call({
				method: "lifegence_drive.drive.api.share.generate_link",
				args: {
					shared_doctype: "Drive File",
					shared_name: frm.doc.name,
					password: values.password || "",
					expires_in_days: values.expires_in_days || 0,
				},
				callback(r) {
					d.hide();
					if (r.message) {
						const link_url = window.location.origin + "/api/method/lifegence_drive.drive.api.file.download?share_link=" + r.message;
						frappe.msgprint({
							title: __("Shareable Link"),
							message: `<div class="mb-2">${__("Copy this link")}:</div>
								<div class="input-group">
									<input type="text" class="form-control" value="${link_url}" readonly id="share-link-input">
									<span class="input-group-btn">
										<button class="btn btn-default" onclick="
											document.getElementById('share-link-input').select();
											document.execCommand('copy');
											frappe.show_alert({message: '${__("Copied!")}', indicator: 'green'});
										"><i class="fa fa-copy"></i></button>
									</span>
								</div>`,
							indicator: "blue",
						});
					}
				},
			});
		},
	});
	d.show();
}

function toggle_favorite(frm) {
	frappe.call({
		method: "lifegence_drive.drive.api.favorite.toggle",
		args: {
			doctype: "Drive File",
			name: frm.doc.name,
		},
		callback(r) {
			const is_fav = r.message;
			frappe.show_alert({
				message: is_fav ? __("Added to favorites") : __("Removed from favorites"),
				indicator: is_fav ? "green" : "blue",
			});
		},
	});
}

function move_dialog(frm) {
	const d = new frappe.ui.Dialog({
		title: __("Move to Folder"),
		fields: [
			{
				fieldname: "target_folder",
				fieldtype: "Link",
				label: __("Target Folder"),
				options: "Drive Folder",
				description: __("Leave empty to move to root"),
			},
		],
		primary_action_label: __("Move"),
		primary_action(values) {
			frappe.call({
				method: "lifegence_drive.drive.api.file.move",
				args: {
					name: frm.doc.name,
					target_folder: values.target_folder || "",
				},
				callback() {
					d.hide();
					frappe.show_alert({ message: __("File moved"), indicator: "green" });
					frm.reload_doc();
				},
			});
		},
	});
	d.show();
}

function move_to_trash(frm) {
	frappe.confirm(
		__("Move {0} to trash?", [frm.doc.file_name]),
		() => {
			frappe.call({
				method: "lifegence_drive.drive.api.trash.move_to_trash",
				args: {
					doctype: "Drive File",
					name: frm.doc.name,
				},
				callback() {
					frappe.show_alert({ message: __("Moved to trash"), indicator: "orange" });
					frappe.set_route("List", "Drive File");
				},
			});
		}
	);
}

// ============================================================
// Version History
// ============================================================

function show_version_history(frm) {
	frappe.call({
		method: "lifegence_drive.drive.api.version.get_versions",
		args: { name: frm.doc.name },
		callback(r) {
			const versions = r.message || [];
			if (!versions.length) {
				frappe.msgprint(__("No version history available."));
				return;
			}

			const d = new frappe.ui.Dialog({
				title: __("Version History — {0}", [frm.doc.file_name]),
				size: "large",
			});

			let html = `<table class="table table-hover" style="font-size: 13px;">
				<thead><tr>
					<th>${__("Version")}</th>
					<th>${__("Size")}</th>
					<th>${__("Uploaded By")}</th>
					<th>${__("Date")}</th>
					<th>${__("Comment")}</th>
					<th></th>
				</tr></thead><tbody>`;

			for (const v of versions) {
				html += `<tr${v.is_current ? ' style="font-weight: 600;"' : ""}>
					<td>v${v.version_number} ${v.is_current ? '<span class="indicator-pill green">' + __("Current") + "</span>" : ""}</td>
					<td>${format_bytes(v.file_size)}</td>
					<td>${frappe.utils.escape_html(frappe.user.full_name(v.uploaded_by || ""))}</td>
					<td>${v.uploaded_at ? frappe.datetime.prettyDate(v.uploaded_at) : "-"}</td>
					<td>${frappe.utils.escape_html(v.comment || "")}</td>
					<td class="text-right">
						<a href="/api/method/lifegence_drive.drive.api.version.download_version?version_name=${v.name}"
							target="_blank" class="btn btn-xs btn-default" title="${__("Download")}">
							<i class="fa fa-download"></i>
						</a>
						${!v.is_current ? `<button class="btn btn-xs btn-primary btn-restore-version ml-1"
							data-version="${v.name}" title="${__("Restore")}">
							<i class="fa fa-undo"></i>
						</button>` : ""}
					</td>
				</tr>`;
			}

			html += "</tbody></table>";
			d.$body.html(html);

			d.$body.on("click", ".btn-restore-version", (e) => {
				const version_name = $(e.currentTarget).data("version");
				frappe.confirm(__("Restore this version? The current version will be saved in history."), () => {
					frappe.call({
						method: "lifegence_drive.drive.api.version.restore_version",
						args: { name: frm.doc.name, version_name },
						callback() {
							d.hide();
							frappe.show_alert({ message: __("Version restored"), indicator: "green" });
							frm.reload_doc();
						},
					});
				});
			});

			d.show();
		},
	});
}

function upload_new_version(frm) {
	const d = new frappe.ui.Dialog({
		title: __("Upload New Version"),
		fields: [
			{
				fieldname: "file_html",
				fieldtype: "HTML",
				options: '<input type="file" class="version-file-input form-control">',
			},
			{
				fieldname: "comment",
				fieldtype: "Small Text",
				label: __("Version Comment"),
			},
		],
		primary_action_label: __("Upload"),
		primary_action(values) {
			const file_input = d.$body.find(".version-file-input")[0];
			if (!file_input.files.length) {
				frappe.throw(__("Please select a file."));
				return;
			}

			const formData = new FormData();
			formData.append("file", file_input.files[0]);
			formData.append("name", frm.doc.name);
			formData.append("comment", values.comment || "");

			frappe.show_progress(__("Uploading..."), 0);

			const xhr = new XMLHttpRequest();
			xhr.open("POST", "/api/method/lifegence_drive.drive.api.version.upload_new_version");
			xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);

			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable) {
					frappe.show_progress(__("Uploading..."), Math.round((e.loaded / e.total) * 100));
				}
			};

			xhr.onload = () => {
				frappe.hide_progress();
				if (xhr.status === 200) {
					const resp = JSON.parse(xhr.responseText);
					if (resp.exc) {
						frappe.show_alert({ message: __("Upload failed"), indicator: "red" });
						return;
					}
					d.hide();
					frappe.show_alert({ message: __("New version uploaded"), indicator: "green" });
					frm.reload_doc();
				} else {
					frappe.show_alert({ message: __("Upload failed"), indicator: "red" });
				}
			};

			xhr.onerror = () => {
				frappe.hide_progress();
				frappe.show_alert({ message: __("Upload failed"), indicator: "red" });
			};

			xhr.send(formData);
		},
	});
	d.show();
}

// ============================================================
// Utilities
// ============================================================

function format_bytes(bytes) {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	let size = bytes;
	while (size >= 1024 && i < units.length - 1) {
		size /= 1024;
		i++;
	}
	return size.toFixed(i === 0 ? 0 : 1) + " " + units[i];
}
