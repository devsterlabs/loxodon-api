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

export const LoginStatsSchema = {
  $id: 'LoginStats',
  type: 'object',
  properties: {
    range: { type: 'string' },
    from: { type: 'string', format: 'date-time' },
    to: { type: 'string', format: 'date-time' },
    successCount: { type: 'number' },
    failureCount: { type: 'number' },
  },
  required: ['range', 'from', 'to', 'successCount', 'failureCount'],
};

export const LoginStatsResponseSchema = {
  $id: 'LoginStatsResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { $ref: 'LoginStats#' },
  },
  required: ['success', 'data'],
};

export const StatsOverviewSchema = {
  $id: 'StatsOverview',
  type: 'object',
  properties: {
    activeCustomers: { type: 'number' },
    totalUsers: { type: 'number' },
    newUsers: {
      type: 'object',
      properties: {
        last7days: { type: 'number' },
        lastMonth: { type: 'number' },
        lastYear: { type: 'number' },
      },
      required: ['last7days', 'lastMonth', 'lastYear'],
    },
    deletedUsers: {
      type: 'object',
      properties: {
        last7days: { type: 'number' },
        lastMonth: { type: 'number' },
        lastYear: { type: 'number' },
      },
      required: ['last7days', 'lastMonth', 'lastYear'],
    },
    activeNow: { type: 'number' },
  },
  required: ['activeCustomers', 'totalUsers', 'newUsers', 'deletedUsers', 'activeNow'],
};

export const StatsOverviewResponseSchema = {
  $id: 'StatsOverviewResponse',
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { $ref: 'StatsOverview#' },
  },
  required: ['success', 'data'],
};
