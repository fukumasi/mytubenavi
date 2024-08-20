// 修正後の tests/server/user.test.js
const request = require('supertest');
const app = require('../../src/server/app');

describe('User API', () => {
  it('responds with json', async () => {
    const response = await request(app).get('/api/users');
    expect(response.statusCode).toBe(200);
    // 修正部分
    expect(response.body).toBeInstanceOf(Object);
  });
});
