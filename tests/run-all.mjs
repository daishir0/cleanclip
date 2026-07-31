// Runs every tests/*.test.mjs in a child process and aggregates results.
// Usage: node tests/run-all.mjs   (wired to `npm test`)
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDir = dirname(fileURLToPath(import.meta.url));
const files = (await readdir(testsDir)).filter(f => f.endsWith('.test.mjs')).sort();

let failedFiles = 0;
for (const file of files) {
  console.log(`\n===== ${file} =====`);
  const r = spawnSync(process.execPath, [join(testsDir, file)], { stdio: 'inherit' });
  if (r.status !== 0) failedFiles += 1;
}

console.log(`\n${files.length} test file(s), ${failedFiles} failed`);
process.exit(failedFiles > 0 ? 1 : 0);
