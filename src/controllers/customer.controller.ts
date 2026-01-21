import type { FastifyReply, FastifyRequest } from 'fastify';
import { CustomerService, type CreateCustomerInput, type UpdateCustomerInput } from '../services/customer.service.js';
import { getUsersFromEntraId } from '../services/entra-id.service.js';
import { RoleService } from '../services/role.service.js';
import { UserService } from '../services/user.service.js';

export class CustomerController {
  static async getAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const customers = await CustomerService.getAll();
      reply.code(200).send({
        success: true,
        data: customers,
        count: customers.length,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch customers',
      });
    }
  }

  static async getByTenantId(
    request: FastifyRequest<{ Params: { tenantId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { tenantId } = request.params;
      const customer = await CustomerService.getByTenantId(tenantId);

      if (!customer) {
        reply.code(404).send({
          success: false,
          message: 'Customer not found',
        });
        return;
      }

      reply.code(200).send({
        success: true,
        data: customer,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch customer',
      });
    }
  }

  static async create(
    request: FastifyRequest<{ Body: CreateCustomerInput }>,
    reply: FastifyReply,
  ) {
    try {
      const { domain, tenantId, autoSync } = request.body;
      if (!domain || !tenantId) {
        reply.code(400).send({
          success: false,
          message: 'domain and tenantId are required',
        });
        return;
      }

      const customer = await CustomerService.create({ domain, tenantId, autoSync });

      try {
        await RoleService.createDefaultsForTenant(tenantId);
      } catch (error) {
        request.log.error(error, 'Failed to create default roles for customer');
      }

      try {
        const entraUsers = await getUsersFromEntraId(tenantId);
        const users = entraUsers.map((user) => ({ oid: user.oid, email: user.email }));
        await UserService.createManyForTenant(tenantId, users);
      } catch (error) {
        request.log.error(error, 'Failed to sync users from Entra ID');
      }

      reply.code(201).send({
        success: true,
        data: customer,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to create customer',
      });
    }
  }

  static async update(
    request: FastifyRequest<{ Params: { tenantId: string }; Body: UpdateCustomerInput }>,
    reply: FastifyReply,
  ) {
    try {
      const { tenantId } = request.params;
      const existing = await CustomerService.getByTenantId(tenantId);
      if (!existing) {
        reply.code(404).send({
          success: false,
          message: 'Customer not found',
        });
        return;
      }

      const updated = await CustomerService.update(tenantId, request.body);
      reply.code(200).send({
        success: true,
        data: updated,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to update customer',
      });
    }
  }

  static async delete(
    request: FastifyRequest<{ Params: { tenantId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { tenantId } = request.params;
      const existing = await CustomerService.getByTenantId(tenantId);
      if (!existing) {
        reply.code(404).send({
          success: false,
          message: 'Customer not found',
        });
        return;
      }

      const deleted = await CustomerService.deleteByTenantId(tenantId);

      reply.code(200).send({
        success: true,
        data: deleted,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to delete customer',
      });
    }
  }
}
