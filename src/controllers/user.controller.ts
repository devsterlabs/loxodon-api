import type { FastifyReply, FastifyRequest } from 'fastify';
import { CustomerService } from '../services/customer.service.js';
import { getUsersFromEntraId } from '../services/entra-id.service.js';
import { UserService, type UpdateUserInput } from '../services/user.service.js';
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

function mapUserRole<T extends { roleId: number | null; role?: unknown }>(user: T) {
  const { roleId, role, ...rest } = user;
  return { ...rest, roleId, role: role ?? null };
}

async function enforceSameTenant(
  request: FastifyRequest,
  reply: FastifyReply,
  tenantId: string,
) {
  if (await hasGlobalAccess(request)) return true;
  const actorTenantId = await getActorTenantId(request);
  if (!actorTenantId || actorTenantId !== tenantId) {
    reply.code(403).send({ success: false, message: 'Forbidden' });
    return false;
  }
  return true;
}

export class UserController {
  static async getByCustomer(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { customerId } = request.query as { customerId?: string };
      if (!customerId) {
        reply.code(400).send({
          success: false,
          message: 'customerId is required',
        });
        return;
      }
      if (!(await enforceSameTenant(request, reply, customerId))) {
        return;
      }

      const customer = await CustomerService.getByTenantId(customerId);
      if (!customer) {
        reply.code(404).send({
          success: false,
          message: 'Customer not found',
        });
        return;
      }

      try {
        const entraUsers = await getUsersFromEntraId(customer.domain);
        const usersToCreate = entraUsers.map((user) => ({
          oid: user.oid,
          email: user.email,
        }));
        await UserService.createManyForTenant(customerId, usersToCreate);
        await UserService.markMissingAsDeleted(
          customerId,
          entraUsers.map((user) => user.oid),
        );
      } catch (error) {
        request.log.error(error, 'Failed to sync users from Entra ID');
      }

      const users = await UserService.getByCustomer(customerId);
      const mapped = users.map(mapUserRole);
      reply.code(200).send({
        success: true,
        data: mapped,
        count: mapped.length,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch users',
      });
    }
  }

  static async getByOid(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { oid } = request.params as { oid?: string };
      if (!oid) {
        reply.code(400).send({
          success: false,
          message: 'Invalid user oid',
        });
        return;
      }

      const user = await UserService.getByOid(oid);
      if (!user) {
        reply.code(404).send({
          success: false,
          message: 'User not found',
        });
        return;
      }
      if (!(await enforceSameTenant(request, reply, user.tenantId))) {
        return;
      }

      reply.code(200).send({
        success: true,
        data: mapUserRole(user),
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch user',
      });
    }
  }

  static async update(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { oid } = request.params as { oid?: string };
      if (!oid) {
        reply.code(400).send({
          success: false,
          message: 'Invalid user oid',
        });
        return;
      }

      const actorOid = getActorOid(request);
      const payload = request.body as UpdateUserInput;
      if (actorOid && actorOid === oid && payload.role !== undefined) {
        reply.code(403).send({
          success: false,
          message: 'Users cannot update their own role',
        });
        return;
      }

      const existing = await UserService.getByOid(oid);
      if (!existing) {
        reply.code(404).send({
          success: false,
          message: 'User not found',
        });
        return;
      }
      if (!(await enforceSameTenant(request, reply, existing.tenantId))) {
        return;
      }

      const updated = await UserService.update(oid, payload);
      reply.code(200).send({
        success: true,
        data: mapUserRole(updated),
      });

      await safeLogAction(
        request,
        updated.tenantId,
        'user.updated',
        `User updated ${updated.email}`,
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to update user',
      });
    }
  }

  static async updateActivity(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { oid } = request.params as { oid?: string };
      if (!oid) {
        reply.code(400).send({
          success: false,
          message: 'Invalid user oid',
        });
        return;
      }

      const result = await UserService.touchActivity(oid);
      if (!result) {
        reply.code(404).send({
          success: false,
          message: 'User not found',
        });
        return;
      }
      if (!(await enforceSameTenant(request, reply, result.user.tenantId))) {
        return;
      }

      if (result.firstLoginSet) {
        await safeLogAction(
          request,
          result.user.tenantId,
          'auth.login',
          `User login ${result.user.email}`,
        );
      }

      reply.code(200).send({
        success: true,
        data: mapUserRole(result.user),
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to update user activity',
      });
    }
  }
}
