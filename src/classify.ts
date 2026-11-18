import type { StrainResult } from './types';

export function getCategory(specCount: number, nonspecCount: number): keyof StrainResult {
  const total = specCount + nonspecCount;
  if (total < 30) return 'lowCoverage';
  if (specCount / total >= 0.90) return 'specific';
  if (specCount / total <= 0.10) return 'nonspecific';
  return 'mixed';
}
