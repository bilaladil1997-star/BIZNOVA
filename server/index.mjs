import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from './app.mjs';

const dbPath = resolve(process.env.BIZNOVA_DB_PATH ?? 'data/biznova.sqlite');
const port = Number(process.env.API_PORT ?? 3001);
const { server, close } = createAppServer({ dbPath });

server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  console.log(`BIZNOVA API listening on http://127.0.0.1:${address.port}`);
});

function shutdown() {
  server.close(() => {
    close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.on('uncaughtException', (error) => {
    console.error(error);
    shutdown();
  });
}
