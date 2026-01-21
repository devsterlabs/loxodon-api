export const UserSchema = {
  $id: 'User',
  type: 'object',
  properties: {
    oid: { type: 'string' },
    email: { type: 'string' },
    role: { type: 'integer', nullable: true },
    tenantId: { type: 'string' },
    status: { type: 'string', enum: ['active', 'inactive', 'deleted'] },
    firstLogin: { type: 'string', format: 'date-time', nullable: true },
    lastActive: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['oid', 'email', 'tenantId', 'status', 'createdAt', 'updatedAt'],
};

export const UpdateUserInputSchema = {
  $id: 'UpdateUserInput',
  type: 'object',
  properties: {
    email: { type: 'string' },
    role: { type: 'integer', nullable: true },
    status: { type: 'string', enum: ['active', 'inactive'] },
  },
};

export const UserResponseSchema = {
  $id: 'UserResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { $ref: 'User#' },
  },
  required: ['success', 'data'],
};

export const UserListResponseSchema = {
  $id: 'UserListResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: { $ref: 'User#' },
    },
    count: { type: 'number' },
  },
  required: ['success', 'data', 'count'],
};
