import { analyze } from '../src/index';
import type { AnalysisResult, StrainResult } from '../src/index';

const fileInput = document.getElementById('file-input') as HTMLInputElement;
const progressBar = document.getElementById('progress-bar') as HTMLProgressElement;
const progressLabel = document.getElementById('progress-label') as HTMLSpanElement;
const resultsTable = document.getElementById('results-body') as HTMLTableSectionElement;
const errorBox = document.getElementById('error') as HTMLDivElement;
const status = document.getElementById('status') as HTMLParagraphElement;
const elapsed = document.getElementById('elapsed') as HTMLParagraphElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;

let controller: AbortController | null = null;

cancelBtn.addEventListener('click', () => {
  controller?.abort();
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  errorBox.textContent = '';
  resultsTable.innerHTML = '';
  progressBar.value = 0;
  elapsed.textContent = '';
  status.textContent = 'Analysing…';

  controller = new AbortController();
  cancelBtn.disabled = false;

  const startTime = Date.now();
  const timer = setInterval(() => {
    const secs = ((Date.now() - startTime) / 1000).toFixed(1);
    elapsed.textContent = `Elapsed: ${secs}s`;
  }, 100);

  try {
    const result: AnalysisResult = await analyze(file, {
      signal: controller.signal,
      onProgress: ({ bytesRead, totalBytes }) => {
        const pct = Math.round((bytesRead / totalBytes) * 100);
        progressBar.value = pct;
        progressLabel.textContent = `${pct}%`;
      },
    });

    clearInterval(timer);
    const totalSecs = ((Date.now() - startTime) / 1000).toFixed(1);
    elapsed.textContent = `Completed in ${totalSecs}s`;

    for (const [strain, counts] of Object.entries(result) as [string, StrainResult][]) {
      const row = resultsTable.insertRow();
      [strain, counts.specific, counts.nonspecific, counts.mixed, counts.lowCoverage]
        .forEach(val => { row.insertCell().textContent = String(val); });
    }

    progressBar.value = 100;
    progressLabel.textContent = '100%';
    status.textContent = 'Done.';
  } catch (err) {
    clearInterval(timer);
    elapsed.textContent = '';
    if (controller.signal.aborted) {
      status.textContent = 'Cancelled.';
    } else {
      errorBox.textContent = String(err);
      status.textContent = '';
    }
  } finally {
    cancelBtn.disabled = true;
    controller = null;
  }
});
