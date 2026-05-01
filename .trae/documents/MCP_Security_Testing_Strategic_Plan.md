# MCP Security Testing Strategic Plan (Akto Article Comparison)

## Summary
Reposition SecureSandboxHub from a “generic sandbox runner” into a **local-first MCP Security Testing Workbench**: import/register MCP servers and tool manifests, run lightweight security test suites and static checks, produce **both** human-readable reports and machine-readable findings, and track drift/risk over time—without adding heavy enterprise dependencies (connectors, SIEM, managed databases, etc.).

This plan is grounded in:
- The current SecureSandboxHub capabilities (sandbox sessions, policies, monitoring SSE, deterministic risk score) as seen in [README.md](file:///workspace/README.md) and [routes.ts](file:///workspace/packages/backend/src/routes.ts)
- The Akto article “Best MCP Security Tools in 2025” and its featured competitors (Akto.io, Palo Alto, Pillar, Teleport, Invariant’s MCP-Scan, ScanMCP, Equixly, MCP Guardian, Prompt Security) fetched from: https://www.akto.io/blog/mcp-security-tools

## Current State Analysis (Grounded)

### What the current app already does well (useful primitives)
- **Sandbox sessions** backed by Docker containers with a few policy controls (network, cpu, memory, read-only FS).
- **Session event logging** to SQLite + **real-time streaming** via SSE:
  - Per session event stream: `/api/sandboxes/:id/events/stream`
  - Global monitoring stream: `/api/monitoring/stream`
- **Threat analysis** exists as a simple deterministic scoring function:
  - `POST /api/threat-analysis` (used in UI as “Risk Score”)
- **Alerts** are supported at event level (`type: 'alert'`) and surfaced in monitoring APIs.

### What is missing for “MCP security testing”
SecureSandboxHub currently does **not** model MCP specifically:
- No concept of **MCP server inventory**, tool manifests, tool schemas, versions, owners, environments.
- No **MCP-specific scanning** (prompt injection / tool poisoning / confused deputy / misconfigurations) beyond generic runtime sandbox constraints.
- No **test suite runner** for MCP servers (security checks as repeatable runs with outputs/failures).
- No report artifacts (JSON findings + human-readable report) that could be shared/used in CI.

## Comparison to the Akto Article’s Tool Landscape (What competitors emphasize)
The article’s tools cluster into recurring capabilities (paraphrased from the article content):

1. **Discovery + Inventory + Monitoring**
   - Examples: Akto.io (server/API discovery via connectors; continuous monitoring), Pillar (auto discovery/inventory).
2. **Runtime Gateways / Proxies / Guardrails**
   - Examples: Invariant (proxying guardrails + observability), MCP Guardian (proxy + approvals), Prompt Security (gateway + enforcement).
3. **Static analysis of MCP server/tool descriptions**
   - Examples: Invariant MCP-Scan (static server analysis; tool pinning/hashing), Equixly (static scanning + supply-chain checks).
4. **Identity governance / zero-trust access control**
   - Example: Teleport (RBAC, audit trails, least privilege).
5. **Context drift detection and workflow integrity**
   - Example: ScanMCP (context mapping + sync/drift checks).
6. **Threat scoring / analytics + audit logging**
   - Examples: Akto, Pillar, Prompt Security (risk scoring, anomaly detection, audit).

### Where SecureSandboxHub sits today vs these categories
- Strongest overlap: **monitoring, audit/event logging, basic alerts**, and a **simple risk score**.
- Weak overlap: **MCP protocol awareness**, **static tool analysis**, **test suite library**, and **report outputs**.
- Not a near-term goal (to keep it simple): enterprise connector-based discovery and full proxy/gateway enforcement in production.

## Product Goal (Decision-Complete)

### Target audience
Developers, security engineers, and small teams building or integrating MCP servers who need a **local** tool to:
- inventory MCP servers/tools
- run repeatable security checks
- produce evidence and reports

### Success criteria (pragmatic)
Within one “MVP Security Testing Workbench” iteration:
- A user can add an MCP server entry + import a manifest/tool list.
- A user can run a “scan” that produces:
  - **JSON findings** (machine readable)
  - **HTML report view** (human readable, print-to-PDF)
- A user can compare scans over time (drift + risk trend) without external infra.

## Proposed Changes (Strategic, Minimal-Complexity)

### 1) Introduce an MCP Asset Catalog (Inventory)
**What**
- Add “MCP Servers” as first-class entities: name, environment (local/dev/staging/prod), endpoint/command, auth method (none/token), owner tag.
- Add “Tools” under each server: tool name, description, input schema (raw JSON), last-seen hash.

**Why**
- Every competitor emphasizes “inventory/visibility” as the starting point.

**How (minimal)**
- Manual input + import from JSON (no connectors).
- Store in SQLite (existing DB).

### 2) Add Static Tool Risk Checks (No runtime required)
**What**
- A scanner that flags risky tool descriptions/schemas:
  - overly broad permissions language (“admin”, “root”, “filesystem”, “shell”, “execute”)
  - suspicious parameters (paths, URLs, commands) without constraints
  - missing/empty descriptions
  - “network-enabled” tooling combined with write permissions (higher risk)

**Why**
- Mirrors the “static analysis” lane (Invariant/Equixly) but stays lightweight.

**How (minimal)**
- Heuristics + pattern-based checks, not ML.
- Produce findings with severity + evidence snippet.

### 3) Add MCP Security Test Suites (Guided runs)
**What**
- A small library of repeatable checks that are **safe and deterministic**:
  - Prompt injection simulation checks (inputs crafted to request disallowed actions)
  - Tool poisoning detection checks (tool hash drift vs baseline)
  - Misconfiguration checks (insecure transports, missing auth metadata, wildcard scopes in metadata)
  - Confused-deputy “approval required” checks (flag tools that should require explicit confirmation)

**Why**
- Competitors differentiate on having libraries of tests and “security testing workflows”.

**How (minimal)**
- Start with **offline** / “manifest + transcript” testing:
  - User pastes an MCP interaction transcript (or uploads JSON) for analysis
  - Or run a “dry-run” suite purely on tool schemas
- Keep “live MCP calling” optional for later.

### 4) Reports + Evidence (Both outputs)
**What**
- For each scan/run, generate:
  - `findings.json` (export/download)
  - HTML report page with sections: Summary, Findings, Evidence, Suggested mitigations, Diff vs last scan

**Why**
- Required to be useful in teams; competitors pitch governance/audit and actionable output.

**How (minimal)**
- JSON is generated by backend.
- HTML is rendered by frontend; “Export” uses browser download and print-to-PDF.

### 5) Drift & Pinning (Unique + simple differentiator)
**What**
- Store hash of each tool definition (name + description + schema).
- Detect and report:
  - tool added/removed
  - tool schema changed
  - description changed

**Why**
- Directly aligns with “tool pinning/hashing” ideas in the article and provides a clear “security value” without heavy infra.

**How (minimal)**
- Hash computation + diffing stored in SQLite.

### 6) “Monitoring” reframed for MCP security testing
**What**
- Monitoring page becomes a security console for MCP testing runs:
  - Active scan runs (in-progress)
  - Recent alerts/failures
  - Latest risk score per MCP server
  - Recent drift events

**Why**
- Keeps the existing monitoring work, but aligns it with MCP security workflows.

## What We Should NOT Build Yet (to stay simple)
- Enterprise connector-based discovery across environments (Akto-style connectors).
- A full production inline MCP gateway/proxy with blocking enforcement.
- Complex anomaly detection / ML models / reputation systems.
- Multi-tenant SaaS features.

## Roadmap (Incremental, Low-Risk)

### Phase 0: Reframe product narrative (1–2 docs + UI labels)
- Rename core entities in UI from “Sandbox security platform” to “MCP Security Testing Workbench”.
- Keep sandbox runner as an execution primitive, not the product centerpiece.

### Phase 1: MCP Inventory + Static Scanner + Reports (MVP)
- MCP servers + tool manifest import
- Static checks + drift detection
- Findings JSON + report view

### Phase 2: Transcript-based analysis + Baselines
- “Paste transcript” page: parse tool calls/responses, detect:
  - suspicious sequences
  - data exposure patterns
  - policy violations (based on declared tool risk)
- Baseline a “known good” snapshot and compare on every scan.

### Phase 3: Optional live checks (only if needed)
- Add an adapter interface for “live MCP call execution”
- Keep it pluggable and disabled by default

## Differentiation (Unique but feasible)
- **Local-first privacy**: everything runs locally with SQLite; no SaaS required.
- **Reproducible security runs**: every finding links to exact tool schema/transcript snippet.
- **Drift-first posture**: pin tool definitions and treat unannounced changes as security events.
- **Minimal dependency budget**: avoids enterprise connectors/gateways until there is demand.

## Assumptions & Decisions
- We optimize for **Local test workbench** first (not proxy/gateway).
- Primary outputs are **both**: JSON findings + HTML report view.
- “MCP testing” initially means **manifest + transcript analysis**, with optional live calls later.

## Verification Steps (Strategic Deliverable Validation)
- Review output artifacts:
  - Example `findings.json` schema is consistent and versioned.
  - Report view includes: summary + findings + evidence + drift diff.
- User workflow walkthrough:
  - Add MCP server → import tools → run scan → download JSON → view report → compare with previous scan.
- Competitive mapping sanity check:
  - Confirm each planned capability maps to at least one competitor capability from the article, while keeping scope smaller.

