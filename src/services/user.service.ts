import type { UserStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export type UpdateUserInput = {
  email?: string;
  role?: number | null;
  status?: UserStatus;
};

export class UserService {
  static async getByCustomer(tenantId: string) {
    return prisma.user.findMany({ where: { tenantId } });
  }

  static async getByOid(oid: string) {
    return prisma.user.findUnique({ where: { oid } });
  }

  static async update(oid: string, input: UpdateUserInput) {
    return prisma.user.update({
      where: { oid },
      data: {
        email: input.email,
        roleId: input.role,
        status: input.status,
      },
    });
  }

  static async createManyForTenant(
    tenantId: string,
    users: Array<{ oid: string; email: string }>,
  ) {
    if (users.length === 0) {
      return { count: 0 };
    }

    return prisma.user.createMany({
      data: users.map((user) => ({
        oid: user.oid,
        email: user.email,
        tenantId,
        roleId: null,
      })),
      skipDuplicates: true,
    });
  }
}
