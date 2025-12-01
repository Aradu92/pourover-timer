#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(process.cwd(), '.env');
const secret = crypto.randomBytes(64).toString('hex');

if (fs.existsSync(envPath)) {
  console.log('.env already exists at', envPath);
  console.log('JWT Secret (do not share):', secret);
  console.log('You can add this to your .env file as JWT_SECRET=...');
  process.exit(0);
}

const content = `JWT_SECRET=${secret}\nSALT_ROUNDS=12\nPORT=3000\n`;
fs.writeFileSync(envPath, content, { flag: 'wx' });
console.log('Generated .env with secure JWT secret at', envPath);
console.log('Do not commit .env to version control. Add .env to .gitignore');
