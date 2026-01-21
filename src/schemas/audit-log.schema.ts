export const AuditLogSchema = {
  $id: 'AuditLog',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    tenantId: { type: 'string' },
    userId: { type: 'string' },
    action: { type: 'string' },
    description: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'tenantId', 'userId', 'action', 'description', 'createdAt'],
};

export const CreateAuditLogInputSchema = {
  $id: 'CreateAuditLogInput',
  type: 'object',
  properties: {
    tenantId: { type: 'string' },
    userId: { type: 'string' },
    action: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['tenantId', 'userId', 'action', 'description'],
};

export const AuditLogResponseSchema = {
  $id: 'AuditLogResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { $ref: 'AuditLog#' },
  },
  required: ['success', 'data'],
};

export const AuditLogListResponseSchema = {
  $id: 'AuditLogListResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: { $ref: 'AuditLog#' },
    },
    count: { type: 'number' },
    page: { type: 'number' },
    limit: { type: 'number' },
  },
  required: ['success', 'data', 'count', 'page', 'limit'],
};
