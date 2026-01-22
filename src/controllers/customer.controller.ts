import type { FastifyReply, FastifyRequest } from 'fastify';
import { CustomerService, type CreateCustomerInput, type UpdateCustomerInput } from '../services/customer.service.js';
import { getUsersFromEntraId } from '../services/entra-id.service.js';
import { RoleService } from '../services/role.service.js';
import { UserService } from '../services/user.service.js';
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
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { tenantId } = request.params as { tenantId?: string };
      if (!tenantId) {
        reply.code(400).send({
          success: false,
          message: 'tenantId is required',
        });
        return;
      }
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
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { domain, tenantId, autoSync, geolocationEnabled } =
        request.body as CreateCustomerInput;
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
        if (geolocationEnabled) {
          await RoleService.addPermissionsToSiteAdmin(tenantId, [
            'location.read',
            'location.update',
          ]);
        }
      } catch (error) {
        request.log.error(error, 'Failed to create default roles for customer');
      }

      try {
        const entraUsers = await getUsersFromEntraId(domain);
        const users = entraUsers.map((user) => ({ oid: user.oid, email: user.email }));
        await UserService.createManyForTenant(tenantId, users);
      } catch (error) {
        request.log.error(error, 'Failed to sync users from Entra ID');
      }

      await safeLogAction(
        request,
        tenantId,
        'customer.created',
        `Customer created for domain ${domain}`,
      );

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
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { tenantId } = request.params as { tenantId?: string };
      if (!tenantId) {
        reply.code(400).send({
          success: false,
          message: 'tenantId is required',
        });
        return;
      }
      const existing = await CustomerService.getByTenantId(tenantId);
      if (!existing) {
        reply.code(404).send({
          success: false,
          message: 'Customer not found',
        });
        return;
      }

      const { geolocationEnabled, ...rest } =
        request.body as UpdateCustomerInput;
      const updated = await CustomerService.update(tenantId, rest);
      reply.code(200).send({
        success: true,
        data: updated,
      });

      if (typeof geolocationEnabled === 'boolean') {
        try {
          await RoleService.setGeolocationForSiteAdmin(tenantId, geolocationEnabled);
        } catch (error) {
          request.log.error(error, 'Failed to update Site Admin geolocation permissions');
        }
      }

      await safeLogAction(
        request,
        tenantId,
        'customer.updated',
        `Customer updated for domain ${updated.domain}`,
      );
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        success: false,
        message: 'Failed to update customer',
      });
    }
  }

}
