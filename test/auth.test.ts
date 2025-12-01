import request from 'supertest';
import app from '../src/server';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

describe('Auth and password storage', () => {
  test('Register hashed password stored and bcrypt compare works', async () => {
    const username = 'testuser-' + Date.now();
    const password = 'supersecret123';
    const res = await request(app).post('/api/users/register').send({ username, password });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
    const usersFile = path.join(dataDir, 'users.json');
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8') || '[]');
    const user = users.find((u: any) => u.username === username);
    expect(user).toBeDefined();
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe(password);
    const ok = await new Promise<boolean>((resolve) => bcrypt.compare(password, user.passwordHash, (err: any, okParam: boolean | undefined) => resolve(!!okParam)));
    expect(ok).toBe(true);
  });
});
