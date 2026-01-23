import type { UserStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export type UpdateUserInput = {
  email?: string;
  role?: number | null;
  status?: UserStatus;
};

export class UserService {
  static async getByCustomer(tenantId: string) {
    return prisma.user.findMany({
      where: { tenantId },
      include: { role: true },
    });
  }

  static async getByOid(oid: string) {
    return prisma.user.findUnique({
      where: { oid },
      include: { role: true },
    });
  }

  static async getByOidWithCustomer(oid: string) {
    return prisma.user.findUnique({
      where: { oid },
      include: { role: true, customer: true },
    });
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

  static async touchActivity(oid: string) {
    const user = await prisma.user.findUnique({ where: { oid } });
    if (!user) {
      return null;
    }

    const now = new Date();
    const firstLoginSet = !user.firstLogin;
    const updated = await prisma.user.update({
      where: { oid },
      data: {
        lastActive: now,
        firstLogin: user.firstLogin ?? now,
      },
    });
    return { user: updated, firstLoginSet };
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

  static async markMissingAsDeleted(tenantId: string, activeOids: string[]) {
    if (activeOids.length === 0) {
      return prisma.user.updateMany({
        where: {
          tenantId,
          status: { not: 'deleted' },
        },
        data: { status: 'deleted' },
      });
    }

    return prisma.user.updateMany({
      where: {
        tenantId,
        oid: { notIn: activeOids },
        status: { not: 'deleted' },
      },
      data: { status: 'deleted' },
    });
  }
}
