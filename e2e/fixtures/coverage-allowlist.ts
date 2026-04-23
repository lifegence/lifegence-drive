export const KNOWN_UI_HIDDEN_DOCTYPES = new Set<string>([]);
export const KNOWN_UNCOVERED_APIS = new Set<string>([
  // File upload/download endpoints are not exercised by smoke suite.
  'lifegence_drive.drive.api.files.upload_file',
  'lifegence_drive.drive.api.files.download_file',
]);
export const KNOWN_DIRECT_ENTRY_PAGES = new Set<string>([]);
