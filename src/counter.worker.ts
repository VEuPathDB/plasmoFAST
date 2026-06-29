self.addEventListener('error', (e) => {
  self.postMessage({ type: 'error', message: `Worker load error: ${e.message} (${e.filename}:${e.lineno})` });
});

import { parseReference, loadReference, BASE_CODE, K, FOURK } from './reference';
import { getTextStream } from './parser';
import { buildResult } from './result';
import defaultRefText from '../reference/25mer_rc_list.tsv';

self.onmessage = async (
  event: MessageEvent<{ file: File; referenceUrl?: string; emitPartial?: boolean }>
) => {
  const { file, referenceUrl, emitPartial } = event.data;

  try {
    const ref = referenceUrl
      ? await loadReference(referenceUrl)
      : parseReference(defaultRefText);

    const reader = getTextStream(file).getReader();
    let leftover = '';
    let lineIndex = 0;
    let readCount = 0;
    let bytesRead = 0;
    const totalBytes = file.size;

    while (true) {
      const { done, value } = await reader.read();

      const text = leftover + (value ?? '');
      const lines = text.split('\n');
      leftover = lines.pop() ?? '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (lineIndex % 4 === 1) {
          let h = 0;
          let valid = 0;
          for (let i = 0; i < line.length; i++) {
            const c = BASE_CODE[line.charCodeAt(i)];
            if (c < 0) {
              h = 0;
              valid = 0;
              continue;
            }
            h = (h * 4 + c) % FOURK;
            valid++;
            if (valid >= K) {
              const hit = ref.kmers.get(h);
              if (hit !== undefined) {
                if (hit.spec) hit.entry.specCount++;
                else hit.entry.nonspecCount++;
              }
            }
          }
          readCount++;
          if (readCount % 10_000 === 0) {
            if (value) bytesRead += value.length;
            self.postMessage({ type: 'progress', bytesRead, totalBytes });
            if (emitPartial) {
              self.postMessage({ type: 'partial', data: buildResult(ref) });
            }
          }
        }
        lineIndex++;
      }

      if (done) break;
    }

    self.postMessage({ type: 'result', data: buildResult(ref) });
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) });
  }
};
