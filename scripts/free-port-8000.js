/*
 * Free port 8000 on Windows by killing any processes bound to it.
 * Safe to run repeatedly; logs actions for visibility.
 */
const { execSync } = require('child_process');

function getPidsOnPort(port) {
  try {
    const cmd = `netstat -ano | findstr :${port}`;
    const output = execSync(cmd, { stdio: 'pipe' }).toString();
    const lines = output.split(/\r?\n/).filter(Boolean);
    const pids = new Set();
    lines.forEach(line => {
      // Example: "TCP    0.0.0.0:8000     0.0.0.0:0      LISTENING       12345"
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) {
        pids.add(pid);
      }
    });
    return Array.from(pids);
  } catch (err) {
    // No matches or netstat failed
    return [];
  }
}

function killPid(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    console.log(`Killed PID ${pid} occupying port 8000`);
  } catch (err) {
    console.warn(`Failed to kill PID ${pid}: ${err.message}`);
  }
}

const port = parseInt(process.env.PORT || '8000', 10);
const pids = getPidsOnPort(port);

if (pids.length === 0) {
  console.log(`No process found listening on port ${port}.`);
  process.exit(0);
}

console.log(`Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);
pids.forEach(killPid);
console.log(`Port ${port} should now be free.`);