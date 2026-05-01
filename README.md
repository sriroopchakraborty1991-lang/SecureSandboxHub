# Golem

Golem is a local-first MCP security testing workbench you can run locally: register MCP servers, import tool manifests, run lightweight scans (static + drift), export findings, and optionally run Docker sandboxes with policies and monitoring.

## What You Can Do
- **Policies**: Define safe runtime constraints (network on/off, CPU, memory, read-only root FS).
- **Sandboxes**: Start/stop isolated Docker-based sessions.
- **Monitoring**: Live event stream (SSE) for each session (stdout/stderr/lifecycle).
- **Threat Analysis**: Rule-based risk score + human-readable reasons.

## Quickstart (Recommended)
1. Copy environment files:

```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

2. Set a strong JWT secret in `packages/backend/.env`:

```bash
JWT_SECRET=change-me-to-a-long-random-string
```

3. Run the stack:

```bash
npm run dev
```

4. Open:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/health

## Run Without Docker (Optional)
Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

## Minimal API
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/policy-templates`
- `GET /api/policies`
- `POST /api/policies`
- `GET /api/sandboxes`
- `POST /api/sandboxes`
- `GET /api/sandboxes/:id`
- `POST /api/sandboxes/:id/stop`
- `GET /api/sandboxes/:id/events`
- `GET /api/sandboxes/:id/events/stream`
- `POST /api/threat-analysis`

## Notes
- Sandbox execution requires Docker access. If Docker is not available, the API will still run but sandbox start will fail.
- This is an MVP intended for local use. Production hardening is out of scope.
