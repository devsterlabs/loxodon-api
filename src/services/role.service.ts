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
  static async getAll() {
    return prisma.role.findMany();
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
    return prisma.role.update({
      where: { id },
      data: {
        title: input.title,
        tenantID: input.tenantID,
        description: input.description,
        permissions: input.permissions,
      },
    });
  }
}
