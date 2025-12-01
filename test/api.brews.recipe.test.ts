import request from 'supertest';
import app from '../src/server';
import * as fs from 'fs';
import * as path from 'path';

describe('API Brews with recipe payload', () => {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const brewsFile = path.join(dataDir, 'brews.json');

  beforeEach(() => {
    fs.writeFileSync(brewsFile, '[]');
  });

  async function createTestUser() {
    const username = 'brewsrecipeuser-' + Date.now();
    const password = 'password123';
    const create = await request(app).post('/api/users/register').send({ username, password }).expect(201);
    return { username, password, token: create.body.token, id: create.body.id };
  }

  it('should save a brew with recipe included and store recipe with brew', async () => {
    const recipe = { name: 'My Recipe', stages: [{ name: 'Bloom', duration: 30, waterAmount: 60 }] };
    const u = await createTestUser();
    const auth = `Bearer ${u.token}`;
    const brewPayload = { beans: 'X', rating: 4, recipe };
    const res = await request(app).post('/api/brews').set('Authorization', auth).send(brewPayload);
    expect(res.status).toBe(201);
    expect(res.body.recipe).toBeDefined();
    expect(res.body.recipe.name).toBe('My Recipe');
    // Ensure GET returns the brew with recipe
    const list = await request(app).get('/api/brews').set('Authorization', auth);
    expect(list.status).toBe(200);
    const saved = list.body.find((b: any) => b.id === res.body.id);
    expect(saved).toBeDefined();
    expect(saved.recipe.name).toBe('My Recipe');
  });
});
