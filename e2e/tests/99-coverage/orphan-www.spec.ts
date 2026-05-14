import * as path from 'path';
import { createOrphanWwwSpec } from '@lifegence/e2e-common';
import { KNOWN_DIRECT_ENTRY_PAGES } from '../../fixtures/coverage-allowlist';

createOrphanWwwSpec({
  appRoot: path.resolve(__dirname, '../../../lifegence_drive'),
  entryPoints: ['/', '/desk'],
  allowlist: KNOWN_DIRECT_ENTRY_PAGES,
});
