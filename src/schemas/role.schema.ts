export const RoleSchema = {
  $id: 'Role',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    title: { type: 'string' },
    tenantID: { type: 'string' },
    description: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'title', 'tenantID', 'permissions'],
};

export const CreateRoleInputSchema = {
  $id: 'CreateRoleInput',
  type: 'object',
  properties: {
    title: { type: 'string' },
    tenantID: { type: 'string' },
    description: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'tenantID', 'permissions'],
};

export const UpdateRoleInputSchema = {
  $id: 'UpdateRoleInput',
  type: 'object',
  properties: {
    title: { type: 'string' },
    tenantID: { type: 'string' },
    description: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' } },
  },
};

export const RoleResponseSchema = {
  $id: 'RoleResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { $ref: 'Role#' },
  },
  required: ['success', 'data'],
};

export const RoleListResponseSchema = {
  $id: 'RoleListResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: { $ref: 'Role#' },
    },
    count: { type: 'number' },
  },
  required: ['success', 'data', 'count'],
};
