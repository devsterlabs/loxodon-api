import type { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user.controller.js';

export async function userRoutes(app: FastifyInstance) {
  app.get(
    '/users',
    {
      schema: {
        description: 'Get all users for a customer',
        tags: ['Users'],
        querystring: {
          type: 'object',
          properties: {
            customerId: { type: 'string' },
          },
          required: ['customerId'],
        },
        response: {
          200: { $ref: 'UserListResponse#' },
          400: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
    },
    UserController.getByCustomer,
  );

  app.get(
    '/users/:oid',
    {
      schema: {
        description: 'Get a user by OID',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            oid: { type: 'string' },
          },
          required: ['oid'],
        },
        response: {
          200: { $ref: 'UserResponse#' },
          400: { $ref: 'ErrorResponse#' },
          404: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
    },
    UserController.getByOid,
  );

  app.put(
    '/users/:oid',
    {
      schema: {
        description: 'Update a user by OID',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            oid: { type: 'string' },
          },
          required: ['oid'],
        },
        body: { $ref: 'UpdateUserInput#' },
        response: {
          200: { $ref: 'UserResponse#' },
          400: { $ref: 'ErrorResponse#' },
          404: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
    },
    UserController.update,
  );

  app.put(
    '/users/:oid/activity',
    {
      schema: {
        description: 'Update user activity timestamps',
        tags: ['Users'],
        params: {
          type: 'object',
          properties: {
            oid: { type: 'string' },
          },
          required: ['oid'],
        },
        response: {
          200: { $ref: 'UserResponse#' },
          400: { $ref: 'ErrorResponse#' },
          404: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
    },
    UserController.updateActivity,
  );
}
