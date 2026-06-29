import { extractSequenceLines, countBytes } from './parser';

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
}

async function drain<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const out: T[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out.push(value);
  }
  return out;
}

function chunked(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

const FASTQ = [
  '@read1',
  'ACGTACGTACGT',
  '+',
  'IIIIIIIIIIII',
  '@read2',
  'TTTTGGGGCCCC',
  '+',
  'JJJJJJJJJJJJ',
].join('\n') + '\n';

describe('extractSequenceLines', () => {
  test('extracts sequence lines from a single complete chunk', () => {
    const result = extractSequenceLines([FASTQ]);
    expect(result).toEqual(['ACGTACGTACGT', 'TTTTGGGGCCCC']);
  });

  test('handles chunk split in the middle of a line', () => {
    const chunks = chunked(FASTQ, 10);
    expect(chunks.length).toBeGreaterThan(2);
    const result = extractSequenceLines(chunks);
    expect(result).toEqual(['ACGTACGTACGT', 'TTTTGGGGCCCC']);
  });

  test('handles chunk split between lines', () => {
    const chunks = chunked(FASTQ, FASTQ.indexOf('\n') + 1);
    const result = extractSequenceLines(chunks);
    expect(result).toEqual(['ACGTACGTACGT', 'TTTTGGGGCCCC']);
  });

  test('handles chunk split mid-record (between sequence and + line)', () => {
    const splitAt = FASTQ.indexOf('+') - 1;
    const chunks = [FASTQ.slice(0, splitAt), FASTQ.slice(splitAt)];
    const result = extractSequenceLines(chunks);
    expect(result).toEqual(['ACGTACGTACGT', 'TTTTGGGGCCCC']);
  });

  test('returns empty array for empty input', () => {
    expect(extractSequenceLines([])).toEqual([]);
  });

  test('returns empty array for whitespace-only input', () => {
    expect(extractSequenceLines(['\n\n'])).toEqual([]);
  });
});

describe('countBytes', () => {
  test('tallies total bytes flowing through and passes chunks unchanged', async () => {
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])];
    const { stream, bytesRead } = countBytes(streamOf(chunks));

    const out = await drain(stream);

    expect(out).toEqual(chunks);
    expect(bytesRead()).toBe(5);
  });

  test('counts nothing for an empty stream', async () => {
    const { stream, bytesRead } = countBytes(streamOf([]));
    await drain(stream);
    expect(bytesRead()).toBe(0);
  });
});
