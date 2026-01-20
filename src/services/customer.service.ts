import { prisma } from '../utils/prisma.js';

export type CreateCustomerInput = {
  domain: string;
  tenantId: string;
  autoSync?: boolean;
};

export type UpdateCustomerInput = {
  domain?: string;
  active?: boolean;
  autoSync?: boolean;
};

export class CustomerService {
  static async getAll() {
    return prisma.customer.findMany();
  }

  static async getByTenantId(tenantId: string) {
    return prisma.customer.findUnique({ where: { tenantId } });
  }

  static async create(input: CreateCustomerInput) {
    return prisma.customer.create({
      data: {
        domain: input.domain,
        tenantId: input.tenantId,
        autoSync: input.autoSync ?? false,
      },
    });
  }

  static async update(tenantId: string, input: UpdateCustomerInput) {
    return prisma.customer.update({
      where: { tenantId },
      data: {
        domain: input.domain,
        active: input.active,
        autoSync: input.autoSync,
      },
    });
  }
}
