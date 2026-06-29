import type { AnalysisResult, AnalyzeOptions } from './types';
import { runAnalysis, type WorkerLike } from './analyze-core';

const defaultWorkerFactory = (): WorkerLike =>
  new Worker(new URL('./counter.worker.js', import.meta.url), { type: 'module' });

export function analyze(file: File, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  return runAnalysis(file, options, defaultWorkerFactory);
}
