# Golem

Golem is a **local-first MCP security testing workbench**. It helps you understand what your MCP servers can do, find risky tool designs early, detect drift over time, and generate shareable evidence (**findings.json + PDF report**)—without needing a heavy enterprise setup.

If you’re building agentic workflows, the easiest time to catch MCP risk is **before** the first production incident. Golem is designed to make that practical.

## GitHub Repo Description (suggested)
Local-first MCP Security Testing Workbench: register MCP servers, import tool manifests, run static + drift scans, and export findings (JSON/PDF). Includes sandbox + monitoring utilities.

## What Golem Does

### MCP Security Testing (core)
- **MCP server inventory**: register MCP servers with environment + endpoint metadata.
- **Tool manifest import**: paste/import tool definitions and schemas.
- **Security scans**: run lightweight checks (no ML, no proxy) that are easy to explain and reproduce.
- **Drift detection**: detect tool additions/removals/changes using hashing (“tool pinning”).
- **Reports**:
  - **Scan Report UI** with severity breakdown and recommendations
  - **Download findings.json**
  - **Print / Save PDF** from the report page

### Sandbox + Monitoring (supporting utilities)
- **Policies**: safe runtime constraints (network on/off, CPU, memory, read-only root FS).
- **Sandboxes**: start/stop Docker-based sessions.
- **Monitoring**: live event streaming (SSE), alerts, and session history.
- **Threat Analysis**: deterministic risk scoring with human-readable reasons.

## How It Works (simple mental model)
1. You **register** an MCP server in Golem.
2. You **import** the MCP tool list (name, description, input schema).
3. Golem runs **static checks** against the manifest and **drift checks** against your previous scan.
4. You get a **report** (UI + printable PDF) and **findings.json** for sharing or CI pipelines.

## Quickstart

### Option A — Docker Compose (recommended)
1. Copy environment files:

```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

2. Set a strong JWT secret in `packages/backend/.env`:

```bash
JWT_SECRET=change-me-to-a-long-random-string
```

3. Start:

```bash
npm run dev
```

4. Open:
- Frontend: http://localhost:3000
- Backend health: http://localhost:3001/health

### Option B — Run frontend + backend separately
Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

## Using Golem (step-by-step)

### 1) Sign in
- Open http://localhost:3000
- Register an account (local JWT auth).

### 2) Run MCP Security Testing
1. Go to **MCP Testing**
2. **Add MCP server**
   - environment: local/dev/staging/prod
   - endpoint: a URL/identifier you use to track that server
   - auth: none/token (metadata, used for checks)
3. Click **Open**
4. Paste your tool manifest JSON and click **Import**
5. Click **Run scan**
6. You’ll land on the **Scan Report** page where you can:
   - **Download findings.json**
   - **Print / Save PDF**

### Tool import format
Golem accepts multiple “shapes” so you can paste whatever you have. These are all valid:

```json
{ "tools": [ { "name": "x", "description": "...", "inputSchema": { "type": "object" } } ] }
```

```json
{ "capabilities": { "tools": [ ... ] } }
```

```json
{ "server": { "tools": [ ... ] } }
```

```json
[ { "name": "x", "description": "...", "inputSchema": { "type": "object" } } ]
```

### What checks are currently implemented
These checks show up as **Findings** in the Scan Report:

- **Drift detection** (baseline vs latest scan)
  - tool added / removed / definition changed
- **Server checks**
  - missing authentication for non-local environments (dev/staging/prod)
  - insecure transport (HTTP) for non-local endpoints
- **Tool/schema checks**
  - missing/weak descriptions
  - suspicious parameters (`path`, `command`, `url`, etc.)
  - secret-like parameters (`token`, `apiKey`, `password`, etc.)
  - potential SSRF (URL/host params without constraints)
  - potential command injection (command params without constraints)
  - unbounded object inputs (no properties + additionalProperties allowed)

## Configuration Notes
- Frontend dev server proxies `/api` to backend via Vite proxy (default target: `http://localhost:3001`).
  - You can override with `VITE_PROXY_TARGET`.
- `packages/frontend/.env.example` contains `VITE_API_URL`, but the app can also work with the proxy when `VITE_API_URL` is unset.
- Sandbox execution requires Docker access (`DOCKER_SOCKET`).

## Minimal API Surface

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### MCP Testing
- `GET /api/mcp/servers`
- `POST /api/mcp/servers`
- `GET /api/mcp/servers/:id`
- `POST /api/mcp/servers/:id/tools/import`
- `POST /api/mcp/servers/:id/scan`
- `GET /api/mcp/scans/:id`
- `GET /api/mcp/overview`

### Sandboxes / Monitoring
- `GET /api/policy-templates`
- `GET /api/policies`
- `POST /api/policies`
- `GET /api/sandboxes`
- `POST /api/sandboxes`
- `GET /api/sandboxes/:id`
- `POST /api/sandboxes/:id/stop`
- `GET /api/sandboxes/:id/events`
- `GET /api/sandboxes/:id/events/stream`
- `GET /api/monitoring/sessions`
- `GET /api/monitoring/history`
- `GET /api/monitoring/alerts`
- `GET /api/monitoring/stream`
- `POST /api/threat-analysis`

## Notes / Scope
- Golem is an MVP intended for **local use** and learning/testing workflows.
- It intentionally avoids complex enterprise features (SIEM connectors, runtime gateways, ML anomaly detection).
- Security hardening for production deployments is out of scope.
