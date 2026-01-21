import type { FastifyInstance } from 'fastify';
import { RoleController } from '../controllers/role.controller.js';
import { requirePermissions } from '../middleware/authorize.middleware.js';

export async function roleRoutes(app: FastifyInstance) {
  app.get(
    '/roles',
    {
      schema: {
        description: 'Get all roles',
        tags: ['Roles'],
        response: {
          200: { $ref: 'RoleListResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requirePermissions(['roles.read']),
    },
    RoleController.getAll,
  );

  app.get(
    '/roles/:id',
    {
      schema: {
        description: 'Get a role by ID',
        tags: ['Roles'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: { $ref: 'RoleResponse#' },
          400: { $ref: 'ErrorResponse#' },
          404: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requirePermissions(['roles.read']),
    },
    RoleController.getById,
  );

  app.post(
    '/roles',
    {
      schema: {
        description: 'Create a role',
        tags: ['Roles'],
        body: { $ref: 'CreateRoleInput#' },
        response: {
          201: { $ref: 'RoleResponse#' },
          400: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requirePermissions(['roles.create']),
    },
    RoleController.create,
  );

  app.put(
    '/roles/:id',
    {
      schema: {
        description: 'Update a role by ID',
        tags: ['Roles'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: { $ref: 'UpdateRoleInput#' },
        response: {
          200: { $ref: 'RoleResponse#' },
          400: { $ref: 'ErrorResponse#' },
          404: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requirePermissions(['roles.update']),
    },
    RoleController.update,
  );
}
