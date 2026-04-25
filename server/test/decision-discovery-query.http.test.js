import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../src/app.js';
import { createDiscoveryQueryHandler } from '../src/controllers/front/ai.controller.js';

function makeRequest({ port, path = '/api/front/ai/discovery/query', body }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
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

test('discovery query returns router safe clarify without entering Discovery', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        user_query: '帮我选一个'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.next_agent, 'safe_clarify');
    assert.equal(response.json.data.clarification_needed, true);
    assert.equal(Object.hasOwn(response.json.data, 'ranked_options'), false);
  });
});

test('discovery query routes natural language discovery into Discovery contract', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        user_query: '帮我推荐几个适合带老人去的景点'
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

test('discovery query returns invalid Discovery-style response for unsupported next_agent', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        user_query: '介绍郁孤台历史'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.result_status, 'invalid');
    assert.equal(response.json.data.warnings[0].code, 'unsupported_next_agent');
    assert.equal(response.json.data.task_type, 'discover_options');
  });
});

test('direct discovery endpoint remains available after discovery query integration', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      path: '/api/front/ai/discovery',
      body: {
        task_type: 'discover_options',
        constraints: {
          option_limit: 2
        }
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.task_type, 'discover_options');
    assert.ok(Array.isArray(response.json.data.ranked_options));
  });
});

test('discovery query handler passes priorState to Intent Router service', async () => {
  const received = [];
  const priorState = {
    task_type: 'plan_route',
    task_confidence: 0.91,
    constraints: {
      time_budget: { days: 3 },
      travel_mode: 'public_transport',
      pace_preference: 'relaxed'
    }
  };
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async (payload) => {
      received.push(payload);
      return {
        task_type: 'discover_options',
        task_confidence: 0.88,
        constraints: {
          user_query: payload.input,
          time_budget: { days: 3 },
          travel_mode: 'public_transport',
          pace_preference: 'relaxed'
        },
        clarification_needed: false,
        clarification_reason: null,
        missing_required_fields: [],
        clarification_questions: [],
        next_agent: 'decision_discovery'
      };
    },
    runDecisionDiscoveryAgentService: async () => ({
      task_type: 'discover_options',
      result_status: 'empty',
      ranked_options: [],
      comparison: null,
      next_actions: [],
      warnings: [],
      decision_context: {
        context_version: 1,
        fingerprint: 'sha256:test',
        continuation: {}
      }
    })
  });
  let jsonBody = null;
  const req = {
    body: {
      user_query: '3天',
      priorState
    },
    headers: {},
    socket: {}
  };
  const res = {
    json(body) {
      jsonBody = body;
    }
  };

  await handler(req, res, assert.fail);

  assert.equal(received.length, 1);
  assert.deepEqual(received[0], {
    input: '3天',
    priorState
  });
  assert.equal(jsonBody.code, 200);
});

test('discovery query handler treats safe_clarify next_agent as Router clarify even when flag is false', async () => {
  const handler = createDiscoveryQueryHandler({
    routeIntentService: async () => ({
      task_type: 'discover_options',
      task_confidence: 0.81,
      constraints: {
        user_query: 'help me choose',
        time_budget: null,
        travel_mode: null,
        pace_preference: null
      },
      clarification_needed: false,
      clarification_reason: 'missing_required_fields',
      missing_required_fields: ['time_budget'],
      clarification_questions: ['How many days do you plan to travel?'],
      next_agent: 'safe_clarify'
    }),
    runDecisionDiscoveryAgentService: async () => {
      assert.fail('Discovery agent should not run for Router safe_clarify output');
    }
  });
  let jsonBody = null;
  const req = {
    body: {
      user_query: 'help me choose'
    },
    headers: {},
    socket: {}
  };
  const res = {
    json(body) {
      jsonBody = body;
    }
  };

  await handler(req, res, assert.fail);

  assert.equal(jsonBody.code, 200);
  assert.equal(jsonBody.data.next_agent, 'safe_clarify');
  assert.equal(jsonBody.data.clarification_needed, false);
  assert.equal(Object.hasOwn(jsonBody.data, 'ranked_options'), false);
});
