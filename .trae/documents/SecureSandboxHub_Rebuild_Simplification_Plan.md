# SecureSandboxHub Rebuild + Simplification Plan

## Summary
Refactor SecureSandboxHub into a small, runnable “Sandbox Security Platform” with a minimal dependency budget and a clear UX: users can register/login, create security policies, create sandbox sessions (Docker containers with safety defaults), observe a live event stream (SSE), and request a basic deterministic risk score. Remove or quarantine non-functional/legacy multi-cloud and “giant security framework” artifacts that currently inflate complexity and confuse usage.

## Current State Analysis (Grounded)
### Repository shape (what is actually present)
- Root tooling:
  - Workspaces configured in [package.json](file:///workspace/package.json#L1-L34) as `packages/*`.
  - Root scripts are currently inconsistent/cross-platform-fragile (e.g., `npm run dev` uses `&` in [package.json](file:///workspace/package.json#L8-L15)).
- App source is partially present:
  - Backend exists at [packages/backend](file:///workspace/packages/backend) with Fastify + SQLite + Docker sandbox runner code under [src](file:///workspace/packages/backend/src) and basic tests under [tests](file:///workspace/packages/backend/tests).
  - Frontend currently has only a [package.json](file:///workspace/packages/frontend/package.json) (React/Vite deps), but no `src/` yet.
- Docs/scripts refer to infrastructure and code that either does not exist or is not aligned with the current source tree:
  - `docker-compose.yml` expects `packages/backend` and `packages/frontend` Dockerfiles ([docker-compose.yml](file:///workspace/docker-compose.yml#L4-L47)) that are not present.
  - Multi-cloud deployment scripts reference `infrastructure/terraform/multi-cloud`, `infrastructure/helm`, `infrastructure/kubernetes` ([deploy.sh](file:///workspace/deploy.sh#L20-L23), [deploy.ps1](file:///workspace/deploy.ps1#L18-L21)), but those directories are not in the repo.
  - Docs such as [GETTING_STARTED.md](file:///workspace/GETTING_STARTED.md) and [TROUBLESHOOTING.md](file:///workspace/TROUBLESHOOTING.md) are written for a Terraform/Kubernetes platform, not for the app described in [README.md](file:///workspace/README.md).
  - [README-Security-Testing.md](file:///workspace/README-Security-Testing.md) describes a large security testing framework that is not present and would require many external tools/dependencies.
- Security red flag in local checkout: `.git/config` contains an embedded GitHub token in the remote URL ([.git/config](file:///workspace/.git/config#L6-L8)). This should be rotated immediately outside this plan (credential hygiene).

### Pain points causing “utterly complex”
- Conflicting narratives (“multi-cloud infra platform” vs “sandbox security app”).
- Non-existent referenced folders cause most developer entrypoints to break (Docker compose, deploy scripts, docs).
- Dependency footprint implied by docs is large (Prisma + Postgres + Redis + K8s + Terraform + security toolchain), which is not necessary for an MVP.

## Target Product Definition (Decision-Complete)
### Goal
Deliver a simple app that works out-of-the-box for local development via Docker Compose, and also supports running frontend/backend separately with Node.

### MVP Features (keep the idea, cut the bloat)
1. Auth: register + login (JWT).
2. Policy management: create/list policy JSON with a few templates.
3. Sandbox sessions: create/list/get/stop sessions backed by Docker containers.
4. Monitoring: live event stream for a session via SSE.
5. Threat analysis: deterministic score + human-readable reasons based on policy + recent events.

### Simplifying decisions
- Storage: SQLite file database (single file) to eliminate Postgres/Prisma overhead.
- Real-time: SSE instead of WebSockets to reduce moving parts.
- Optional services (Redis, Postgres): removed from default local stack until a concrete need exists.

## Proposed Changes (What/Where/Why/How)
### 1) Normalize repo structure and scripts
**Update**
- [package.json](file:///workspace/package.json)
  - Replace `dev` with a cross-platform runner:
    - Option A (recommended): make `dev` call Docker Compose for the full stack.
    - Option B: use a small Node script that spawns both workspace dev servers in parallel.
  - Make `test` run workspace tests instead of the root [jest.config.ts](file:///workspace/jest.config.ts) scaffold.

**Add**
- `packages/frontend/` actual source tree (Vite + React app).
- Consistent `.env.example` for frontend and backend (backend already has [packages/backend/.env.example](file:///workspace/packages/backend/.env.example)).

**Remove or quarantine**
- Move infra-heavy docs/scripts into `docs/legacy/` (or delete):
  - [deploy.sh](file:///workspace/deploy.sh), [deploy.ps1](file:///workspace/deploy.ps1)
  - [GETTING_STARTED.md](file:///workspace/GETTING_STARTED.md), [TROUBLESHOOTING.md](file:///workspace/TROUBLESHOOTING.md), [COST_OPTIMIZATION.md](file:///workspace/COST_OPTIMIZATION.md), [DOCKER_BUILD_OPTIMIZATION.md](file:///workspace/DOCKER_BUILD_OPTIMIZATION.md)
  - Large K8s/Terraform sections in [SECURITY.md](file:///workspace/SECURITY.md)

### 2) Complete the backend into a clean, minimal API service
**Keep and standardize existing backend**
- Ensure one clear entrypoint: [server.ts](file:///workspace/packages/backend/src/server.ts).
- Ensure stable API routes: [routes.ts](file:///workspace/packages/backend/src/routes.ts).

**Add / adjust**
- Dockerfile for backend at `packages/backend/Dockerfile`.
- Backend `README` section: env vars, running locally, and limitations (e.g., requires Docker socket to create containers).
- Tighten sandbox policy schema and safe defaults:
  - Default network disabled.
  - Conservative CPU/memory limits.
  - Read-only root filesystem by default (with documented caveats).

**Testing**
- Keep minimal unit tests (already present):
  - [password.test.ts](file:///workspace/packages/backend/tests/password.test.ts)
  - [scoring.test.ts](file:///workspace/packages/backend/tests/scoring.test.ts)
- Add one integration-ish smoke test (optional) that boots the Fastify app and hits `/health` without Docker.

### 3) Build the frontend MVP (React + Vite) with minimal UI complexity
**Add**
- `packages/frontend/src/` with:
  - Auth pages: Login/Register
  - Policies page: list/create using templates
  - Sandboxes dashboard: list/create/stop
  - Sandbox detail: event log + live SSE stream + “Run Threat Analysis” button
- Minimal routing with `react-router-dom`.
- Small API client wrapper in `packages/frontend/src/services/api.ts`:
  - Stores JWT in memory + localStorage, attaches Authorization header.

**Avoid**
- Heavy UI libraries; start with clean HTML + CSS (or minimal utility CSS) to keep dependencies low.

### 4) Make local run dead-simple with Docker Compose
**Update**
- [docker-compose.yml](file:///workspace/docker-compose.yml)
  - Remove Postgres + Redis by default (SQLite persists to a volume).
  - Add required volume mounts:
    - SQLite db file persistence.
    - Docker socket mount for backend sandbox runner (`/var/run/docker.sock`).
  - Ensure ports:
    - Frontend: 3000
    - Backend: 3001

**Add**
- `packages/frontend/Dockerfile`
- Optionally `docker-compose.dev.yml` for hot reload mounts.

### 5) Documentation rewrite (single source of truth)
**Replace**
- [README.md](file:///workspace/README.md) with:
  - What the app is (1 paragraph)
  - Quickstart (Docker Compose) and optional “run without Docker”
  - Concepts: Policy, Sandbox, Event, Risk Score
  - Minimal API reference (top endpoints)
  - Limitations + safety notes

**Trim**
- [TUTORIAL.md](file:///workspace/TUTORIAL.md), [DOCKER_SETUP_GUIDE.md](file:///workspace/DOCKER_SETUP_GUIDE.md) to align with the new reality.

**Archive/Delete**
- [README-Security-Testing.md](file:///workspace/README-Security-Testing.md) (either move to `docs/legacy/` or delete) and replace with a short “Security posture” page that matches the MVP.

## “Innovative but Low-Complexity” Features (Optional Add-ons)
- Policy templates + inline validation errors in UI (schema-based; no extra infrastructure).
- “Export session” button: download a JSON snapshot (policy + image + key metadata + recent events).
- “Reproduce locally” button: generate a safe `docker run` command matching the policy constraints (no secrets).
- Event export endpoint for NDJSON/JSON for offline analysis.

## Assumptions & Decisions
- The app targets local usage first; production hardening is out of scope for the MVP.
- Docker is available for users who want actual sandbox execution. If Docker is unavailable, the platform can still be used for policy/session metadata, but sandbox execution will fail gracefully (documented).
- SQLite is the default database for simplicity. Postgres can be reintroduced later behind a small persistence interface if needed.
- SSE is used for live monitoring to minimize dependencies and avoid WebSocket infrastructure.

## Verification Steps (What “done” means)
1. `npm install` at repo root succeeds.
2. `docker compose up --build` brings up frontend + backend successfully.
3. UI flows:
   - register → login
   - create policy from template
   - create sandbox session (starts Docker container)
   - view sandbox detail with live event stream
   - run threat analysis and display score + reasons
4. Backend unit tests pass.
5. README Quickstart steps are accurate and minimal (copy/paste runnable).

