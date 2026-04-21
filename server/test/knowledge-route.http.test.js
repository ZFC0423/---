import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../src/app.js';

function createGuideRequest(overrides = {}) {
  return {
    routerResult: {
      task_type: 'guide_understand',
      task_confidence: 0.9,
      constraints: {
        user_query: '请讲讲郁孤台为什么值得看',
        subject_entities: ['郁孤台'],
        theme_preferences: null,
        region_hints: null,
        scenic_hints: null,
        hard_avoidances: null,
        companions: null
      },
      clarification_needed: false,
      clarification_reason: null,
      missing_required_fields: [],
      clarification_questions: [],
      next_agent: 'ai_chat'
    },
    ...overrides
  };
}

function makeRequest({ port, body }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/front/ai/knowledge',
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

test('knowledge route accepts guide_understand + ai_chat alias and returns wrapped mock payload', async () => {
  const previousProvider = process.env.AI_GUIDE_PROVIDER;
  process.env.AI_GUIDE_PROVIDER = 'mock';

  try {
    await withServer(async (port) => {
      const response = await makeRequest({
        port,
        body: createGuideRequest()
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.json.code, 200);
      assert.equal(response.json.data.task_type, 'guide_understand');
      assert.equal(response.json.data.retrieval_status, 'hit');
      assert.equal(response.json.data.evidence_status, 'sufficient');
      assert.ok(Array.isArray(response.json.data.evidence.citations));
      assert.ok(!('_meta' in response.json.data));
    });
  } finally {
    process.env.AI_GUIDE_PROVIDER = previousProvider;
  }
});

test('knowledge route rejects clarified routerResult', async () => {
  const previousProvider = process.env.AI_GUIDE_PROVIDER;
  process.env.AI_GUIDE_PROVIDER = 'mock';

  try {
    await withServer(async (port) => {
      const response = await makeRequest({
        port,
        body: createGuideRequest({
          routerResult: {
            ...createGuideRequest().routerResult,
            clarification_needed: true
          }
        })
      });

      assert.equal(response.statusCode, 400);
      assert.match(response.json.message, /clarification_needed/);
    });
  } finally {
    process.env.AI_GUIDE_PROVIDER = previousProvider;
  }
});

test('knowledge route rejects non-ai_chat next_agent values', async () => {
  const previousProvider = process.env.AI_GUIDE_PROVIDER;
  process.env.AI_GUIDE_PROVIDER = 'mock';

  try {
    await withServer(async (port) => {
      const body = createGuideRequest();
      body.routerResult.next_agent = 'knowledge_guide';

      const response = await makeRequest({
        port,
        body
      });

      assert.equal(response.statusCode, 400);
      assert.match(response.json.message, /next_agent/);
    });
  } finally {
    process.env.AI_GUIDE_PROVIDER = previousProvider;
  }
});
