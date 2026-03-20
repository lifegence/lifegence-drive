frappe.ui.form.on("Drive File", {
	refresh(frm) {
		if (!frm.doc.file_url) return;

		// Download button
		frm.add_custom_button(__("Download"), () => {
			window.open(frm.doc.file_url);
		}, null, "primary");

		// Open in Drive Browser button
		frm.add_custom_button(__("Open in Drive"), () => {
			frappe.set_route("drive-browser");
		});

		// Render preview
		render_preview(frm);
	},
});

function render_preview(frm) {
	const url = frm.doc.file_url;
	const ext = (frm.doc.extension || "").toLowerCase();
	const mime = frm.doc.mime_type || "";

	let html = "";

	if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
		html = `
			<div class="text-center" style="padding: 16px; background: var(--bg-light-gray); border-radius: 8px;">
				<img src="${url}" alt="${frappe.utils.escape_html(frm.doc.file_name)}"
					style="max-width: 100%; max-height: 500px; border-radius: 4px; cursor: pointer;"
					onclick="window.open('${url}')" title="${__("Click to open full size")}" />
			</div>
		`;
	} else if (ext === "pdf") {
		html = `
			<div style="border-radius: 8px; overflow: hidden;">
				<iframe src="${url}" style="width: 100%; height: 600px; border: none;"></iframe>
			</div>
		`;
	} else if (["mp4", "webm", "ogg"].includes(ext)) {
		html = `
			<div style="padding: 16px; background: var(--bg-light-gray); border-radius: 8px;">
				<video controls style="width: 100%; max-height: 500px;">
					<source src="${url}" type="${mime}">
				</video>
			</div>
		`;
	} else if (["mp3", "wav", "ogg"].includes(ext) && mime.startsWith("audio/")) {
		html = `
			<div style="padding: 16px; background: var(--bg-light-gray); border-radius: 8px;">
				<audio controls style="width: 100%;">
					<source src="${url}" type="${mime}">
				</audio>
			</div>
		`;
	} else if (["txt", "csv", "json", "xml", "md", "py", "js", "html", "css", "log", "yml", "yaml"].includes(ext)) {
		// Fetch and display text content
		fetch(url)
			.then((r) => r.text())
			.then((text) => {
				const escaped = frappe.utils.escape_html(text);
				const preview = escaped.length > 50000 ? escaped.substring(0, 50000) + "\n\n... (truncated)" : escaped;
				frm.fields_dict.preview_html.$wrapper.html(`
					<div style="background: var(--bg-light-gray); border-radius: 8px; overflow: hidden;">
						<pre style="max-height: 500px; overflow: auto; padding: 16px; margin: 0; font-size: 12px;">${preview}</pre>
					</div>
				`);
			})
			.catch(() => {
				frm.fields_dict.preview_html.$wrapper.html(file_icon_html(ext, frm.doc));
			});
		return;
	} else {
		html = file_icon_html(ext, frm.doc);
	}

	frm.fields_dict.preview_html.$wrapper.html(html);
}

function file_icon_html(ext, doc) {
	const icons = {
		pdf: "fa-file-pdf", doc: "fa-file-word", docx: "fa-file-word",
		xls: "fa-file-excel", xlsx: "fa-file-excel",
		ppt: "fa-file-powerpoint", pptx: "fa-file-powerpoint",
		zip: "fa-file-archive", gz: "fa-file-archive", tar: "fa-file-archive",
	};
	const icon = icons[(ext || "").toLowerCase()] || "fa-file";
	const size = format_bytes(doc.file_size);

	return `
		<div class="text-center" style="padding: 32px; background: var(--bg-light-gray); border-radius: 8px;">
			<i class="fa ${icon}" style="font-size: 64px; color: var(--text-muted);"></i>
			<div class="mt-3 text-muted">
				${frappe.utils.escape_html(doc.file_name)} &mdash; ${size}
			</div>
			<a href="${doc.file_url}" target="_blank" class="btn btn-sm btn-default mt-3">
				<i class="fa fa-download"></i> ${__("Download")}
			</a>
		</div>
	`;
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
	return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
