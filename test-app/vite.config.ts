import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const tsvAsText: Plugin = {
  name: 'tsv-as-text',
  transform(code, id) {
    if (id.endsWith('.tsv')) {
      return { code: `export default ${JSON.stringify(code)}`, map: null };
    }
  },
};

// In dev, counter.worker.js doesn't exist — only counter.worker.ts does.
// new URL('./counter.worker.js', import.meta.url) is a runtime string so Vite's
// module resolver never sees it; intercept the HTTP request instead.
const workerJsToTs: Plugin = {
  name: 'worker-js-to-ts',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url?.includes('counter.worker.js')) {
        req.url = req.url.replace('counter.worker.js', 'counter.worker.ts');
      }
      next();
    });
  },
};

export default defineConfig({
  root: __dirname,
  plugins: [tsvAsText, workerJsToTs],
  worker: {
    plugins: () => [tsvAsText],
  },
});
