import { prisma } from '../utils/prisma.js';

export type CreateRoleInput = {
  title: string;
  tenantID: string;
  description?: string;
  permissions: string[];
};

export type UpdateRoleInput = {
  title?: string;
  tenantID?: string;
  description?: string;
  permissions?: string[];
};

export class RoleService {
  static async getAll(tenantID?: string) {
    return prisma.role.findMany({
      where: tenantID ? { tenantID } : undefined,
    });
  }

  static async getById(id: number) {
    return prisma.role.findUnique({ where: { id } });
  }

  static async create(input: CreateRoleInput) {
    return prisma.role.create({
      data: {
        title: input.title,
        tenantID: input.tenantID,
        description: input.description,
        permissions: input.permissions,
      },
    });
  }

  static async update(id: number, input: UpdateRoleInput) {
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Role not found');
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        title: input.title,
        tenantID: input.tenantID,
        description: input.description,
        permissions: input.permissions,
      },
    });

    const isSiteAdmin =
      existing.title.trim().toLowerCase() === 'site admin';
    if (isSiteAdmin) {
      const allowedPermissions = new Set(updated.permissions ?? []);
      const roles = await prisma.role.findMany({
        where: {
          tenantID: existing.tenantID,
          id: { not: existing.id },
        },
      });
      const updates = roles
        .filter((role) => {
          const title = role.title.trim().toLowerCase();
          return title !== 'platform admin' && title !== 'platform-admin';
        })
        .map((role) => {
          const nextPermissions = role.permissions.filter((perm) =>
            allowedPermissions.has(perm),
          );
          const isSame =
            nextPermissions.length === role.permissions.length &&
            nextPermissions.every((perm, index) => perm === role.permissions[index]);
          if (isSame) return null;
          return prisma.role.update({
            where: { id: role.id },
            data: { permissions: nextPermissions },
          });
        })
        .filter((update) => update !== null);

      if (updates.length > 0) {
        await prisma.$transaction(updates);
      }
    }

    return updated;
  }

  static async createDefaultsForTenant(tenantID: string) {
    const titles = ['Site Admin', 'Viewer', 'Manager'];
    return prisma.role.createMany({
      data: titles.map((title) => ({
        title,
        tenantID,
        description: null,
        permissions: [],
      })),
      skipDuplicates: true,
    });
  }

  static async addPermissionsToSiteAdmin(tenantID: string, permissions: string[]) {
    if (!permissions.length) return null;
    const siteAdmin = await prisma.role.findFirst({
      where: {
        tenantID,
        title: { equals: 'Site Admin', mode: 'insensitive' },
      },
    });
    if (!siteAdmin) return null;
    const nextPermissions = Array.from(
      new Set([...(siteAdmin.permissions ?? []), ...permissions]),
    );
    return prisma.role.update({
      where: { id: siteAdmin.id },
      data: { permissions: nextPermissions },
    });
  }

  static async setGeolocationForSiteAdmin(tenantID: string, enabled: boolean) {
    const siteAdmin = await prisma.role.findFirst({
      where: {
        tenantID,
        title: { equals: 'Site Admin', mode: 'insensitive' },
      },
    });
    if (!siteAdmin) return null;
    const geoPermissions = ['location.read', 'location.update'];
    const current = siteAdmin.permissions ?? [];
    const nextPermissions = enabled
      ? Array.from(new Set([...current, ...geoPermissions]))
      : current.filter((perm) => !geoPermissions.includes(perm));
    return prisma.role.update({
      where: { id: siteAdmin.id },
      data: { permissions: nextPermissions },
    });
  }
}
