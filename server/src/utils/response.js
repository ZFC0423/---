export function successResponse(data = null, message = 'success') {
  return {
    code: 200,
    message,
    data
  };
}

export function errorResponse(message = 'Internal server error', code = 500) {
  return {
    code,
    message,
    data: null
  };
}

export function sendSuccess(res, data = null, message = 'success') {
  res.json(successResponse(data, message));
}

export function sendError(res, message = 'Internal server error', code = 500) {
  res.status(code).json(errorResponse(message, code));
}
