import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve('dist/DocsNexusPMS/Api/web.config');

if (!fs.existsSync(configPath)) {
  process.exit(0);
}

const original = fs.readFileSync(configPath, 'utf8');
const updated = original.replace('stdoutLogEnabled="false"', 'stdoutLogEnabled="true"');

if (updated !== original) {
  fs.writeFileSync(configPath, updated);
}
