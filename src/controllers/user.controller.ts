import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserService, type UpdateUserInput } from '../services/user.service.js';

function mapUserRole<T extends { roleId: number }>(user: T) {
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
}
