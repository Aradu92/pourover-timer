import request from 'supertest';
import app from '../src/server';
import * as fs from 'fs';
import * as path from 'path';

describe('API Recipes', () => {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const recipesFile = path.join(dataDir, 'recipes.json');

  beforeEach(() => {
    // Reset recipes file
    fs.writeFileSync(recipesFile, '[]');
  });

  async function createTestUser() {
    const username = 'recipeuser-' + Date.now();
    const password = 'password123';
    const create = await request(app).post('/api/users/register').send({ username, password }).expect(201);
    return { username, password, token: create.body.token, id: create.body.id };
  }

  it('should create recipe with baseBeans and update/delete', async () => {
    // Create
    const u = await createTestUser();
    const auth = `Bearer ${u.token}`;
    let res = await request(app)
      .post('/api/recipes')
      .set('Authorization', auth)
      .send({ name: 'Test Recipe', baseBeans: 20, stages: [{ name: 'Bloom', duration: 30, waterAmount: 50 }] });
    expect(res.status).toBe(201);
    expect(res.body.baseBeans).toBe(20);
    const id = res.body.id;

    // Get list
    res = await request(app).get('/api/recipes').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    // Update
    res = await request(app).put(`/api/recipes/${id}`).set('Authorization', auth).send({ name: 'Updated', stages: [], baseBeans: 18 });
    expect(res.status).toBe(200);
    expect(res.body.baseBeans).toBe(18);

    // Delete
    res = await request(app).delete(`/api/recipes/${id}`).set('Authorization', auth);
    expect(res.status).toBe(200);

    res = await request(app).get('/api/recipes').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});
