import type { FastifyReply, FastifyRequest } from 'fastify';
import { RoleService, type CreateRoleInput, type UpdateRoleInput } from '../services/role.service.js';
import { AuditLogService } from '../services/audit-log.service.js';
import type { JwtPayload } from 'jsonwebtoken';
import { getActorTenantId, hasGlobalAccess, isPlatformAdmin } from '../middleware/authorize.middleware.js';

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

export class RoleController {
  static async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const isGlobal = await hasGlobalAccess(request);
      const tenantId = isGlobal ? undefined : await getActorTenantId(request);
      if (!tenantId && !isGlobal) {
        reply.code(403).send({ success: false, message: 'Forbidden' });
        return;
      }
      const roles = await RoleService.getAll(tenantId);
      reply.code(200).send({
        success: true,
        data: roles,
        count: roles.length,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch roles',
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
          message: 'Invalid role id',
        });
        return;
      }

      const role = await RoleService.getById(id);
      if (!role) {
        reply.code(404).send({
          success: false,
          message: 'Role not found',
        });
        return;
      }
      const isGlobal = await hasGlobalAccess(request);
      if (!isGlobal) {
        const tenantId = await getActorTenantId(request);
        if (!tenantId || role.tenantID !== tenantId) {
          reply.code(403).send({ success: false, message: 'Forbidden' });
          return;
        }
      }

      reply.code(200).send({
        success: true,
        data: role,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch role',
      });
    }
  }

  static async create(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { title, tenantID, permissions } = request.body as CreateRoleInput;
      if (!title || !tenantID || !permissions || permissions.length === 0) {
        reply.code(400).send({
          success: false,
          message: 'title, tenantID, and permissions are required',
        });
        return;
      }
      const isGlobal = await hasGlobalAccess(request);
      if (!isGlobal) {
        const actorTenantId = await getActorTenantId(request);
        if (!actorTenantId || actorTenantId !== tenantID) {
          reply.code(403).send({ success: false, message: 'Forbidden' });
          return;
        }
      }

      const role = await RoleService.create(request.body as CreateRoleInput);
      reply.code(201).send({
        success: true,
        data: role,
      });

      await safeLogAction(
        request,
        role.tenantID,
        'role.created',
        `Role created ${role.title}`,
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to create role',
      });
    }
  }

  static async update(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { id: rawId } = request.params as { id?: string };
      const id = Number.parseInt(rawId ?? '', 10);
      if (Number.isNaN(id)) {
        reply.code(400).send({
          success: false,
          message: 'Invalid role id',
        });
        return;
      }

      const existing = await RoleService.getById(id);
      if (!existing) {
        reply.code(404).send({
          success: false,
          message: 'Role not found',
        });
        return;
      }
      const isGlobal = await hasGlobalAccess(request);
      if (!isGlobal) {
        const actorTenantId = await getActorTenantId(request);
        if (!actorTenantId || existing.tenantID !== actorTenantId) {
          reply.code(403).send({ success: false, message: 'Forbidden' });
          return;
        }
        const tenantID = (request.body as UpdateRoleInput).tenantID;
        if (tenantID && tenantID !== actorTenantId) {
          reply.code(403).send({ success: false, message: 'Forbidden' });
          return;
        }
      }

      const updated = await RoleService.update(id, request.body as UpdateRoleInput);
      reply.code(200).send({
        success: true,
        data: updated,
      });

      await safeLogAction(
        request,
        updated.tenantID,
        'role.updated',
        `Role updated ${updated.title}`,
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to update role',
      });
    }
  }
}
