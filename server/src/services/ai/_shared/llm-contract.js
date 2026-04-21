function normalizeText(value) {
  return String(value || '').trim();
}

function defaultCreateError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function assertLlmMessagesContract(messages, { createError = defaultCreateError } = {}) {
  if (!Array.isArray(messages) || !messages.length) {
    throw createError('schema_violation', 'AI messages must be a non-empty array');
  }

  const invalidMessage = messages.find((message) => {
    return !message || typeof message !== 'object' || !normalizeText(message.role) || message.content === undefined;
  });

  if (invalidMessage) {
    throw createError('schema_violation', 'AI messages contain invalid items');
  }

  if (normalizeText(messages[messages.length - 1]?.role) === 'assistant') {
    throw createError('schema_violation', 'AI messages must not include assistant prefill');
  }

  if (normalizeText(messages[messages.length - 1]?.role) !== 'user') {
    throw createError('schema_violation', 'AI messages must end with a user message');
  }
}
