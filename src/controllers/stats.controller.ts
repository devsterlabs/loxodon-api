import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatsService } from '../services/stats.service.js';

export class StatsController {
  static async getOverview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await StatsService.getOverview();
      reply.code(200).send({
        success: true,
        data,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch stats',
      });
    }
  }
}
