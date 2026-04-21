import test from 'node:test';
import assert from 'node:assert/strict';

import { assertMessagesContract } from '../src/services/ai/intent-router/extract.js';

test('message protocol assertion: last message must be user', () => {
  assert.throws(
    () => {
      assertMessagesContract([
        { role: 'system', content: 'router system prompt' }
      ]);
    },
    (error) => {
      assert.equal(error.code, 'schema_violation');
      assert.match(error.message, /must end with a user message/i);
      return true;
    }
  );
});

test('message protocol assertion: assistant prefill must be blocked locally', () => {
  assert.throws(
    () => {
      assertMessagesContract([
        { role: 'system', content: 'router system prompt' },
        { role: 'user', content: '帮我安排周末路线' },
        { role: 'assistant', content: '{\"task_type\":\"plan_route\"}' }
      ]);
    },
    (error) => {
      assert.equal(error.code, 'schema_violation');
      assert.match(error.message, /assistant prefill/i);
      return true;
    }
  );
});

test('message protocol assertion: historical assistant messages remain allowed', () => {
  assert.doesNotThrow(() => {
    assertMessagesContract([
      { role: 'system', content: 'router system prompt' },
      { role: 'user', content: '先讲讲郁孤台' },
      { role: 'assistant', content: '这是历史回答' },
      { role: 'user', content: '再帮我排一个周末路线' }
    ]);
  });
});
