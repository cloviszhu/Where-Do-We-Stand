import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
// Only this fixed, generated directory is replaced.
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const [directory, route] of [['people', 'a'], ['archives', 'b']]) {
  const cwd = resolve(root, 'prototypes', directory);
  // Use Vite's relative base so fonts, scripts and data work under Pages subpaths.
  for (const args of [
    ['node_modules/typescript/bin/tsc', '--noEmit'],
    ['node_modules/vite/bin/vite.js', 'build', '--base=./'],
  ]) {
    const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
  cpSync(resolve(cwd, 'dist'), resolve(output, route), { recursive: true });
}
cpSync(resolve(root, 'site/index.html'), resolve(output, 'index.html'));
writeFileSync(resolve(output, '.nojekyll'), '');
console.log('Pages output: dist/ with independent a/ and b/ entries.');
