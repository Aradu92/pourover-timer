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

  it('should save brew and decrement bean bag remaining', async () => {
    // Create bean bag
    const createResp = await request(app).post('/api/beans').send({ name: 'X', bagSize: 200 }).expect(201);
    const id = createResp.body.id;
    // Save brew referencing bean bag
    const brewPayload = { beans: 'X', beanBagId: id, beansUsed: 20, rating: 5 };
    const res = await request(app).post('/api/brews').send(brewPayload);
    expect(res.status).toBe(201);
    // Check bean bag remaining updated
    const beansList = await request(app).get('/api/beans').expect(200);
    const bag = beansList.body.find((b: any) => b.id === id);
    expect(bag.remaining).toBe(180);
  });

  it('should reject brew with invalid grindSize (null)', async () => {
    const res = await request(app).post('/api/brews').send({ beans: 'X', grindSize: null, rating: 3 });
    // Server responds 400 for invalid grindSize
    expect(res.status).toBe(400);
  });
});
