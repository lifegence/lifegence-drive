import * as path from 'path';
import { createOrphanDocTypeSpec } from '@lifegence/e2e-common';
import { KNOWN_UI_HIDDEN_DOCTYPES } from '../../fixtures/coverage-allowlist';

createOrphanDocTypeSpec({
  modules: ['Drive'],
  appRoot: path.resolve(__dirname, '../../../lifegence_drive'),
  entryPoints: ['/desk', '/desk/drive'],
  allowlist: KNOWN_UI_HIDDEN_DOCTYPES,
});
