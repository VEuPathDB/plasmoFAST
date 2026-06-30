export function extractSequenceLines(chunks: string[]): string[] {
  const sequences: string[] = [];
  let leftover = '';
  let lineIndex = 0;

  for (const chunk of chunks) {
    const text = leftover + chunk;
    const lines = text.split('\n');
    leftover = lines.pop() ?? '';

    for (const line of lines) {
      if (line.trim() === '') continue;
      if (lineIndex % 4 === 1) sequences.push(line);
      lineIndex++;
    }
  }

  if (leftover.trim() !== '') {
    if (lineIndex % 4 === 1) sequences.push(leftover);
    lineIndex++;
  }

  return sequences;
}

export function isGzip(file: File): boolean {
  return file.name.endsWith('.gz');
}

/**
 * Tap a byte stream to tally bytes as they flow through, without buffering.
 * `bytesRead()` returns the running total. Used to measure progress against the
 * source file size (compressed bytes for .gz), which `file.size` also reports —
 * so the two share a unit and the percentage stays accurate and ≤ 100%.
 */
export function countBytes(source: ReadableStream<Uint8Array>): {
  stream: ReadableStream<Uint8Array>;
  bytesRead: () => number;
} {
  let total = 0;
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      total += chunk.byteLength;
      controller.enqueue(chunk);
    },
  });
  return { stream: source.pipeThrough(counter), bytesRead: () => total };
}

export function getTextStream(file: File): {
  stream: ReadableStream<string>;
  bytesRead: () => number;
} {
  const raw = file.stream();
  // Count bytes at the source — before decompression — so progress is measured
  // against the compressed file size for .gz inputs.
  const { stream: counted, bytesRead } = countBytes(raw);
  let byteStream = counted;
  if (isGzip(file)) {
    byteStream = byteStream.pipeThrough(new DecompressionStream('gzip') as TransformStream<Uint8Array, Uint8Array>);
  }
  const stream = byteStream.pipeThrough(new TextDecoderStream() as TransformStream<Uint8Array, string>);
  return { stream, bytesRead };
}
