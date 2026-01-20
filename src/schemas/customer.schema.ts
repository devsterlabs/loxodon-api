export const CustomerSchema = {
  $id: 'Customer',
  type: 'object',
  properties: {
    domain: { type: 'string' },
    tenantId: { type: 'string' },
    active: { type: 'boolean' },
    autoSync: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['domain', 'tenantId', 'active', 'autoSync', 'createdAt', 'updatedAt'],
};

export const CreateCustomerInputSchema = {
  $id: 'CreateCustomerInput',
  type: 'object',
  properties: {
    domain: { type: 'string' },
    tenantId: { type: 'string' },
    autoSync: { type: 'boolean' },
  },
  required: ['domain', 'tenantId'],
};

export const UpdateCustomerInputSchema = {
  $id: 'UpdateCustomerInput',
  type: 'object',
  properties: {
    domain: { type: 'string' },
    active: { type: 'boolean' },
    autoSync: { type: 'boolean' },
  },
};

export const CustomerResponseSchema = {
  $id: 'CustomerResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { $ref: 'Customer#' },
  },
  required: ['success', 'data'],
};

export const CustomerListResponseSchema = {
  $id: 'CustomerListResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: { $ref: 'Customer#' },
    },
    count: { type: 'number' },
  },
  required: ['success', 'data', 'count'],
};
