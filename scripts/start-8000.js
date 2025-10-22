/*
 * Free port 8000, then start the backend bound to port 8000.
 */
const { execSync, spawn } = require('child_process');
const path = require('path');

const port = process.env.PORT ? String(process.env.PORT) : '8000';

try {
  execSync(`node ${path.join(__dirname, 'free-port-8000.js')}`, { stdio: 'inherit' });
} catch (e) {
  console.warn('Port freeing step reported an error; proceeding to start server.');
}

const serverPath = path.join(__dirname, '..', 'server.js');
console.log(`Starting backend on port ${port}...`);

const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port }
});

child.on('exit', (code) => {
  console.log(`Backend process exited with code ${code}.`);
  process.exit(code);
});