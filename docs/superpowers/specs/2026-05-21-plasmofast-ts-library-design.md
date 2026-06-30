# plasmoFAST TypeScript Library — Design Spec

_Date: 2026-05-21_

## Context

plasmoFAST is a k-mer-based tool for detecting *P. falciparum* lab strains from sequencing data. The Python + bash + KMC pipeline has been ported to a standalone TypeScript library that:

- Runs entirely client-side (no server, no native binaries)
- Replaces KMC with targeted k-mer counting directly from FASTQ — only the ~10,156 reference 25-mers are counted, not all k-mers
- Can be imported into the `@veupathdb` web-monorepo (`~/Desktop/EDA/web-monorepo`)
- Is portable enough to contribute back to the upstream plasmoFAST fork
- Ships with a minimal Vite + vanilla HTML test app in the same repo

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Library build tool | esbuild (via `scripts/build.mjs`) | Vite library mode intercepts `new Worker(new URL(...))` and produces hashed absolute paths, breaking consumers; esbuild leaves the expression as-is |
| TypeScript declarations | tsc (`tsconfig.build.json`, `emitDeclarationOnly`) | esbuild doesn't emit `.d.ts`; tsc handles this separately |
| Dev server (test-app) | Vite | Works well for app mode; test-app's `vite.config.ts` imports library source directly |
| Worker bundling | `new URL('./counter.worker.js', import.meta.url)` in `dist/index.js` | webpack 5 in web-monorepo handles natively — no consumer config needed |
| Reference data | TSV bundled as string in `dist/counter.worker.js` via esbuild `loader: text` | Self-contained worker, no runtime fetch, works offline; `referenceUrl` option still accepts custom TSV URL |
| Strains | Derived from TSV at parse time | No hardcoded strain list — new strains added by editing the TSV only |
| Package manager | Yarn 4 via corepack | Matches web-monorepo; supply-chain protections via `enableImmutableInstalls` + `npmMinimalAgeGate` |

## Repository Structure

```
plasmoFAST/
├── src/
│   ├── index.ts              # public API barrel
│   ├── analyze.ts            # orchestration: spawns worker, wraps in Promise
│   ├── counter.worker.ts     # counting loop (runs inside Web Worker)
│   ├── parser.ts             # FASTQ streaming parser + gzip handling
│   ├── reference.ts          # TSV parse → Maps; loadReference() for custom URL
│   ├── classify.ts           # getCategory() pure function (port of get_category())
│   ├── types.ts              # shared TypeScript types
│   └── tsv.d.ts              # ambient module declaration for .tsv text imports
├── reference/
│   └── 25mer_rc_list.tsv     # curated 25-mer reference (moved from repo root)
├── test-app/
│   ├── index.html            # file picker, progress bar, results table
│   ├── main.ts               # imports analyze() from ../src/index.ts
│   ├── vite.config.ts        # Vite dev server
│   └── tsconfig.json         # extends root tsconfig, covers test-app/
├── scripts/
│   └── build.mjs             # esbuild (worker + library) + tsc (declarations)
├── docs/superpowers/specs/   # design documents
├── dist/                     # gitignored build output
├── vite.config.lib.ts        # kept for reference; build now uses scripts/build.mjs
├── tsconfig.json
├── tsconfig.build.json       # emitDeclarationOnly, excludes *.test.ts
├── jest.config.js
├── package.json
├── .yarnrc.yml
├── .node-version             # pins Node 24
└── .gitignore
```

## Public API

```ts
// src/index.ts exports:

export function analyze(file: File, options?: AnalyzeOptions): Promise<AnalysisResult>

export type StrainResult = {
  specific: number;
  nonspecific: number;
  mixed: number;
  lowCoverage: number;
};
export type AnalysisResult = Record<string, StrainResult>;
export type ProgressEvent  = { bytesRead: number; totalBytes: number };
export type AnalyzeOptions = { referenceUrl?: string; onProgress?: (e: ProgressEvent) => void };
```

Consumer usage:
```ts
import { analyze } from 'plasmofast';
const result = await analyze(file, { onProgress: setProgress });
// result: { NF54_3D7: { specific: 12, nonspecific: 3, mixed: 1, lowCoverage: 0 }, ... }
```

## Data Flow

```
Main thread                          Worker thread
──────────────────────────────────   ──────────────────────────────────
analyze(file, options)
  ├─ validate file extension
  ├─ new Worker(new URL('./counter.worker.js', import.meta.url))
  ├─ worker.postMessage({ file, referenceUrl })
  │                                    ├─ referenceUrl?
  │                                    │    yes → loadReference(url) [fetch]
  │                                    │    no  → parseReference(bundledTsv)
  │                                    ├─ file.stream()
  │                                    │    → DecompressionStream [if .gz]
  │                                    │    → TextDecoderStream
  │                                    │    → chunk → line buffer
  │                                    ├─ sequence lines (index % 4 === 1):
  │                                    │    slide 25-mer window → Map lookups
  │  ◀── { type: 'progress' }         ├─ postMessage every 10k reads
  │  ◀── { type: 'result', data }     └─ classify positions → AnalysisResult
  ├─ worker.terminate()
  └─ resolve Promise<AnalysisResult>
```

## Classification Logic

Direct port of `get_category()` from `parse_kmc_output.py` (`src/classify.ts`):

```ts
export function getCategory(specCount: number, nonspecCount: number): keyof StrainResult {
  const total = specCount + nonspecCount;
  if (total < 30)                   return 'lowCoverage';
  if (specCount / total >= 0.90)    return 'specific';
  if (specCount / total <= 0.10)    return 'nonspecific';
  return 'mixed';
}
```

## Build Output

```
dist/index.js          ~1 KB   Library entry; references worker via new URL
dist/counter.worker.js ~800 KB Worker bundle with TSV data inlined
dist/index.d.ts        +*.d.ts TypeScript declarations for all public modules
```

## Error Handling

| Scenario | Where caught | Behaviour |
|---|---|---|
| Wrong file extension | `analyze()` | Rejects immediately with descriptive `Error` |
| Reference fetch fails | Worker | Posts `error` → main thread rejects |
| Malformed TSV | Worker | Posts `error` → main thread rejects |
| Corrupt `.gz` | Worker (`DecompressionStream`) | Caught → posts `error` → rejects |
| Worker crash | `worker.onerror` | Rejects with `ErrorEvent` |
| Low coverage | `classify.ts` | Valid output category, not an error |

## Testing

Unit tests (Jest + ts-jest) — run with `yarn test`:

| File | What's tested |
|---|---|
| `classify.test.ts` | `getCategory()` at all boundary values |
| `reference.test.ts` | TSV parse, Map sizes, strain derivation from TSV |
| `parser.test.ts` | Chunk-boundary splits, mid-record splits, empty input |

End-to-end: manual via `yarn dev` — drop a real `.fastq.gz`, compare results table against Python script output on the same file.
