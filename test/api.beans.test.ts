import request from 'supertest';
import app from '../src/server';
import * as fs from 'fs';
import * as path from 'path';

describe('API Beans CRUD', () => {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const beansFile = path.join(dataDir, 'beans.json');

  beforeEach(() => {
    // Reset beans file
    fs.writeFileSync(beansFile, '[]');
  });

  it('should create, get, update, and delete a bean bag', async () => {
    // Create
    let res = await request(app)
      .post('/api/beans')
      .send({ name: 'Test Beans', bagSize: 300 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    const id = res.body.id;

    // Get list
    res = await request(app).get('/api/beans');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    // Update remaining and metadata
    res = await request(app)
      .put(`/api/beans/${id}`)
      .send({ remaining: 150, origin: 'Colombia', roast: 'Medium', masl: '1500' });
    expect(res.status).toBe(200);
    expect(res.body.remaining).toBe(150);
    expect(res.body.origin).toBe('Colombia');

    // Delete
    res = await request(app).delete(`/api/beans/${id}`);
    expect(res.status).toBe(200);
    // Check empty
    res = await request(app).get('/api/beans');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});
