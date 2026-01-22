import type { FastifyReply, FastifyRequest } from 'fastify';
import type { JwtPayload } from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';

const PLATFORM_ADMIN_TITLES = new Set(['platform admin', 'platform-admin']);

export const getActorOid = (request: FastifyRequest): string | undefined => {
  const payload = request.user as JwtPayload | undefined;
  if (typeof payload?.oid === 'string') return payload.oid;
  if (typeof payload?.sub === 'string') return payload.sub;
  return undefined;
};

const getUserContext = async (
  request: FastifyRequest,
  oid: string,
): Promise<{ permissions: string[]; tenantId?: string; roleTitle?: string }> => {
  const user = await prisma.user.findUnique({
    where: { oid },
    include: { role: true },
  });
  if (!user) {
    return { permissions: [], tenantId: undefined, roleTitle: undefined };
  }
  request.userTenantId = user.tenantId;
  if (!user.role) {
    return { permissions: [], tenantId: user.tenantId, roleTitle: undefined };
  }
  if (PLATFORM_ADMIN_TITLES.has(user.role.title.toLowerCase())) {
    return {
      permissions: ['*'],
      tenantId: user.tenantId,
      roleTitle: user.role.title,
    };
  }
  return {
    permissions: user.role.permissions ?? [],
    tenantId: user.tenantId,
    roleTitle: user.role.title,
  };
};

export const isPlatformAdmin = async (request: FastifyRequest): Promise<boolean> => {
  const oid = getActorOid(request);
  if (!oid) return false;
  const { roleTitle, permissions } = await getUserContext(request, oid);
  if (permissions.includes('*')) return true;
  return roleTitle ? PLATFORM_ADMIN_TITLES.has(roleTitle.toLowerCase()) : false;
};

export const requirePlatformAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  if (await isPlatformAdmin(request)) return;
  const oid = getActorOid(request);
  if (!oid) {
    reply.code(403).send({ success: false, message: 'Forbidden' });
    return;
  }
  const { permissions } = await getUserContext(request, oid);
  if (permissions.includes('*')) return;
  reply.code(403).send({ success: false, message: 'Forbidden' });
};

export const requirePermissions =
  (required: string[]) => async (request: FastifyRequest, reply: FastifyReply) => {
    if (await isPlatformAdmin(request)) return;
    const oid = getActorOid(request);
    if (!oid) {
      reply.code(403).send({ success: false, message: 'Forbidden' });
      return;
    }
    const { permissions } = await getUserContext(request, oid);
    if (permissions.includes('*')) return;
    const hasAll = required.every((perm) => permissions.includes(perm));
    if (!hasAll) {
      reply.code(403).send({ success: false, message: 'Forbidden' });
    }
  };

export const requireAnyPermission =
  (required: string[]) => async (request: FastifyRequest, reply: FastifyReply) => {
    if (await isPlatformAdmin(request)) return;
    const oid = getActorOid(request);
    if (!oid) {
      reply.code(403).send({ success: false, message: 'Forbidden' });
      return;
    }
    const { permissions } = await getUserContext(request, oid);
    if (permissions.includes('*')) return;
    const hasAny = required.some((perm) => permissions.includes(perm));
    if (!hasAny) {
      reply.code(403).send({ success: false, message: 'Forbidden' });
    }
  };

export const requireSelfOrPermission =
  (permission: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    if (await isPlatformAdmin(request)) return;
    const oid = getActorOid(request);
    const paramOid = (request.params as { oid?: string }).oid;
    if (oid && paramOid && oid === paramOid) return;
    if (!oid) {
      reply.code(403).send({ success: false, message: 'Forbidden' });
      return;
    }
    const { permissions } = await getUserContext(request, oid);
    if (permissions.includes('*') || permissions.includes(permission)) return;
    reply.code(403).send({ success: false, message: 'Forbidden' });
  };

export const requireSelfOrPermissions =
  (required: string[]) => async (request: FastifyRequest, reply: FastifyReply) => {
    if (await isPlatformAdmin(request)) return;
    const oid = getActorOid(request);
    const paramOid = (request.params as { oid?: string }).oid;
    if (oid && paramOid && oid === paramOid) return;
    if (!oid) {
      reply.code(403).send({ success: false, message: 'Forbidden' });
      return;
    }
    const { permissions } = await getUserContext(request, oid);
    if (permissions.includes('*')) return;
    const hasAny = required.some((perm) => permissions.includes(perm));
    if (hasAny) return;
    reply.code(403).send({ success: false, message: 'Forbidden' });
  };

export const getActorTenantId = async (
  request: FastifyRequest,
): Promise<string | undefined> => {
  if (request.userTenantId) {
    return request.userTenantId;
  }
  const oid = getActorOid(request);
  if (!oid) return undefined;
  const { tenantId } = await getUserContext(request, oid);
  return tenantId;
};

export const hasGlobalAccess = async (request: FastifyRequest): Promise<boolean> => {
  if (await isPlatformAdmin(request)) return true;
  const oid = getActorOid(request);
  if (!oid) return false;
  const { permissions } = await getUserContext(request, oid);
  return permissions.includes('*');
};
