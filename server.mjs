import express from 'express';
import { createServer as createViteServer } from 'vite';
import { updateData, SYNC_INTERVAL } from './scripts/update-data.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 5173);
app.disable('x-powered-by');
// These are static, locally published data files, not an external API.
app.use('/data', express.static(path.join(root, 'public/data'), { etag: true, maxAge: 0, setHeaders: res => res.setHeader('Cache-Control', 'no-cache') }));
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist/index.html')));
} else {
  const vite = await createViteServer({ root, server: { middlewareMode: true, allowedHosts: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const server = app.listen(port, '0.0.0.0', () => console.log(`FATYAK Observatory is listening on 0.0.0.0:${port}`));
updateData().catch(error => console.error('[data]', error));
const timer = setInterval(() => updateData().catch(error => console.error('[data]', error)), SYNC_INTERVAL);
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { clearInterval(timer); server.close(() => process.exit(0)); });
