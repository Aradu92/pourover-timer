import request from 'supertest';
import app from '../src/server';
import * as fs from 'fs';
import * as path from 'path';

describe('API Brews', () => {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const brewsFile = path.join(dataDir, 'brews.json');
  const beansFile = path.join(dataDir, 'beans.json');

  beforeEach(() => {
    fs.writeFileSync(brewsFile, '[]');
    fs.writeFileSync(beansFile, '[]');
  });

  // helper to create and authenticate a test user
  async function createTestUser() {
    const username = 'testuser-' + Date.now();
    const password = 'password123';
    const create = await request(app).post('/api/users/register').send({ username, password }).expect(201);
    return { username, password, token: create.body.token, id: create.body.id };
  }

  it('should save brew and decrement bean bag remaining', async () => {
    const u = await createTestUser();
    const auth = `Bearer ${u.token}`;
    // Create bean bag
    const createResp = await request(app).post('/api/beans').set('Authorization', auth).send({ name: 'X', bagSize: 200 }).expect(201);
    const id = createResp.body.id;
    // Save brew referencing bean bag
    const brewPayload = { beans: 'X', beanBagId: id, beansUsed: 20, rating: 5 };
    const res = await request(app).post('/api/brews').set('Authorization', auth).send(brewPayload);
    expect(res.status).toBe(201);
    // Check bean bag remaining updated
    const beansList = await request(app).get('/api/beans').set('Authorization', auth).expect(200);
    const bag = beansList.body.find((b: any) => b.id === id);
    expect(bag.remaining).toBe(180);
  });

  it('should reject brew with invalid grindSize (null)', async () => {
    const u = await createTestUser();
    const auth = `Bearer ${u.token}`;
    const res = await request(app).post('/api/brews').set('Authorization', auth).send({ beans: 'X', grindSize: null, rating: 3 });
    // Server responds 400 for invalid grindSize
    expect(res.status).toBe(400);
  });
});
