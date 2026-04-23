import { createLegacyRedirectSpec } from '@lifegence/e2e-common';

createLegacyRedirectSpec({
  paths: [
    { legacy: '/app/drive', canonical: '/desk/drive' },
    { legacy: '/app/drive-file', canonical: '/desk/drive-file' },
    { legacy: '/app/drive-folder', canonical: '/desk/drive-folder' },
  ],
});
