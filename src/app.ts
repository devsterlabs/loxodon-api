import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { authMiddleware } from './middleware/auth.middleware.js';
import { schemas } from './schemas/index.js';
import { customerRoutes } from './routes/customer.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { roleRoutes } from './routes/role.routes.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  for (const schema of schemas) {
    app.addSchema(schema);
  }

  app.register(cors, {
    origin: true,
  });

  const serverUrl = process.env.VERCEL
    ? '/'
    : `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`;

  app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Loxodon API',
        description: 'API documentation for Loxodon',
        version: '1.0.0',
      },
      servers: [
        {
          url: serverUrl,
          description: 'API server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  app.addHook('onRequest', authMiddleware);

  app.register(customerRoutes);
  app.register(userRoutes);
  app.register(roleRoutes);

  app.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['Health'],
        response: {
          200: { $ref: 'HealthResponse#' },
        },
      },
    },
    async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    },
  );

  return app;
}

async function start() {
  const app = buildApp();
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

const entry = process.argv[1] && pathToFileURL(process.argv[1]).href;
if (entry === import.meta.url) {
  start();
}
