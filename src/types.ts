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
  /** Abort the analysis early; terminates the worker and rejects the promise. */
  signal?: AbortSignal;
};
