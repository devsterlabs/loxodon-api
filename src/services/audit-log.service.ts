import { prisma } from '../utils/prisma.js';

export type CreateAuditLogInput = {
  tenantId: string;
  userId: string;
  action: string;
  description: string;
};

export class AuditLogService {
  static async getAll(page = 1, limit = 20, userId?: string, tenantId?: string) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 20;
    const skip = (safePage - 1) * safeLimit;
    const where: Record<string, unknown> = {};
    if (userId) {
      where.userId = userId;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: Object.keys(where).length ? where : undefined,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: Object.keys(where).length ? where : undefined }),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  static async getById(id: number) {
    return prisma.auditLog.findUnique({ where: { id } });
  }

  static async create(input: CreateAuditLogInput) {
    return prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        action: input.action,
        description: input.description,
      },
    });
  }

  static async createIfUserExists(input: CreateAuditLogInput) {
    const user = await prisma.user.findUnique({ where: { oid: input.userId } });
    if (!user) {
      return null;
    }
    return this.create(input);
  }

  static async getByDateRange(
    start?: Date,
    end?: Date,
    userId?: string,
    tenantId?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (userId) {
      where.userId = userId;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }
    if (start || end) {
      where.createdAt = {};
      if (start) {
        (where.createdAt as { gte?: Date }).gte = start;
      }
      if (end) {
        (where.createdAt as { lte?: Date }).lte = end;
      }
    }

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
