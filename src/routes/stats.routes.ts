import type { FastifyInstance } from 'fastify';
import { StatsController } from '../controllers/stats.controller.js';
import { requireAnyPermission } from '../middleware/authorize.middleware.js';

export async function statsRoutes(app: FastifyInstance) {
  app.get(
    '/stats/overview',
    {
      schema: {
        description: 'Get overview stats',
        tags: ['Stats'],
        response: {
          200: { $ref: 'StatsOverviewResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requireAnyPermission(['users.read', 'users.update']),
    },
    StatsController.getOverview,
  );
}
