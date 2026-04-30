import type {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';
import Joi from 'joi';
import {hashPassword, verifyPassword} from './security/password';
import {createUser, getUserByEmail} from './db/users';
import {createPolicy, getPolicyById, listPolicies, policyTemplates, type PolicyRules} from './db/policies';
import {createSandbox, getSandboxById, listSandboxes, setSandboxContainerId, setSandboxStatus} from './db/sandboxes';
import {appendEvent, listEvents} from './db/events';
import {subscribeToSandboxEvents} from './events/bus';
import {analyzeThreat} from './threat/scoring';

function requireAuth(req: FastifyRequest, reply: FastifyReply): {id: string; role: 'admin' | 'user'} | null {
  if (req.authUser) return req.authUser;
  reply.code(401).send({error: 'unauthorized'});
  return null;
}

export function registerRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (req, reply) => {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).max(200).required()
    });
    const {value, error} = schema.validate(req.body);
    if (error) return reply.code(400).send({error: error.message});

    const existing = getUserByEmail(app.db, value.email);
    if (existing) return reply.code(409).send({error: 'email_already_registered'});

    const userCount = app.db.prepare('SELECT COUNT(*) as c FROM users').get() as {c: number};
    const role = userCount.c === 0 ? 'admin' : 'user';

    const user = createUser(app.db, {email: value.email, passwordHash: hashPassword(value.password), role});
    const token = app.jwt.sign({sub: user.id, role: user.role});
    return reply.send({token, user: {id: user.id, email: user.email, role: user.role}});
  });

  app.post('/api/auth/login', async (req, reply) => {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    });
    const {value, error} = schema.validate(req.body);
    if (error) return reply.code(400).send({error: error.message});

    const user = getUserByEmail(app.db, value.email);
    if (!user) return reply.code(401).send({error: 'invalid_credentials'});
    if (!verifyPassword(value.password, user.passwordHash)) return reply.code(401).send({error: 'invalid_credentials'});

    const token = app.jwt.sign({sub: user.id, role: user.role});
    return reply.send({token, user: {id: user.id, email: user.email, role: user.role}});
  });

  app.get('/api/policy-templates', async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    return reply.send({templates: policyTemplates});
  });

  app.get('/api/policies', async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    return reply.send({policies: listPolicies(app.db, auth.id)});
  });

  app.post('/api/policies', async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const rulesSchema = Joi.object<PolicyRules>({
      allowNetwork: Joi.boolean().required(),
      memoryLimitMb: Joi.number().integer().min(64).max(8192).required(),
      cpuLimit: Joi.number().min(0.1).max(8).required(),
      readOnlyRootFs: Joi.boolean().required()
    });

    const schema = Joi.object({
      name: Joi.string().min(1).max(200).required(),
      rules: rulesSchema.required()
    });

    const {value, error} = schema.validate(req.body);
    if (error) return reply.code(400).send({error: error.message});

    return reply.send({policy: createPolicy(app.db, {name: value.name, rules: value.rules, createdBy: auth.id})});
  });

  app.get('/api/sandboxes', async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    return reply.send({sandboxes: listSandboxes(app.db, auth.id)});
  });

  app.post('/api/sandboxes', async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;

    const schema = Joi.object({
      image: Joi.string().min(1).max(200).default('alpine:latest'),
      policyId: Joi.string().guid({version: ['uuidv4', 'uuidv5']}).required(),
      command: Joi.array().items(Joi.string().min(1).max(200)).max(50).optional()
    });

    const {value, error} = schema.validate(req.body);
    if (error) return reply.code(400).send({error: error.message});

    const policy = getPolicyById(app.db, value.policyId, auth.id);
    if (!policy) return reply.code(404).send({error: 'policy_not_found'});

    const sandbox = createSandbox(app.db, {
      image: value.image,
      command: value.command ? (value.command as string[]) : null,
      policyId: policy.id,
      createdBy: auth.id
    });

    appendEvent(app.db, {sandboxId: sandbox.id, ts: Date.now(), type: 'lifecycle', message: 'sandbox_created', meta: {image: sandbox.image}});

    try {
      const containerId = await app.runner.startSandbox({
        sandboxId: sandbox.id,
        createdBy: auth.id,
        image: sandbox.image,
        command: sandbox.command,
        policy: policy.rules
      });
      setSandboxContainerId(app.db, sandbox.id, auth.id, containerId);
    } catch (err: any) {
      setSandboxStatus(app.db, sandbox.id, auth.id, 'error', Date.now());
      appendEvent(app.db, {
        sandboxId: sandbox.id,
        ts: Date.now(),
        type: 'error',
        message: `sandbox_start_failed:${String(err?.message ?? err)}`,
        meta: null
      });
    }

    return reply.send({sandbox: getSandboxById(app.db, sandbox.id, auth.id)});
  });

  app.get('/api/sandboxes/:id', async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const schema = Joi.object({id: Joi.string().required()});
    const {value, error} = schema.validate(req.params);
    if (error) return reply.code(400).send({error: error.message});

    const sandbox = getSandboxById(app.db, value.id, auth.id);
    if (!sandbox) return reply.code(404).send({error: 'sandbox_not_found'});
    return reply.send({sandbox});
  });

  app.post('/api/sandboxes/:id/stop', async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const schema = Joi.object({id: Joi.string().required()});
    const {value, error} = schema.validate(req.params);
    if (error) return reply.code(400).send({error: error.message});

    const sandbox = getSandboxById(app.db, value.id, auth.id);
    if (!sandbox) return reply.code(404).send({error: 'sandbox_not_found'});

    if (sandbox.dockerContainerId) {
      await app.runner.stopSandbox({sandboxId: sandbox.id, containerId: sandbox.dockerContainerId});
    }
    setSandboxStatus(app.db, sandbox.id, auth.id, 'stopped', Date.now());
    appendEvent(app.db, {sandboxId: sandbox.id, ts: Date.now(), type: 'lifecycle', message: 'sandbox_stopped', meta: null});

    return reply.send({sandbox: getSandboxById(app.db, sandbox.id, auth.id)});
  });

  app.get('/api/sandboxes/:id/events', async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const schema = Joi.object({
      id: Joi.string().required()
    });
    const qSchema = Joi.object({
      limit: Joi.number().integer().min(1).max(500).default(200),
      beforeTs: Joi.number().integer().min(0).optional()
    });

    const {value: params, error: pErr} = schema.validate(req.params);
    if (pErr) return reply.code(400).send({error: pErr.message});
    const {value: query, error: qErr} = qSchema.validate(req.query);
    if (qErr) return reply.code(400).send({error: qErr.message});

    const sandbox = getSandboxById(app.db, params.id, auth.id);
    if (!sandbox) return reply.code(404).send({error: 'sandbox_not_found'});

    return reply.send({events: listEvents(app.db, sandbox.id, query.limit, query.beforeTs)});
  });

  app.get('/api/sandboxes/:id/events/stream', async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const schema = Joi.object({id: Joi.string().required()});
    const {value: params, error} = schema.validate(req.params);
    if (error) return reply.code(400).send({error: error.message});

    const sandbox = getSandboxById(app.db, params.id, auth.id);
    if (!sandbox) return reply.code(404).send({error: 'sandbox_not_found'});

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });
    reply.raw.write('\n');

    const existing = listEvents(app.db, sandbox.id, 50);
    for (const ev of existing) {
      reply.raw.write(`event: sandbox_event\n`);
      reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
    }

    const unsubscribe = subscribeToSandboxEvents(sandbox.id, (ev) => {
      reply.raw.write(`event: sandbox_event\n`);
      reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
    });

    const keepAlive = setInterval(() => {
      reply.raw.write(`event: ping\ndata: {}\n\n`);
    }, 15000);

    reply.raw.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });

    return reply;
  });

  app.post('/api/threat-analysis', async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const schema = Joi.object({sandboxId: Joi.string().required()});
    const {value, error} = schema.validate(req.body);
    if (error) return reply.code(400).send({error: error.message});

    const sandbox = getSandboxById(app.db, value.sandboxId, auth.id);
    if (!sandbox) return reply.code(404).send({error: 'sandbox_not_found'});
    const policy = getPolicyById(app.db, sandbox.policyId, auth.id);
    if (!policy) return reply.code(404).send({error: 'policy_not_found'});

    const events = listEvents(app.db, sandbox.id, 200);
    return reply.send({analysis: analyzeThreat({sandbox, policy: policy.rules, events})});
  });
}
