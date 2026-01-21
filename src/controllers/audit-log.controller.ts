import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuditLogService, type CreateAuditLogInput } from '../services/audit-log.service.js';
import type { JwtPayload } from 'jsonwebtoken';

function getActorOid(request: FastifyRequest): string | undefined {
  const payload = request.user as JwtPayload | undefined;
  if (typeof payload?.oid === 'string') return payload.oid;
  if (typeof payload?.sub === 'string') return payload.sub;
  return undefined;
}

async function safeLogAction(
  request: FastifyRequest,
  tenantId: string,
  action: string,
  description: string,
) {
  const userId = getActorOid(request);
  if (!userId) return;
  try {
    await AuditLogService.createIfUserExists({ tenantId, userId, action, description });
  } catch (error) {
    request.log.warn(error, 'Failed to write audit log');
  }
}

export class AuditLogController {
  static async getAll(
    request: FastifyRequest<{
      Querystring: { page?: string; limit?: string; userId?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const page = Number(request.query?.page ?? 1);
      const limit = Number(request.query?.limit ?? 20);
      const userId = request.query?.userId;
      const result = await AuditLogService.getAll(page, limit, userId);
      if (result.items.length > 0) {
        await safeLogAction(
          request,
          result.items[0].tenantId,
          'audit_logs.view',
          `Viewed audit logs${userId ? ` for user ${userId}` : ''}`,
        );
      }
      reply.code(200).send({
        success: true,
        data: result.items,
        count: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch audit logs',
      });
    }
  }

  static async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const id = Number.parseInt(request.params.id, 10);
      if (Number.isNaN(id)) {
        reply.code(400).send({
          success: false,
          message: 'Invalid audit log id',
        });
        return;
      }

      const log = await AuditLogService.getById(id);
      if (!log) {
        reply.code(404).send({
          success: false,
          message: 'Audit log not found',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        data: log,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch audit log',
      });
    }
  }

  static async create(
    request: FastifyRequest<{ Body: CreateAuditLogInput }>,
    reply: FastifyReply,
  ) {
    try {
      const { tenantId, userId, action, description } = request.body;
      if (!tenantId || !userId || !action || !description) {
        reply.code(400).send({
          success: false,
          message: 'tenantId, userId, action, description are required',
        });
        return;
      }

      const log = await AuditLogService.create({
        tenantId,
        userId,
        action,
        description,
      });

      reply.code(201).send({
        success: true,
        data: log,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to create audit log',
      });
    }
  }

  static async export(
    request: FastifyRequest<{
      Querystring: { startDate?: string; endDate?: string; userId?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const startDate = request.query?.startDate
        ? new Date(request.query.startDate)
        : undefined;
      const endDate = request.query?.endDate
        ? new Date(request.query.endDate)
        : undefined;
      if (startDate && Number.isNaN(startDate.getTime())) {
        reply.code(400).send({
          success: false,
          message: 'Invalid startDate',
        });
        return;
      }
      if (endDate && Number.isNaN(endDate.getTime())) {
        reply.code(400).send({
          success: false,
          message: 'Invalid endDate',
        });
        return;
      }
      const userId = request.query?.userId;

      const logs = await AuditLogService.getByDateRange(startDate, endDate, userId);
      if (logs.length > 0) {
        await safeLogAction(
          request,
          logs[0].tenantId,
          'audit_logs.export',
          `Exported audit logs${userId ? ` for user ${userId}` : ''}`,
        );
      }

      const header = 'id,tenantId,userId,action,description,createdAt';
      const rows = logs.map((log) =>
        [
          log.id,
          log.tenantId,
          log.userId,
          log.action,
          JSON.stringify(log.description),
          log.createdAt.toISOString(),
        ].join(','),
      );
      const csv = [header, ...rows].join('\n');

      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="audit-logs.csv"')
        .send(csv);
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to export audit logs',
      });
    }
  }
}
