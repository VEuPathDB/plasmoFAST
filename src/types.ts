export type StrainResult = {
  specific: number;
  nonspecific: number;
  mixed: number;
  lowCoverage: number;
};

export type AnalysisResult = Record<string, StrainResult>;

export type ProgressEvent = {
  bytesRead: number;
  totalBytes: number;
};

export type AnalyzeOptions = {
  referenceUrl?: string;
  onProgress?: (e: ProgressEvent) => void;
  /**
   * Receive periodic classified snapshots as the file streams, enabling early-exit
   * decisions (inspect a snapshot, then `signal.abort()` once confident). Snapshots
   * have the same shape as the final result. Only emitted when this callback is set.
   */
  onPartialResult?: (result: AnalysisResult) => void;
  /** Abort the analysis early; terminates the worker and rejects the promise. */
  signal?: AbortSignal;
};
