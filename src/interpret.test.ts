import { callStrain } from './interpret';
import type { AnalysisResult } from './types';

function result(overrides: Record<string, AnalysisResult[string]>): AnalysisResult {
  const base: AnalysisResult = {
    W2_Dd2: { specific: 0, nonspecific: 60, mixed: 0, lowCoverage: 0 },
    NF54_3D7: { specific: 0, nonspecific: 60, mixed: 0, lowCoverage: 0 },
    HB3: { specific: 0, nonspecific: 60, mixed: 0, lowCoverage: 0 },
    GB4: { specific: 0, nonspecific: 60, mixed: 0, lowCoverage: 0 },
    D10: { specific: 0, nonspecific: 60, mixed: 0, lowCoverage: 0 },
    ['7G8']: { specific: 0, nonspecific: 60, mixed: 0, lowCoverage: 0 },
  };
  return { ...base, ...overrides };
}

describe('callStrain', () => {
  test('calls a strain when >= 90% of its covered positions are specific', () => {
    const r = result({ NF54_3D7: { specific: 54, nonspecific: 6, mixed: 0, lowCoverage: 0 } }); // 90%
    expect(callStrain(r)).toEqual({ verdict: 'strain', strain: 'NF54_3D7' });
  });

  test('does not call a strain just below the 90% specific threshold', () => {
    const r = result({ NF54_3D7: { specific: 53, nonspecific: 7, mixed: 0, lowCoverage: 0 } }); // ~88.3%
    expect(callStrain(r)).toEqual({ verdict: 'notLabStrain' });
  });

  test('reports mixed when >= 90% of a strain\'s covered positions are mixed', () => {
    const r = result({ NF54_3D7: { specific: 0, nonspecific: 6, mixed: 54, lowCoverage: 0 } }); // 90% mixed
    expect(callStrain(r)).toEqual({ verdict: 'mixed' });
  });

  test('reports notLabStrain when no strain reaches 90% specific or mixed', () => {
    const r = result({ NF54_3D7: { specific: 30, nonspecific: 30, mixed: 0, lowCoverage: 0 } }); // 50%
    expect(callStrain(r)).toEqual({ verdict: 'notLabStrain' });
  });

  test('reports notLabStrain when covered positions fall one short of the 50-position gate', () => {
    const r = result({ NF54_3D7: { specific: 44, nonspecific: 5, mixed: 0, lowCoverage: 0 } }); // 49 covered
    expect(callStrain(r)).toEqual({ verdict: 'notLabStrain' });
  });

  test('reports notLabStrain when one strain has insufficient coverage even if another strain calls cleanly', () => {
    const r = result({
      NF54_3D7: { specific: 54, nonspecific: 6, mixed: 0, lowCoverage: 0 }, // would call on its own
      HB3: { specific: 0, nonspecific: 10, mixed: 0, lowCoverage: 0 }, // only 10 covered
    });
    expect(callStrain(r)).toEqual({ verdict: 'notLabStrain' });
  });

  test('exactly 50 covered positions satisfies the coverage gate', () => {
    const r = result({ NF54_3D7: { specific: 45, nonspecific: 5, mixed: 0, lowCoverage: 0 } }); // 50 covered, 90% specific
    expect(callStrain(r)).toEqual({ verdict: 'strain', strain: 'NF54_3D7' });
  });
});
