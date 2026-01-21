import type { FastifyReply, FastifyRequest } from 'fastify';
import { CustomerService } from '../services/customer.service.js';
import { getUsersFromEntraId } from '../services/entra-id.service.js';
import { UserService, type UpdateUserInput } from '../services/user.service.js';

function mapUserRole<T extends { roleId: number | null }>(user: T) {
  const { roleId, ...rest } = user;
  return { ...rest, role: roleId };
}

export class UserController {
  static async getByCustomer(
    request: FastifyRequest<{ Querystring: { customerId?: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { customerId } = request.query;
      if (!customerId) {
        reply.code(400).send({
          success: false,
          message: 'customerId is required',
        });
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
    request: FastifyRequest<{ Params: { oid: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { oid } = request.params;
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
    request: FastifyRequest<{ Params: { oid: string }; Body: UpdateUserInput }>,
    reply: FastifyReply,
  ) {
    try {
      const { oid } = request.params;
      if (!oid) {
        reply.code(400).send({
          success: false,
          message: 'Invalid user oid',
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

      const updated = await UserService.update(oid, request.body);
      reply.code(200).send({
        success: true,
        data: mapUserRole(updated),
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to update user',
      });
    }
  }

  static async updateActivity(
    request: FastifyRequest<{ Params: { oid: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { oid } = request.params;
      if (!oid) {
        reply.code(400).send({
          success: false,
          message: 'Invalid user oid',
        });
        return;
      }

      const updated = await UserService.touchActivity(oid);
      if (!updated) {
        reply.code(404).send({
          success: false,
          message: 'User not found',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        data: mapUserRole(updated),
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
