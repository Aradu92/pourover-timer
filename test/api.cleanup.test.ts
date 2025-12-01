import request from 'supertest';
import app from '../src/server';
import * as fs from 'fs';
import * as path from 'path';

describe('API Cleanup Endpoints', () => {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const brewsFile = path.join(dataDir, 'brews.json');
  const beansFile = path.join(dataDir, 'beans.json');
  const recipesFile = path.join(dataDir, 'recipes.json');

  beforeEach(() => {
    // Ensure a clean state
    fs.writeFileSync(brewsFile, '[]');
    fs.writeFileSync(beansFile, '[]');
    fs.writeFileSync(recipesFile, '[]');
  });

  async function createTestUser() {
    const username = 'cleanupuser-' + Date.now();
    const password = 'password123';
    const create = await request(app).post('/api/users/register').send({ username, password }).expect(201);
    return { username, password, token: create.body.token, id: create.body.id };
  }

  it('should delete a brew and not delete the related bean bag', async () => {
    // Create bean bag, save brew referencing it, delete brew and assert removal
    const u = await createTestUser();
    const auth = `Bearer ${u.token}`;
    const createBean = await request(app).post('/api/beans').set('Authorization', auth).send({ name: 'cleanup-bean', bagSize: 300 }).expect(201);
    const beanId = createBean.body.id;

    const brewPayload = { beans: 'cleanup-bean', beanBagId: beanId, beansUsed: 50, rating: 4 };
    const brewResp = await request(app).post('/api/brews').set('Authorization', auth).send(brewPayload).expect(201);
    const brewId = brewResp.body.id;

    // Confirm brew present
    let brewsGet = await request(app).get('/api/brews').set('Authorization', auth).expect(200);
    expect(brewsGet.body.find((b: any) => b.id === brewId)).toBeDefined();

    // Delete brew
    const delResp = await request(app).delete(`/api/brews/${brewId}`).set('Authorization', auth);
    expect(delResp.status).toBe(200);

    // Brew should no longer exist
    brewsGet = await request(app).get('/api/brews').set('Authorization', auth).expect(200);
    expect(brewsGet.body.find((b: any) => b.id === brewId)).toBeUndefined();

    // But the bean bag should still exist
    const beansGet = await request(app).get('/api/beans').set('Authorization', auth).expect(200);
    expect(beansGet.body.find((b: any) => b.id === beanId)).toBeDefined();
  });

  it('should delete a recipe', async () => {
    const recipe = { name: 'cleanup-recipe', baseBeans: 20, stages: [{ name: 'Bloom', duration: 30, waterAmount: 50 }] };
    const u2 = await createTestUser();
    const auth2 = `Bearer ${u2.token}`;
    const createResp = await request(app).post('/api/recipes').set('Authorization', auth2).send(recipe).expect(201);
    const id = createResp.body.id;

    // Confirm present
    let recipesGet = await request(app).get('/api/recipes').set('Authorization', auth2).expect(200);
    expect(recipesGet.body.find((r: any) => r.id === id)).toBeDefined();

    // Delete and confirm removal
    await request(app).delete(`/api/recipes/${id}`).set('Authorization', auth2).expect(200);
    recipesGet = await request(app).get('/api/recipes').set('Authorization', auth2).expect(200);
    expect(recipesGet.body.find((r: any) => r.id === id)).toBeUndefined();
  });

  it('should delete a bean bag', async () => {
    const u3 = await createTestUser();
    const auth3 = `Bearer ${u3.token}`;
    const createResp = await request(app).post('/api/beans').set('Authorization', auth3).send({ name: 'delete-me', bagSize: 500 }).expect(201);
    const id = createResp.body.id;

    let beansGet = await request(app).get('/api/beans').set('Authorization', auth3).expect(200);
    expect(beansGet.body.find((b: any) => b.id === id)).toBeDefined();

    await request(app).delete(`/api/beans/${id}`).set('Authorization', auth3).expect(200);
    beansGet = await request(app).get('/api/beans').set('Authorization', auth3).expect(200);
    expect(beansGet.body.find((b: any) => b.id === id)).toBeUndefined();
  });
});
