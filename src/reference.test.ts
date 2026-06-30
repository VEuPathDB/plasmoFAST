import { parseReference, encodeKmer } from './reference';

const FIXTURE_TSV = `Chromosome\tPosition\tStrain specific kmer\tNonstrain specific kmer\tStrain
Pf3D7_01_v3\t130198\tCATTATTATTATACTTTATATCTAA\tCATTATTATTATTCTTTATATCTAA\tW2_Dd2
Pf3D7_01_v3\t130198\tTTAGATATAAAGTATAATAATAATG\tTTAGATATAAAGAATAATAATAATG\tW2_Dd2
Pf3D7_01_v3\t140820\tTATTGATCAAAGCACCATTCGTACC\tTATTGATCAAAGAACCATTCGTACC\t7G8
Pf3D7_01_v3\t140820\tGGTACGAATGGTGCTTTGATCAATA\tGGTACGAATGGTTCTTTGATCAATA\t7G8`;

describe('parseReference', () => {
  let ref: ReturnType<typeof parseReference>;

  beforeEach(() => {
    ref = parseReference(FIXTURE_TSV);
  });

  test('builds kmers map with spec + nonspec entry per TSV line', () => {
    expect(ref.kmers.size).toBe(8);
  });

  test('maps a specific kmer to its position entry, flagged spec', () => {
    const hit = ref.kmers.get(encodeKmer('CATTATTATTATACTTTATATCTAA'));
    expect(hit?.spec).toBe(true);
    expect(hit?.entry).toBe(ref.positions.get('Pf3D7_01_v3:130198'));
  });

  test('maps a nonspecific kmer to its position entry, flagged nonspec', () => {
    const hit = ref.kmers.get(encodeKmer('CATTATTATTATTCTTTATATCTAA'));
    expect(hit?.spec).toBe(false);
    expect(hit?.entry).toBe(ref.positions.get('Pf3D7_01_v3:130198'));
  });

  test('initialises position counts to zero', () => {
    const pos = ref.positions.get('Pf3D7_01_v3:130198');
    expect(pos).toEqual({ specCount: 0, nonspecCount: 0, strain: 'W2_Dd2' });
  });

  test('derives strain list from TSV — no hardcoded strains', () => {
    expect(ref.strains).toEqual(expect.arrayContaining(['W2_Dd2', '7G8']));
    expect(ref.strains).toHaveLength(2);
  });

  test('deduplicated positions: two TSV lines per position yield one positions entry', () => {
    expect(ref.positions.size).toBe(2);
  });

  test('skips the header line', () => {
    expect(ref.strains).not.toContain('Strain');
  });
});
