import request from 'supertest';
import app from '../src/server';
import * as fs from 'fs';
import * as path from 'path';

describe('API Grinders', () => {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const grindersFile = path.join(dataDir, 'grinders.json');

  beforeEach(() => {
    fs.writeFileSync(grindersFile, '[]');
  });

  async function createTestUser() {
    const username = 'grinderuser-' + Date.now();
    const password = 'password123';
    const create = await request(app).post('/api/users/register').send({ username, password }).expect(201);
    return { username, password, token: create.body.token, id: create.body.id };
  }

  it('should create, update and delete a grinder', async () => {
    const u = await createTestUser();
    const auth = `Bearer ${u.token}`;
    let res = await request(app).post('/api/grinders').set('Authorization', auth).send({ name: 'Test Grinder', notes: 'notes' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    const id = res.body.id;

    res = await request(app).get('/api/grinders').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    res = await request(app).put(`/api/grinders/${id}`).set('Authorization', auth).send({ name: 'Updated Grinder', notes: 'new notes' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Grinder');

    res = await request(app).delete(`/api/grinders/${id}`).set('Authorization', auth);
    expect(res.status).toBe(200);

    res = await request(app).get('/api/grinders').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});
