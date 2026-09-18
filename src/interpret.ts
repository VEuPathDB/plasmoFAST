import type { AnalysisResult } from './types';

export type StrainCall =
  | { verdict: 'strain'; strain: string }
  | { verdict: 'mixed' }
  | { verdict: 'notLabStrain' };

/** Minimum number of non-low-coverage positions a strain needs before it can be called. */
const MIN_COVERED_POSITIONS = 50;
/** Fraction of covered positions that must agree for a specific/mixed call. */
const CALL_THRESHOLD = 0.90;

/**
 * Applies the manuscript's strain-calling rule to an analysis result: only call a
 * strain (or "mixed") when every strain has enough covered positions to be
 * confident, since field and non-Pf samples otherwise get spuriously called.
 */
export function callStrain(result: AnalysisResult): StrainCall {
  const coverage = Object.entries(result).map(([strain, counts]) => {
    const covered = counts.specific + counts.nonspecific + counts.mixed;
    return { strain, covered, specific: counts.specific, mixed: counts.mixed };
  });

  if (coverage.some(({ covered }) => covered < MIN_COVERED_POSITIONS)) {
    return { verdict: 'notLabStrain' };
  }

  const specificMatch = coverage.find(({ specific, covered }) => specific / covered >= CALL_THRESHOLD);
  if (specificMatch) return { verdict: 'strain', strain: specificMatch.strain };

  const mixedMatch = coverage.some(({ mixed, covered }) => mixed / covered >= CALL_THRESHOLD);
  if (mixedMatch) return { verdict: 'mixed' };

  return { verdict: 'notLabStrain' };
}
