import type { UserStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export type UpdateUserInput = {
  email?: string;
  role?: number;
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
}
