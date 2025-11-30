#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Create a temporary data directory for this e2e run to keep test data isolated
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pourover-e2e-'));
console.log('Starting server with DATA_DIR:', tmpDir);

// Use npm start to run server; pass along DATA_DIR
const child = spawn('npm', ['run', 'start'], {
  env: { ...process.env, DATA_DIR: tmpDir },
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  console.log('Server exited with code', code);
  process.exit(code);
});
