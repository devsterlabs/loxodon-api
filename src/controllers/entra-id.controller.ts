import type { FastifyReply, FastifyRequest } from 'fastify';
import { getLoginStats, type LoginStatsRange } from '../services/entra-id.service.js';

const allowedRanges: LoginStatsRange[] = ['today', 'last7days', 'lastmonth', 'lastyear'];

export class EntraIdController {
  static async getLoginStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { range } = request.query as { range?: string };
      if (!range || !allowedRanges.includes(range as LoginStatsRange)) {
        reply.code(400).send({
          success: false,
          message: 'range must be one of: today, last7days, lastmonth, lastyear',
        });
        return;
      }

      const stats = await getLoginStats(range as LoginStatsRange);
      reply.code(200).send({
        success: true,
        data: stats,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch login stats from Entra ID',
      });
    }
  }
}
