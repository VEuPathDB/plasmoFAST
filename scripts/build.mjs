import { build } from 'esbuild';
import { execSync } from 'child_process';
import { rmSync, mkdirSync } from 'fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');

// 1. Bundle the worker (TSV inlined as text, fully self-contained)
await build({
  entryPoints: ['src/counter.worker.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/counter.worker.js',
  platform: 'browser',
  loader: { '.tsv': 'text' },
});

// 2. Bundle the library entry (new URL('./counter.worker.js') left as-is for webpack 5)
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/index.js',
  platform: 'browser',
});

// 3. Emit TypeScript declarations
execSync('tsc --project tsconfig.build.json', { stdio: 'inherit' });

console.log('Build complete.');
