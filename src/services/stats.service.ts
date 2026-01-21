import { prisma } from '../utils/prisma.js';

type RangeCounts = {
  last7days: number;
  lastMonth: number;
  lastYear: number;
};

export class StatsService {
  static async getOverview() {
    const now = new Date();
    const start7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startMonth = new Date(now);
    startMonth.setUTCMonth(startMonth.getUTCMonth() - 1);
    const startYear = new Date(now);
    startYear.setUTCFullYear(startYear.getUTCFullYear() - 1);
    const activeCutoff = new Date(now.getTime() - 2 * 60 * 1000);

    const [
      activeCustomers,
      totalUsers,
      newUsers7,
      newUsersMonth,
      newUsersYear,
      deletedUsers7,
      deletedUsersMonth,
      deletedUsersYear,
      activeNow,
    ] = await prisma.$transaction([
      prisma.customer.count({ where: { active: true } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: start7 } } }),
      prisma.user.count({ where: { createdAt: { gte: startMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: startYear } } }),
      prisma.user.count({
        where: { status: 'deleted', updatedAt: { gte: start7 } },
      }),
      prisma.user.count({
        where: { status: 'deleted', updatedAt: { gte: startMonth } },
      }),
      prisma.user.count({
        where: { status: 'deleted', updatedAt: { gte: startYear } },
      }),
      prisma.user.count({ where: { lastActive: { gte: activeCutoff } } }),
    ]);

    const newUsers: RangeCounts = {
      last7days: newUsers7,
      lastMonth: newUsersMonth,
      lastYear: newUsersYear,
    };

    const deletedUsers: RangeCounts = {
      last7days: deletedUsers7,
      lastMonth: deletedUsersMonth,
      lastYear: deletedUsersYear,
    };

    return {
      activeCustomers,
      totalUsers,
      newUsers,
      deletedUsers,
      activeNow,
    };
  }
}
