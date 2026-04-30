# Monitoring Dashboard Spec

## Why
Users need a single “Monitoring” section to understand what is happening across all sandbox sessions (not only per-session detail pages). This improves usability and makes the platform feel like a real security console.

## What Changes
- Add a **Monitoring** section in the dashboard navigation.
- Provide a real-time view of:
  - all active sandbox sessions
  - live resource usage per session (CPU, memory)
  - alerts / policy violations
  - session history and audit logs
- Expand the backend to expose aggregated monitoring + resource stats with minimal new dependencies.

## Impact
- Affected specs: threat analysis visibility, monitoring UX, auditing
- Affected code:
  - Backend routes: [routes.ts](file:///workspace/packages/backend/src/routes.ts)
  - Sandbox runner + events: [runner.ts](file:///workspace/packages/backend/src/sandbox/runner.ts), [events.ts](file:///workspace/packages/backend/src/db/events.ts)
  - Frontend routing + pages: [App.tsx](file:///workspace/packages/frontend/src/App.tsx), [Sandboxes.tsx](file:///workspace/packages/frontend/src/pages/Sandboxes.tsx)

## Current Behavior (Baseline)
- Threat analysis exists: `POST /api/threat-analysis` and UI “Risk Score” in sandbox detail.
- Real-time monitoring exists per session: `GET /api/sandboxes/:id/events/stream` (SSE), visible in Sandbox detail page.
- Missing: a global Monitoring page that aggregates sessions, usage, alerts, and history.

## ADDED Requirements

### Requirement: Monitoring Navigation
The system SHALL provide a “Monitoring” route in the UI dashboard navigation.

#### Scenario: User navigates to monitoring
- **WHEN** an authenticated user clicks “Monitoring”
- **THEN** the Monitoring page loads and shows active sessions, resource usage, alerts, and history panels.

### Requirement: Active Sessions View
The system SHALL display all active sandbox sessions (status = running) in the Monitoring page.

#### Scenario: Active sessions listed
- **WHEN** the Monitoring page loads
- **THEN** it lists running sandboxes with: id, image, policy name/id, started time, and link to session detail.

### Requirement: Live Resource Usage
The system SHALL display near-real-time CPU and memory usage per running session.

#### Scenario: Live usage updates
- **WHEN** the Monitoring page is open
- **THEN** the UI updates usage values at least every 5 seconds for running sessions.

### Requirement: Alerts / Policy Violations
The system SHALL surface alerts derived from runtime signals and policy thresholds.

#### Alert signals (MVP)
- Non-zero container exit code ⇒ alert
- Memory usage >= 90% of policy memoryLimitMb ⇒ alert
- CPU usage >= 90% of policy cpuLimit ⇒ alert

#### Scenario: Alert appears
- **WHEN** an alert signal is detected
- **THEN** an alert record is shown in the Monitoring page and stored in the audit log.

### Requirement: Session History and Audit Logs
The system SHALL provide a view of recent session history and key audit events.

#### Scenario: History and audit displayed
- **WHEN** the Monitoring page loads
- **THEN** it shows recent sandboxes (e.g., last 50) and supports viewing recent events for each session.

## MODIFIED Requirements

### Requirement: Event Types
The system SHALL support an additional event type `alert` for monitoring/audit purposes.

#### Scenario: Existing event consumers remain compatible
- **WHEN** the backend emits `alert` events
- **THEN** existing session event streaming still functions and the UI renders alert events safely.

## REMOVED Requirements
None.

