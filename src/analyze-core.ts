import type { AnalysisResult, AnalyzeOptions } from './types';

export const VALID_EXTENSIONS = ['.fastq', '.fastq.gz', '.fq', '.fq.gz'];

/** Minimal structural subset of the DOM `Worker` interface that `runAnalysis` depends on. */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export type WorkerFactory = () => WorkerLike;

/**
 * Worker-agnostic analysis coordinator. The real `analyze()` wrapper supplies a
 * factory that spawns the bundled Web Worker; tests supply a fake. Keeping this
 * free of `new Worker` / `import.meta` lets it run under the node test environment.
 */
export function runAnalysis(
  file: File,
  options: AnalyzeOptions,
  createWorker: WorkerFactory
): Promise<AnalysisResult> {
  const { referenceUrl, onProgress, signal } = options;

  if (!VALID_EXTENSIONS.some((ext) => file.name.endsWith(ext))) {
    return Promise.reject(
      new Error(`Unsupported file type: "${file.name}". Expected .fastq or .fastq.gz`)
    );
  }

  if (signal?.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise((resolve, reject) => {
    const worker = createWorker();
    let settled = false;

    const onAbort = () => {
      if (settled) return;
      settled = true;
      worker.terminate();
      reject(signal!.reason);
    };

    const finish = (run: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      worker.terminate();
      run();
    };

    worker.onmessage = (event: MessageEvent) => {
      const { type, data, message } = event.data;
      if (type === 'progress') {
        onProgress?.({ bytesRead: event.data.bytesRead, totalBytes: event.data.totalBytes });
      } else if (type === 'result') {
        finish(() => resolve(data as AnalysisResult));
      } else if (type === 'error') {
        finish(() => reject(new Error(message)));
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      finish(() =>
        reject(
          new Error(`Worker failed to load: ${event.message} (${event.filename}:${event.lineno})`)
        )
      );
    };

    signal?.addEventListener('abort', onAbort);
    worker.postMessage({ file, referenceUrl });
  });
}
