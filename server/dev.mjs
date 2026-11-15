import { spawn } from 'node:child_process';

const api = spawn(process.execPath, ['server/index.mjs'], {
  stdio: 'inherit',
  env: process.env,
});
const web = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], {
  stdio: 'inherit',
  env: process.env,
});

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  api.kill('SIGTERM');
  web.kill('SIGTERM');
  setTimeout(() => process.exit(exitCode), 100);
}

api.on('error', (error) => {
  console.error('Could not start the API server:', error);
  stop(1);
});
web.on('error', (error) => {
  console.error('Could not start the Vite server:', error);
  stop(1);
});
api.on('exit', (code) => {
  if (!stopping) stop(code ?? 1);
});
web.on('exit', (code) => {
  if (!stopping) stop(code ?? 1);
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
