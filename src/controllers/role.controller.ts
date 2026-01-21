import type { FastifyReply, FastifyRequest } from 'fastify';
import { RoleService, type CreateRoleInput, type UpdateRoleInput } from '../services/role.service.js';
import { AuditLogService } from '../services/audit-log.service.js';
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

export class RoleController {
  static async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const roles = await RoleService.getAll();
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
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const id = Number.parseInt(request.params.id, 10);
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
    request: FastifyRequest<{ Body: CreateRoleInput }>,
    reply: FastifyReply,
  ) {
    try {
      const { title, tenantID, permissions } = request.body;
      if (!title || !tenantID || !permissions || permissions.length === 0) {
        reply.code(400).send({
          success: false,
          message: 'title, tenantID, and permissions are required',
        });
        return;
      }

      const role = await RoleService.create(request.body);
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
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateRoleInput }>,
    reply: FastifyReply,
  ) {
    try {
      const id = Number.parseInt(request.params.id, 10);
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

      const updated = await RoleService.update(id, request.body);
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
