import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../src/app.js';

function makeRequest({ port, path = '/api/front/ai/intent', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      },
      (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            json: JSON.parse(data)
          });
        });
      }
    );

    request.on('error', reject);
    request.write(JSON.stringify(body));
    request.end();
  });
}

async function withServer(run) {
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();

  try {
    await run(port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

test('debug gate behavior: default response does not expose _meta', async () => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';

  try {
    await withServer(async (port) => {
      const response = await makeRequest({
        port,
        body: { input: '周末两天，公共交通，想看老城和美食，轻松一点' }
      });

      assert.equal(response.statusCode, 200);
      assert.ok(!('_meta' in response.json.data), 'default response should not expose _meta');
    });
  } finally {
    process.env.NODE_ENV = previousEnv;
  }
});

test('debug gate behavior: non-production debug request exposes _meta', async () => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';

  try {
    await withServer(async (port) => {
      const response = await makeRequest({
        port,
        headers: {
          'x-debug-intent': '1'
        },
        body: { input: '周末两天，公共交通，想看老城和美食，轻松一点' }
      });

      assert.equal(response.statusCode, 200);
      assert.ok(response.json.data._meta, 'debug response should expose _meta');
      assert.ok(response.json.data._meta.decision_source);
      assert.ok(response.json.data._meta.prior_state_usage);
      assert.ok(Array.isArray(response.json.data._meta.rule_hits));
    });
  } finally {
    process.env.NODE_ENV = previousEnv;
  }
});

test('debug gate behavior: production request hides _meta even with debug header', async () => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    await withServer(async (port) => {
      const response = await makeRequest({
        port,
        headers: {
          'x-debug-intent': '1'
        },
        body: { input: '周末两天，公共交通，想看老城和美食，轻松一点' }
      });

      assert.equal(response.statusCode, 200);
      assert.ok(!('_meta' in response.json.data), 'production response should hide _meta');
    });
  } finally {
    process.env.NODE_ENV = previousEnv;
  }
});
