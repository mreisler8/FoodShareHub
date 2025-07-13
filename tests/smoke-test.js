
const request = require('supertest');
const { spawn } = require('child_process');

// Simple smoke test that doesn't require Cypress
describe('Application Smoke Test', () => {
  let server;
  let serverProcess;

  beforeAll(async () => {
    // Start the server for testing
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for server to start
    await new Promise((resolve) => {
      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('listening on')) {
          resolve();
        }
      });
    });
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  test('Server should be running', async () => {
    const response = await fetch('http://localhost:5000/api/me');
    expect(response.status).toBe(401); // Expected for unauthenticated request
  });

  test('Static files should be served', async () => {
    const response = await fetch('http://localhost:5000/');
    expect(response.status).toBe(200);
  });

  test('API endpoints should be accessible', async () => {
    const response = await fetch('http://localhost:5000/api/top-picks');
    expect([200, 401]).toContain(response.status);
  });
});
