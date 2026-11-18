import type { AnalysisResult, StrainResult } from './types';
import type { ParsedReference } from './reference';
import { getCategory } from './classify';

/**
 * Build the per-strain classified breakdown from the current position counts.
 * Used for both periodic partial snapshots and the final result, so the two
 * always share identical classification logic.
 */
export function buildResult(ref: ParsedReference): AnalysisResult {
  const result: AnalysisResult = {};
  for (const strain of ref.strains) {
    result[strain] = { specific: 0, nonspecific: 0, mixed: 0, lowCoverage: 0 };
  }
  for (const { specCount, nonspecCount, strain } of ref.positions.values()) {
    (result[strain] as StrainResult)[getCategory(specCount, nonspecCount)]++;
  }
  return result;
}
