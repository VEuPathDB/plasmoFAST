import { buildResult } from './result';
import type { ParsedReference } from './reference';

function ref(
  strains: string[],
  positions: Array<{ id: string; specCount: number; nonspecCount: number; strain: string }>
): ParsedReference {
  return {
    kmers: new Map(),
    strains,
    positions: new Map(
      positions.map((p) => [p.id, { specCount: p.specCount, nonspecCount: p.nonspecCount, strain: p.strain }])
    ),
  };
}

test('classifies each position into its strain bucket', () => {
  const result = buildResult(
    ref(
      ['StrainA', 'StrainB'],
      [
        { id: 'chr1:1', specCount: 30, nonspecCount: 0, strain: 'StrainA' }, // specific
        { id: 'chr1:2', specCount: 0, nonspecCount: 30, strain: 'StrainA' }, // nonspecific
        { id: 'chr1:3', specCount: 15, nonspecCount: 15, strain: 'StrainA' }, // mixed
        { id: 'chr1:4', specCount: 5, nonspecCount: 5, strain: 'StrainA' }, // lowCoverage (<30)
        { id: 'chr1:5', specCount: 30, nonspecCount: 0, strain: 'StrainB' }, // specific
      ]
    )
  );

  expect(result).toEqual({
    StrainA: { specific: 1, nonspecific: 1, mixed: 1, lowCoverage: 1 },
    StrainB: { specific: 1, nonspecific: 0, mixed: 0, lowCoverage: 0 },
  });
});

test('returns all-zero buckets for a strain with no positions', () => {
  const result = buildResult(ref(['Empty'], []));
  expect(result).toEqual({
    Empty: { specific: 0, nonspecific: 0, mixed: 0, lowCoverage: 0 },
  });
});
