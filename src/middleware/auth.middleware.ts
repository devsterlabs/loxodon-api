import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const UNPROTECTED_PREFIXES = ['/docs', '/health'];

const tenantId = process.env.TENANT_ID || process.env.ENTRA_ID_TENANT_ID;
const allowedAudiences = (process.env.ALLOWED_AUDIENCES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const issuerV2 = tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : undefined;
const issuerV1 = tenantId ? `https://sts.windows.net/${tenantId}/` : undefined;
const jwks = tenantId
  ? jwksClient({
      jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    })
  : null;

const getSigningKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
  if (!jwks) {
    callback(new Error('JWKS client not configured'));
    return;
  }
  if (!header.kid) {
    callback(new Error('Missing kid'));
    return;
  }
  jwks.getSigningKey(header.kid, (error, key) => {
    if (error) {
      callback(error);
      return;
    }
    callback(null, key.getPublicKey());
  });
};

async function verifyToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        algorithms: ['RS256'],
        audience: allowedAudiences.length ? allowedAudiences : undefined,
        issuer: issuerV2 && issuerV1 ? [issuerV2, issuerV1] : issuerV2 || issuerV1,
      },
      (error, decoded) => {
        if (error) {
          reject(error);
          return;
        }
        if (!decoded || typeof decoded === 'string') {
          reject(new Error('Invalid token payload'));
          return;
        }
        resolve(decoded);
      },
    );
  });
}

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
    return;
  }

  if (!tenantId || !jwks) {
    request.log.error('Missing TENANT_ID/ENTRA_ID_TENANT_ID configuration');
    reply.code(500).send({
      success: false,
      message: 'Server authentication is not configured',
    });
    return;
  }

  try {
    const payload = await verifyToken(token);
    request.user = payload;
  } catch (error) {
    request.log.warn(error, 'JWT validation failed');
    reply.code(401).send({
      success: false,
      message: 'Unauthorized',
    });
  }
}
