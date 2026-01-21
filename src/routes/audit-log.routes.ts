import type { FastifyInstance } from 'fastify';
import { AuditLogController } from '../controllers/audit-log.controller.js';
import { requireAnyPermission, requirePermissions } from '../middleware/authorize.middleware.js';

export async function auditLogRoutes(app: FastifyInstance) {
  app.get(
    '/audit-logs',
    {
      schema: {
        description: 'Get all audit logs',
        tags: ['Audit Logs'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string' },
            limit: { type: 'string' },
            userId: { type: 'string' },
          },
        },
        response: {
          200: { $ref: 'AuditLogListResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requireAnyPermission(['audit_logs.read', 'logs.read']),
    },
    AuditLogController.getAll,
  );

  app.get(
    '/audit-logs/export',
    {
      schema: {
        description: 'Export audit logs (CSV) by date range',
        tags: ['Audit Logs'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            userId: { type: 'string' },
          },
        },
        response: {
          200: { type: 'string' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requireAnyPermission(['audit_logs.export', 'logs.export']),
    },
    AuditLogController.export,
  );

  app.get(
    '/audit-logs/:id',
    {
      schema: {
        description: 'Get an audit log by ID',
        tags: ['Audit Logs'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: { $ref: 'AuditLogResponse#' },
          400: { $ref: 'ErrorResponse#' },
          404: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requireAnyPermission(['audit_logs.read', 'logs.read']),
    },
    AuditLogController.getById,
  );

  app.post(
    '/audit-logs',
    {
      schema: {
        description: 'Create an audit log',
        tags: ['Audit Logs'],
        body: { $ref: 'CreateAuditLogInput#' },
        response: {
          201: { $ref: 'AuditLogResponse#' },
          400: { $ref: 'ErrorResponse#' },
          500: { $ref: 'ErrorResponse#' },
        },
      },
      preHandler: requireAnyPermission(['audit_logs.write', 'logs.write']),
    },
    AuditLogController.create,
  );
}
