export const ErrorResponseSchema = {
  $id: 'ErrorResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    error: { type: 'string' },
  },
  required: ['success', 'message'],
};

export const HealthResponseSchema = {
  $id: 'HealthResponse',
  type: 'object',
  properties: {
    status: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
  },
  required: ['status', 'timestamp'],
};
