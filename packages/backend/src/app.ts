import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import type {Db} from './db/db';
import type {SandboxRunner} from './sandbox/runner';
import {registerRoutes} from './routes';

export type AuthUser = {id: string; role: 'admin' | 'user'};

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    runner: SandboxRunner;
  }
  interface FastifyRequest {
    authUser: AuthUser | null;
  }
}

export function buildApp(input: {db: Db; runner: SandboxRunner; jwtSecret: string}) {
  const app = Fastify({logger: true});

  app.decorate('db', input.db);
  app.decorate('runner', input.runner);

  app.register(cors, {origin: true});
  app.register(jwt, {secret: input.jwtSecret});

  app.decorateRequest('authUser', null);

  app.addHook('preHandler', async (req) => {
    if (req.authUser) return;
    const authHeader = req.headers.authorization;
    let token: string | null = null;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim();
    } else if (req.routeOptions?.url?.endsWith('/stream')) {
      const q = req.query as any;
      if (typeof q?.token === 'string') token = q.token;
    }
    if (!token) return;
    try {
      const payload = app.jwt.verify(token) as any;
      const id = typeof payload?.sub === 'string' ? payload.sub : null;
      const role = payload?.role === 'admin' ? 'admin' : 'user';
      if (id) (req as any).authUser = {id, role} satisfies AuthUser;
    } catch {}
  });

  registerRoutes(app);

  app.get('/health', async () => ({ok: true}));

  return app;
}
