import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuditLogService, type CreateAuditLogInput } from '../services/audit-log.service.js';
import type { JwtPayload } from 'jsonwebtoken';
import { getActorTenantId, hasGlobalAccess, isPlatformAdmin } from '../middleware/authorize.middleware.js';
import { UserService } from '../services/user.service.js';

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
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { page: rawPage, limit: rawLimit, userId } = request.query as {
        page?: string;
        limit?: string;
        userId?: string;
      };
      const isGlobal = await hasGlobalAccess(request);
      const tenantId = isGlobal ? undefined : await getActorTenantId(request);
      if (!tenantId && !isGlobal) {
        reply.code(403).send({ success: false, message: 'Forbidden' });
        return;
      }
      if (userId && tenantId) {
        const user = await UserService.getByOid(userId);
        if (!user || user.tenantId !== tenantId) {
          reply.code(403).send({ success: false, message: 'Forbidden' });
          return;
        }
      }
      const page = Number(rawPage ?? 1);
      const limit = Number(rawLimit ?? 20);
      const result = await AuditLogService.getAll(page, limit, userId, tenantId);
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
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { id: rawId } = request.params as { id?: string };
      const id = Number.parseInt(rawId ?? '', 10);
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
      const isGlobal = await hasGlobalAccess(request);
      if (!isGlobal) {
        const tenantId = await getActorTenantId(request);
        if (!tenantId || log.tenantId !== tenantId) {
          reply.code(403).send({ success: false, message: 'Forbidden' });
          return;
        }
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
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { tenantId, userId, action, description } = request.body as CreateAuditLogInput;
      if (!tenantId || !userId || !action || !description) {
        reply.code(400).send({
          success: false,
          message: 'tenantId, userId, action, description are required',
        });
        return;
      }
      const isGlobal = await hasGlobalAccess(request);
      if (!isGlobal) {
        const actorTenantId = await getActorTenantId(request);
        if (!actorTenantId || tenantId !== actorTenantId) {
          reply.code(403).send({ success: false, message: 'Forbidden' });
          return;
        }
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
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { startDate: rawStart, endDate: rawEnd, userId } = request.query as {
        startDate?: string;
        endDate?: string;
        userId?: string;
      };
      const isGlobal = await hasGlobalAccess(request);
      const tenantId = isGlobal ? undefined : await getActorTenantId(request);
      if (!tenantId && !isGlobal) {
        reply.code(403).send({ success: false, message: 'Forbidden' });
        return;
      }
      if (userId && tenantId) {
        const user = await UserService.getByOid(userId);
        if (!user || user.tenantId !== tenantId) {
          reply.code(403).send({ success: false, message: 'Forbidden' });
          return;
        }
      }
      const startDate = rawStart ? new Date(rawStart) : undefined;
      const endDate = rawEnd ? new Date(rawEnd) : undefined;
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

      const logs = await AuditLogService.getByDateRange(
        startDate,
        endDate,
        userId,
        tenantId,
      );
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
