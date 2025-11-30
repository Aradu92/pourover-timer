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

  it('should create, update and delete a grinder', async () => {
    let res = await request(app).post('/api/grinders').send({ name: 'Test Grinder', notes: 'notes' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    const id = res.body.id;

    res = await request(app).get('/api/grinders');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    res = await request(app).put(`/api/grinders/${id}`).send({ name: 'Updated Grinder', notes: 'new notes' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Grinder');

    res = await request(app).delete(`/api/grinders/${id}`);
    expect(res.status).toBe(200);

    res = await request(app).get('/api/grinders');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});
