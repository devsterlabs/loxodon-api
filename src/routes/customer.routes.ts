import type { FastifyInstance } from 'fastify';
import { CustomerController } from '../controllers/customer.controller.js';

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
    },
    CustomerController.update,
  );
}
