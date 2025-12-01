import * as fs from 'fs';
import * as path from 'path';
import os from 'os';

// Make a temp data dir for tests and set DATA_DIR env var
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pourover-test-'));
console.log('Using temp test data dir:', tempDir);

// Ensure empty data files
['brews.json', 'recipes.json', 'grinders.json', 'beans.json'].forEach(fn => {
  const p = path.join(tempDir, fn);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, '[]');
  }
});

process.env.DATA_DIR = tempDir;
// Ensure JWT_SECRET is set for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');

// Export for other test files (optionally)
export default tempDir;
