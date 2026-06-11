# plasmoFAST — TypeScript Library

A client-side TypeScript library that detects *Plasmodium falciparum* lab strains directly from FASTQ files in the browser. No KMC binary, no Python, no server required.

## How it works

Instead of running KMC to count all k-mers and then filtering, this library counts only the ~10,156 reference 25-mers (from `reference/25mer_rc_list.tsv`) directly from the FASTQ stream. The counting loop runs in a Web Worker so the UI stays responsive. Gzip-compressed `.fastq.gz` files are supported natively via the browser's `DecompressionStream` API.

## Prerequisites

- **Node 24** (recommended — pin with [nvm](https://github.com/nvm-sh/nvm) or [nodenv](https://github.com/nodenv/nodenv))
- **Yarn** via [Corepack](https://nodejs.org/api/corepack.html) (strongly recommended over npm)

```bash
corepack enable
```

Corepack reads the `packageManager` field in `package.json` and automatically uses the correct Yarn version. No global Yarn install needed.

## Setup

```bash
yarn install
```

## Development (test app)

```bash
yarn dev
```

Opens a local Vite dev server with a minimal file-picker UI. Drop in a `.fastq` or `.fastq.gz` file to test the library end-to-end. Compare results against the Python pipeline on the same file to verify correctness.

## Build (library)

```bash
yarn build
```

Outputs to `dist/`:
- `dist/index.js` — ES module library entry point
- `dist/index.d.ts` — TypeScript declarations
- `dist/counter.worker.js` — Web Worker bundle (referenced by `index.js` via `new URL`)

## Tests

```bash
yarn test
```

Unit tests cover `classify.ts`, `reference.ts`, and `parser.ts` with small synthetic fixtures. No real sequencing data required.

## Type checking

```bash
yarn typecheck
```

## Consumer usage (webpack 5 / Vite)

Install (or link locally during development):

```bash
yarn add @veupathdb/plasmofast
# or for local development:
yarn link /path/to/plasmoFAST
```

Import and use:

```ts
import { analyze } from '@veupathdb/plasmofast';
import type { AnalysisResult, ProgressEvent } from '@veupathdb/plasmofast';

const result: AnalysisResult = await analyze(fastqFile, {
  onProgress: ({ bytesRead, totalBytes }: ProgressEvent) => {
    console.log(`${Math.round(bytesRead / totalBytes * 100)}%`);
  },
});

// result: { NF54_3D7: { specific: 12, nonspecific: 3, mixed: 1, lowCoverage: 0 }, ... }
```

The `referenceUrl` option overrides the bundled `reference/25mer_rc_list.tsv` if you need to use an updated reference file:

```ts
const result = await analyze(file, { referenceUrl: '/custom/kmers.tsv' });
```

webpack 5 handles the `new URL('./counter.worker.js', import.meta.url)` pattern inside the library natively — no special loader or config required.

## Repository layout

```
src/                    TypeScript library source
reference/              Curated 25-mer reference data (bundled with the library)
test-app/               Minimal Vite + vanilla HTML demo app
dist/                   Build output (gitignored)
```
