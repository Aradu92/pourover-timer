#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Load .env if present to allow convenient local dev secrets
try { require('dotenv').config(); } catch (e) { /* ignore */ }

// Create a temporary data directory for this e2e run to keep test data isolated
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pourover-e2e-'));
console.log('Starting server with DATA_DIR:', tmpDir);

// Find an available port starting with 3000
function findFreePort(start = 3000, max = 3010) {
  const net = require('net');
  for (let p = start; p <= max; p++) {
    try {
      const server = net.createServer().listen(p);
      server.close();
      return p;
    } catch (err) {
      // port in use, continue
    }
  }
  return null;
}

// Use npm start to run server; pass along DATA_DIR, a temp JWT_SECRET for isolation, and a free PORT
const crypto = require('crypto');
// Respect JWT_SECRET from .env or env var if provided, otherwise generate an ephemeral one
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(20).toString('hex');
const port = findFreePort(3000, 3010) || 3000;
console.log('Selected port for server:', port);
const child = spawn('npm', ['run', 'start'], {
  env: { ...process.env, DATA_DIR: tmpDir, JWT_SECRET: jwtSecret, PORT: port, SALT_ROUNDS: process.env.SALT_ROUNDS || '12' },
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  console.log('Server exited with code', code);
  process.exit(code);
});
