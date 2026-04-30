# Tasks

- [x] Task 1: Add backend monitoring endpoints (sessions + resource usage)
  - [x] Add an authenticated endpoint to return running sessions enriched with policy info and latest resource snapshot.
  - [x] Add an authenticated SSE endpoint that streams periodic usage snapshots for all running sessions.
  - [x] Ensure endpoints degrade gracefully when Docker is unavailable (return empty stats + warning fields).

- [x] Task 2: Add alert generation (MVP signals)
  - [x] Extend event type union to include `alert` and store it in `sandbox_events`.
  - [x] Generate alerts for non-zero container exit code (from existing lifecycle/exit signal).
  - [x] Generate alerts for CPU/memory thresholds using Docker stats + policy limits.

- [x] Task 3: Build Monitoring UI page
  - [x] Add `/monitoring` route and navigation link.
  - [x] Implement an Active Sessions table with links to existing session detail pages.
  - [x] Render live CPU/memory usage (update at least every 5 seconds).
  - [x] Render Alerts panel (recent alerts, link to session).
  - [x] Render Session History panel (last N sessions, quick link).

- [x] Task 4: Validation and regression checks
  - [x] Add a minimal backend test for the monitoring list endpoint (can stub stats provider).
  - [x] Manual smoke: open Monitoring page, confirm sessions list renders, usage updates, and alerts appear on forced exit.

# Task Dependencies
- Task 2 depends on Task 1 (needs stats + exit signals to generate alerts).
- Task 3 depends on Task 1 (needs APIs to consume).
