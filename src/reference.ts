type PositionEntry = { specCount: number; nonspecCount: number; strain: string };

type KmerHit = { entry: PositionEntry; spec: boolean };

export type ParsedReference = {
  kmers: Map<number, KmerHit>;
  positions: Map<string, PositionEntry>;
  strains: string[];
};

export const K = 25;

// 2-bit base encoding: A=0 C=1 G=2 T=3, everything else -1 (resets the rolling window).
export const BASE_CODE = new Int8Array(256).fill(-1);
BASE_CODE[65] = 0; // A
BASE_CODE[67] = 1; // C
BASE_CODE[71] = 2; // G
BASE_CODE[84] = 3; // T

// 4^K — modulo keeps only the last K bases. 4^25 = 2^50, safely within Number's 53-bit integers.
export const FOURK = Math.pow(2, 2 * K);

// Encodes a clean K-mer (assumes all ACGT) to its integer key.
export function encodeKmer(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = h * 4 + BASE_CODE[s.charCodeAt(i)];
  return h;
}

export function parseReference(tsv: string): ParsedReference {
  const kmers = new Map<number, KmerHit>();
  const positions = new Map<string, PositionEntry>();
  const strainSet = new Set<string>();

  const lines = tsv.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [chromosome, position, specKmer, nonspecKmer, strain] = line.split('\t');
    const positionId = `${chromosome}:${position}`;

    let entry = positions.get(positionId);
    if (!entry) {
      entry = { specCount: 0, nonspecCount: 0, strain };
      positions.set(positionId, entry);
    }

    kmers.set(encodeKmer(specKmer), { entry, spec: true });
    kmers.set(encodeKmer(nonspecKmer), { entry, spec: false });
    strainSet.add(strain);
  }

  return { kmers, positions, strains: [...strainSet] };
}

export async function loadReference(url: string | URL): Promise<ParsedReference> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch reference: ${response.status} ${url}`);
  return parseReference(await response.text());
}
