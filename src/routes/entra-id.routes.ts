import type { FastifyInstance } from 'fastify';
import { EntraIdController } from '../controllers/entra-id.controller.js';
import { requireAnyPermission } from '../middleware/authorize.middleware.js';

export async function entraIdRoutes(app: FastifyInstance) {
  app.get(
    '/entra-id/login-stats',
    {
      schema: {
        description: 'Get Entra ID login stats by date range',
        tags: ['Entra ID'],
        querystring: {
          type: 'object',
          properties: {
            range: {
              type: 'string',
              enum: ['today', 'last7days', 'lastmonth', 'lastyear'],
            },
          },
          required: ['range'],
        },
        response: {
          200: { $ref: 'LoginStatsResponse#' },
          400: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requireAnyPermission(['logs.read', 'audit_logs.read']),
    },
    EntraIdController.getLoginStats,
  );
}
