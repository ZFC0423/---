import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../src/app.js';

function makeRequest({ port, body }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/front/ai/discovery',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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

test('discovery route returns wrapped direct Discovery contract', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        task_type: 'discover_options',
        constraints: {
          theme_preferences: ['heritage'],
          option_limit: 2
        },
        previous_public_result: null,
        decision_context: null,
        action: null
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.task_type, 'discover_options');
    assert.ok(['ready', 'limited', 'empty', 'invalid'].includes(response.json.data.result_status));
    assert.ok(Array.isArray(response.json.data.ranked_options));
    assert.ok(response.json.data.decision_context);
  });
});

test('discovery route maps unsupported task into invalid contract with HTTP 200 wrapper', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        task_type: 'unknown_task',
        constraints: {}
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.result_status, 'invalid');
    assert.equal(response.json.data.warnings[0].code, 'unsupported_task_type');
  });
});
