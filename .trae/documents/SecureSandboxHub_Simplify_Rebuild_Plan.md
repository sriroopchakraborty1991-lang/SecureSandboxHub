# SecureSandboxHub Simplify + Rebuild Plan

## Summary
Rebuild SecureSandboxHub into a small, runnable “Sandbox Security Platform” (API + UI) with a minimal dependency set, a minimal feature surface, and a clear mental model. The current repository is largely documentation and scripts that reference non-existent code/infrastructure; the plan replaces that with a concrete, simple implementation while preserving the original idea: create sandbox sessions, enforce security policies, observe activity, and perform basic risk scoring.

## Current State Analysis (Grounded)
### What exists in the repo today
- Root workspace tooling: [package.json](file:///workspace/package.json), [package-lock.json](file:///workspace/package-lock.json), eslint/prettier configs.
- Docker orchestration that expects a monorepo layout: [docker-compose.yml](file:///workspace/docker-compose.yml), [docker-compose.test.yml](file:///workspace/docker-compose.test.yml). These refer to `./packages/backend` and `./packages/frontend`.
- Multi-cloud / Kubernetes deployment scripts and docs: [deploy.sh](file:///workspace/deploy.sh), [deploy.ps1](file:///workspace/deploy.ps1), [GETTING_STARTED.md](file:///workspace/GETTING_STARTED.md), [TROUBLESHOOTING.md](file:///workspace/TROUBLESHOOTING.md), [SECURITY.md](file:///workspace/SECURITY.md).
- “App” documentation that describes backend/frontend packages that are not present: [README.md](file:///workspace/README.md), [TUTORIAL.md](file:///workspace/TUTORIAL.md), [DOCKER_SETUP_GUIDE.md](file:///workspace/DOCKER_SETUP_GUIDE.md), [README-Security-Testing.md](file:///workspace/README-Security-Testing.md).

### Major issues discovered
- The repository currently does not contain the application source tree it describes (`packages/backend`, `packages/frontend` do not exist), so `npm workspaces`, Docker builds, and the documented workflow cannot work as-is.
- The multi-cloud deployment scripts reference directories that are not present in the repository (e.g., `infrastructure/terraform/multi-cloud`, `infrastructure/helm`, `infrastructure/kubernetes`), making them non-functional.
- Documentation is internally inconsistent: some pages describe a “sandbox security platform” app, while others describe a large “multi-cloud platform” with Terraform/Kubernetes/Helm, and even a very large security testing framework.
- Sensitive credential exposure risk in the local checkout: `.git/config` contains a GitHub access token embedded in the remote URL. This is not part of the repo contents on GitHub, but it should still be rotated immediately because it is exposed in this environment.

## Proposed Direction (Decision-Complete)
Because the user skipped scope questions, this plan proceeds with the simplest interpretation that still preserves the “idea”:
- Target: a working MVP app (API + Web UI) that runs locally with minimal setup.
- Sandbox execution: Docker-based sandbox sessions (real isolation, still pragmatic).
- Storage: SQLite single-file database (no Postgres required for local use).

If you want Postgres or multi-cloud later, design the backend with a thin persistence layer so swapping storage is contained.

## Proposed Changes (By Area)
### 1) Repository Restructure (Make it real + minimal)
**Add**
- `packages/backend/` (Fastify API, TypeScript)
- `packages/frontend/` (React + Vite UI)
- Minimal shared docs under `docs/` (only what’s needed to run and understand the app)

**Update**
- Root [package.json](file:///workspace/package.json)
  - Make scripts cross-platform and aligned with the actual developer workflow.
  - Prefer:
    - `npm run dev` → starts backend + frontend in a predictable way (either via Docker Compose or via a tiny cross-platform runner).
    - `npm run lint`, `npm run format`, `npm run test` → operate across workspaces.

**Remove / Archive**
- Move multi-cloud infra scripts/docs into `docs/legacy/` or delete them if you want a strictly “simple local app”:
  - [deploy.sh](file:///workspace/deploy.sh), [deploy.ps1](file:///workspace/deploy.ps1)
  - [GETTING_STARTED.md](file:///workspace/GETTING_STARTED.md), [TROUBLESHOOTING.md](file:///workspace/TROUBLESHOOTING.md), [COST_OPTIMIZATION.md](file:///workspace/COST_OPTIMIZATION.md), [DOCKER_BUILD_OPTIMIZATION.md](file:///workspace/DOCKER_BUILD_OPTIMIZATION.md), large sections of [SECURITY.md](file:///workspace/SECURITY.md)
  - Rationale: they reference infra that does not exist and add cognitive load.

### 2) Backend MVP (Fastify + SQLite + Docker sandboxes)
**Create**
- `packages/backend/src/app.ts` (Fastify instance)
- `packages/backend/src/server.ts` (listen, wiring)
- `packages/backend/src/config/env.ts` (env validation)
- `packages/backend/src/db/` (SQLite initialization + queries)
- `packages/backend/src/modules/auth/` (register/login + JWT)
- `packages/backend/src/modules/policies/` (CRUD for policy JSON)
- `packages/backend/src/modules/sandboxes/` (create/list/get/stop)
- `packages/backend/src/modules/events/` (append/read event log; stream via SSE)
- `packages/backend/src/modules/threat-analysis/` (rule-based risk score)

**Minimal Data Model (SQLite)**
- `users`: id, email, password_hash, role, created_at
- `policies`: id, name, rules_json, created_by, created_at
- `sandboxes`: id, status, docker_container_id, image, policy_id, created_by, created_at, stopped_at
- `sandbox_events`: id, sandbox_id, ts, type, message, meta_json

**Sandbox “Runner”**
- Implement a small service `SandboxRunner` that:
  - Creates containers with conservative defaults:
    - `NetworkMode: "none"` unless policy explicitly allows network
    - read-only root FS where feasible
    - strict memory + CPU limits
  - Captures logs and turns them into `sandbox_events`.
  - Persists minimal metadata and container IDs so sessions can be managed.

**API surface (keep small)**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/policies`
- `POST /api/policies`
- `GET /api/sandboxes`
- `POST /api/sandboxes`
- `GET /api/sandboxes/:id`
- `POST /api/sandboxes/:id/stop`
- `GET /api/sandboxes/:id/events` (paged)
- `GET /api/sandboxes/:id/events/stream` (SSE)
- `POST /api/threat-analysis` (returns risk score + reasons)

**Keep dependencies minimal**
- Prefer built-in Fastify logger, no heavy framework layers.
- Use simple schema validation (either `joi` to match existing repo tooling, or Zod if you decide to standardize—pick one and use it everywhere).
- Prefer SSE over WebSocket to reduce moving parts while still offering “real-time” monitoring.

### 3) Frontend MVP (React + Vite, no heavy UI kits)
**Create**
- `packages/frontend/src/pages/Login.tsx`, `Register.tsx`
- `packages/frontend/src/pages/Dashboard.tsx` (sandboxes list + create)
- `packages/frontend/src/pages/Policies.tsx` (policy CRUD)
- `packages/frontend/src/pages/SandboxDetail.tsx` (event stream + risk)
- `packages/frontend/src/services/api.ts` (typed fetch wrapper)

**Real-time monitoring**
- Use `EventSource` to stream SSE events from the backend and render a live log.

**UX simplifications**
- “Policy templates” dropdown (a few default JSON templates) so users can succeed without reading docs.
- “Copy docker run command” for a sandbox session (derived from policy + image) to help reproducibility without complex features.

### 4) Docker / Local Dev Story (Make it actually easy)
**Update**
- [docker-compose.yml](file:///workspace/docker-compose.yml)
  - Make it consistent with the new code and minimal services:
    - backend
    - frontend
    - optional: redis (only if truly used)
    - remove Postgres by default if using SQLite
  - Provide a single volume mount for the SQLite DB file for persistence.

**Create**
- `packages/backend/Dockerfile`
- `packages/frontend/Dockerfile`
- Optionally `docker-compose.dev.yml` for hot reload mounts (separate from production-like compose).

### 5) Documentation Cleanup (Reduce cognitive load)
**Replace**
- [README.md](file:///workspace/README.md) with:
  - What the app is (1 paragraph)
  - Quickstart (Docker + non-Docker)
  - Core concepts: Sandbox, Policy, Event, Risk Score
  - Minimal screenshots/flows (optional)

**Trim**
- [TUTORIAL.md](file:///workspace/TUTORIAL.md) and [DOCKER_SETUP_GUIDE.md](file:///workspace/DOCKER_SETUP_GUIDE.md) to match reality.

**Archive/Delete**
- [README-Security-Testing.md](file:///workspace/README-Security-Testing.md) should be removed or archived. It describes an extremely large testing framework that is not present and would add significant dependency complexity. Replace with a small “Security” section describing:
  - default sandbox isolation settings
  - JWT auth basics
  - safe defaults and limitations

## “Innovative but Low-Complexity” Feature Ideas
These are additive but intentionally low-dependency and low-code:
- Policy templates + inline policy linting (simple JSON schema validation).
- Risk score explanation (show reasons + suggested mitigations) rather than complex ML.
- Export/import: allow exporting a sandbox session (policy JSON + image + key metadata) as a single JSON file to share.
- “Reproduce locally” button: generate a safe `docker run` command (no secrets) that reproduces the sandbox constraints.
- Audit log export endpoint: download sandbox events as NDJSON/JSON for offline analysis.

## Security & Maintenance Decisions
- Rotate the exposed GitHub token from the local `.git/config` immediately; ensure future tooling never embeds tokens in git remotes.
- Keep secrets out of compose files; provide `.env.example` with safe placeholders and document required variables.
- Keep a strict dependency budget: any new dependency must justify itself in user simplicity or security.

## Verification Steps (Executor Checklist)
1. Repo consistency:
   - Root `npm install` completes.
   - Workspaces are present under `packages/` and referenced scripts/builds succeed.
2. Local run:
   - `docker compose up --build` starts frontend + backend.
   - UI loads and can register/login.
3. Core flows:
   - Create a policy.
   - Create a sandbox session; backend starts container and stores metadata.
   - Sandbox detail page streams events in real time (SSE).
   - Threat analysis endpoint returns a deterministic score and reasons.
4. Tests/lint:
   - Minimal backend unit tests for policy validation + threat scoring.
   - Lint/format runs clean across workspace.

