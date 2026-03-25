frappe.ui.form.on("Drive Folder", {
	refresh(frm) {
		if (frm.is_new()) return;

		// Add "Upload File" button
		frm.add_custom_button(__("Upload File"), () => upload_to_folder(frm));

		render_file_list(frm);
		render_subfolder_list(frm);
	},
});

function render_file_list(frm) {
	// Remove previous section if re-rendering
	frm.fields_dict.file_list_html && frm.fields_dict.file_list_html.$wrapper.empty();

	frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Drive File",
			filters: { folder: frm.doc.name },
			fields: ["name", "file_name", "file_size", "mime_type", "extension", "modified"],
			order_by: "modified desc",
			limit_page_length: 100,
		},
		callback(r) {
			const files = r.message || [];
			const $wrapper = $(frm.fields_dict.file_list_html.wrapper);
			$wrapper.empty();

			if (!files.length) {
				$wrapper.html(
					`<div class="text-muted" style="padding: 24px; text-align: center;">${__("No files in this folder")}</div>`
				);
				return;
			}

			let html = `<div class="drive-file-list">
				<table class="table table-hover" style="font-size: 13px; margin: 0;">
					<thead><tr>
						<th></th>
						<th>${__("File Name")}</th>
						<th>${__("Size")}</th>
						<th>${__("Modified")}</th>
					</tr></thead><tbody>`;

			for (const f of files) {
				const icon = get_file_icon(f.extension, f.mime_type);
				html += `<tr class="drive-file-row" data-name="${f.name}" style="cursor: pointer;">
					<td style="width: 30px;"><i class="fa ${icon} text-muted"></i></td>
					<td>${frappe.utils.escape_html(f.file_name)}</td>
					<td class="text-muted">${format_bytes(f.file_size)}</td>
					<td class="text-muted">${frappe.datetime.prettyDate(f.modified)}</td>
				</tr>`;
			}

			html += `</tbody></table></div>`;
			$wrapper.html(html);

			$wrapper.find(".drive-file-row").on("click", function () {
				frappe.set_route("Form", "Drive File", $(this).data("name"));
			});
		},
	});
}

function render_subfolder_list(frm) {
	frm.fields_dict.subfolder_list_html && frm.fields_dict.subfolder_list_html.$wrapper.empty();

	frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Drive Folder",
			filters: { parent_folder: frm.doc.name },
			fields: ["name", "folder_name", "modified"],
			order_by: "folder_name asc",
			limit_page_length: 100,
		},
		callback(r) {
			const folders = r.message || [];
			const $wrapper = $(frm.fields_dict.subfolder_list_html.wrapper);
			$wrapper.empty();

			if (!folders.length) {
				$wrapper.html(
					`<div class="text-muted" style="padding: 12px; text-align: center;">${__("No subfolders")}</div>`
				);
				return;
			}

			let html = `<div class="drive-subfolder-list">
				<table class="table table-hover" style="font-size: 13px; margin: 0;">
					<tbody>`;

			for (const f of folders) {
				html += `<tr class="drive-folder-row" data-name="${f.name}" style="cursor: pointer;">
					<td style="width: 30px;"><i class="fa fa-folder text-warning"></i></td>
					<td>${frappe.utils.escape_html(f.folder_name)}</td>
					<td class="text-muted">${frappe.datetime.prettyDate(f.modified)}</td>
				</tr>`;
			}

			html += `</tbody></table></div>`;
			$wrapper.html(html);

			$wrapper.find(".drive-folder-row").on("click", function () {
				frappe.set_route("Form", "Drive Folder", $(this).data("name"));
			});
		},
	});
}

function upload_to_folder(frm) {
	const d = new frappe.ui.Dialog({
		title: __("Upload File to {0}", [frm.doc.folder_name]),
		fields: [
			{
				fieldname: "file_html",
				fieldtype: "HTML",
				options: `<div class="drive-folder-upload-zone" style="
					padding: 36px 24px; background: var(--bg-light-gray);
					border: 2px dashed var(--border-color); border-radius: 8px;
					text-align: center; cursor: pointer;
				">
					<i class="fa fa-cloud-upload" style="font-size: 36px; color: var(--text-muted);"></i>
					<div class="mt-2">${__("Click or drop file here")}</div>
					<input type="file" class="folder-file-input" style="display: none;" multiple>
					<div class="upload-status mt-2 text-muted" style="display: none;"></div>
				</div>`,
			},
		],
	});

	const $zone = d.$body.find(".drive-folder-upload-zone");
	const $input = d.$body.find(".folder-file-input");
	const $status = d.$body.find(".upload-status");

	$zone.on("click", (e) => {
		if (!$(e.target).is("input")) $input.trigger("click");
	});

	$zone.on("dragover", (e) => {
		e.preventDefault();
		$zone.css("border-color", "var(--primary)");
	});
	$zone.on("dragleave drop", (e) => {
		e.preventDefault();
		$zone.css("border-color", "var(--border-color)");
	});
	$zone.on("drop", (e) => {
		e.preventDefault();
		const files = e.originalEvent.dataTransfer.files;
		if (files.length) do_folder_upload(frm, d, files, $status);
	});

	$input.on("change", () => {
		if ($input[0].files.length) do_folder_upload(frm, d, $input[0].files, $status);
	});

	d.show();
	d.$wrapper.find(".btn-modal-primary").hide();
}

function do_folder_upload(frm, dialog, files, $status) {
	let completed = 0;
	const total = files.length;
	$status.show().text(__("Uploading {0} file(s)...", [total]));

	Array.from(files).forEach((file) => {
		const formData = new FormData();
		formData.append("file", file);
		formData.append("folder", frm.doc.name);
		formData.append("is_private", frm.doc.is_private || 0);

		const xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/method/lifegence_drive.drive.api.file.upload");
		xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);

		xhr.onload = () => {
			completed++;
			$status.text(__("Uploaded {0}/{1}", [completed, total]));
			if (completed === total) {
				frappe.show_alert({ message: __("{0} file(s) uploaded", [total]), indicator: "green" });
				dialog.hide();
				render_file_list(frm);
			}
		};

		xhr.onerror = () => {
			completed++;
			frappe.show_alert({ message: __("Failed to upload {0}", [file.name]), indicator: "red" });
			if (completed === total) {
				dialog.hide();
				render_file_list(frm);
			}
		};

		xhr.send(formData);
	});
}

function get_file_icon(ext, mime) {
	ext = (ext || "").toLowerCase();
	mime = mime || "";
	if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) return "fa-file-image";
	if (ext === "pdf" || mime === "application/pdf") return "fa-file-pdf";
	if (["doc", "docx", "odt"].includes(ext)) return "fa-file-word";
	if (["xls", "xlsx", "ods", "csv"].includes(ext)) return "fa-file-excel";
	if (["ppt", "pptx", "odp"].includes(ext)) return "fa-file-powerpoint";
	if (["zip", "gz", "tar", "7z", "rar"].includes(ext)) return "fa-file-archive";
	if (["mp4", "webm", "mov", "avi"].includes(ext) || mime.startsWith("video/")) return "fa-file-video";
	if (["mp3", "wav", "ogg"].includes(ext) || mime.startsWith("audio/")) return "fa-file-audio";
	if (["json", "xml", "py", "js", "ts", "html", "css", "sh", "sql"].includes(ext)) return "fa-file-code";
	if (["txt", "md", "log"].includes(ext)) return "fa-file-alt";
	return "fa-file";
}

function format_bytes(bytes) {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	let i = 0;
	let size = bytes;
	while (size >= 1024 && i < units.length - 1) {
		size /= 1024;
		i++;
	}
	return size.toFixed(i === 0 ? 0 : 1) + " " + units[i];
}
