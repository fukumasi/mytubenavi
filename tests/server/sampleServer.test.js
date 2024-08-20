import request from 'supertest';
import app from '../../src/server/app';

beforeEach(() => {
  jest.clearAllMocks(); // すべてのモック関数をクリア
});

describe('GET /api/sample', () => {
  it('responds with json', async () => {
    const res = await request(app)
      .get('/api/sample')
      .set('Accept', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Sample response');
  });
});
