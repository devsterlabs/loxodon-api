import type { FastifyReply, FastifyRequest } from 'fastify';

const UNPROTECTED_PREFIXES = ['/docs', '/health'];

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (request.method === 'OPTIONS') {
    return;
  }

  const url = request.url;
  if (UNPROTECTED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({
      success: false,
      message: 'Unauthorized',
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    reply.code(401).send({
      success: false,
      message: 'Unauthorized',
    });
  }
}
