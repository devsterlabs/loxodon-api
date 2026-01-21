import type { FastifyInstance } from 'fastify';
import { CustomerController } from '../controllers/customer.controller.js';
import { requirePlatformAdmin } from '../middleware/authorize.middleware.js';

export async function customerRoutes(app: FastifyInstance) {
  app.get(
    '/customers',
    {
      schema: {
        description: 'Get all customers',
        tags: ['Customers'],
        response: {
          200: { $ref: 'CustomerListResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requirePlatformAdmin,
    },
    CustomerController.getAll,
  );

  app.get(
    '/customers/:tenantId',
    {
      schema: {
        description: 'Get a customer by tenantId',
        tags: ['Customers'],
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
        response: {
          200: { $ref: 'CustomerResponse#' },
          404: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requirePlatformAdmin,
    },
    CustomerController.getByTenantId,
  );

  app.post(
    '/customers',
    {
      schema: {
        description: 'Create a new customer',
        tags: ['Customers'],
        body: { $ref: 'CreateCustomerInput#' },
        response: {
          201: { $ref: 'CustomerResponse#' },
          400: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requirePlatformAdmin,
    },
    CustomerController.create,
  );

  app.put(
    '/customers/:tenantId',
    {
      schema: {
        description: 'Update a customer by tenantId',
        tags: ['Customers'],
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
        body: { $ref: 'UpdateCustomerInput#' },
        response: {
          200: { $ref: 'CustomerResponse#' },
          404: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requirePlatformAdmin,
    },
    CustomerController.update,
  );

  app.delete(
    '/customers/:tenantId',
    {
      schema: {
        description: 'Delete a customer and all users by tenantId',
        tags: ['Customers'],
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
        response: {
          200: { $ref: 'CustomerResponse#' },
          404: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requirePlatformAdmin,
    },
    CustomerController.delete,
  );
}
