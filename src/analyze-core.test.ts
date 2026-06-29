import { runAnalysis, type WorkerLike } from './analyze-core';
import type { AnalysisResult } from './types';

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  posted: unknown[] = [];

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Simulate a message from the worker back to the main thread. */
  emit(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }
}

function fakeFile(name = 'sample.fastq'): File {
  return { name, size: 100 } as File;
}

const SAMPLE_RESULT: AnalysisResult = {
  NF54_3D7: { specific: 1, nonspecific: 0, mixed: 0, lowCoverage: 0 },
};

test('rejects immediately when the signal is already aborted, without creating a worker', async () => {
  const controller = new AbortController();
  controller.abort();
  let created = false;
  const factory = () => {
    created = true;
    return new FakeWorker();
  };

  await expect(
    runAnalysis(fakeFile(), { signal: controller.signal }, factory)
  ).rejects.toBe(controller.signal.reason);
  expect(created).toBe(false);
});

test('terminates the worker and rejects when the signal aborts mid-analysis', async () => {
  const controller = new AbortController();
  const worker = new FakeWorker();
  const promise = runAnalysis(fakeFile(), { signal: controller.signal }, () => worker);

  controller.abort();

  await expect(promise).rejects.toBe(controller.signal.reason);
  expect(worker.terminated).toBe(true);
});

test('resolves with the result and ignores a later abort', async () => {
  const controller = new AbortController();
  const worker = new FakeWorker();
  const promise = runAnalysis(fakeFile(), { signal: controller.signal }, () => worker);

  worker.emit({ type: 'result', data: SAMPLE_RESULT });

  await expect(promise).resolves.toEqual(SAMPLE_RESULT);
  expect(worker.terminated).toBe(true);
  expect(() => controller.abort()).not.toThrow();
});

test('forwards progress events to onProgress', async () => {
  const worker = new FakeWorker();
  const events: Array<{ bytesRead: number; totalBytes: number }> = [];
  const promise = runAnalysis(
    fakeFile(),
    { onProgress: (e) => events.push(e) },
    () => worker
  );

  worker.emit({ type: 'progress', bytesRead: 50, totalBytes: 100 });
  worker.emit({ type: 'result', data: SAMPLE_RESULT });

  await promise;
  expect(events).toEqual([{ bytesRead: 50, totalBytes: 100 }]);
});

test('forwards partial snapshots to onPartialResult without settling the promise', async () => {
  const worker = new FakeWorker();
  const partials: AnalysisResult[] = [];
  const promise = runAnalysis(
    fakeFile(),
    { onPartialResult: (r) => partials.push(r) },
    () => worker
  );

  const snapshot: AnalysisResult = {
    NF54_3D7: { specific: 0, nonspecific: 0, mixed: 1, lowCoverage: 2 },
  };
  worker.emit({ type: 'partial', data: snapshot });
  worker.emit({ type: 'result', data: SAMPLE_RESULT });

  await expect(promise).resolves.toEqual(SAMPLE_RESULT);
  expect(partials).toEqual([snapshot]);
});

test('requests partial emission only when onPartialResult is provided', () => {
  const withCb = new FakeWorker();
  runAnalysis(fakeFile(), { onPartialResult: () => {} }, () => withCb);
  expect(withCb.posted[0]).toMatchObject({ emitPartial: true });

  const withoutCb = new FakeWorker();
  runAnalysis(fakeFile(), {}, () => withoutCb);
  expect(withoutCb.posted[0]).toMatchObject({ emitPartial: false });
});

test('ignores a partial snapshot that arrives after the promise has settled', async () => {
  const worker = new FakeWorker();
  const partials: AnalysisResult[] = [];
  const promise = runAnalysis(
    fakeFile(),
    { onPartialResult: (r) => partials.push(r) },
    () => worker
  );

  worker.emit({ type: 'result', data: SAMPLE_RESULT });
  await promise;
  worker.emit({ type: 'partial', data: SAMPLE_RESULT });

  expect(partials).toEqual([]);
});

test('rejects unsupported file types without creating a worker', async () => {
  let created = false;
  const factory = () => {
    created = true;
    return new FakeWorker();
  };

  await expect(
    runAnalysis(fakeFile('reads.txt'), {}, factory)
  ).rejects.toThrow(/Unsupported file type/);
  expect(created).toBe(false);
});
