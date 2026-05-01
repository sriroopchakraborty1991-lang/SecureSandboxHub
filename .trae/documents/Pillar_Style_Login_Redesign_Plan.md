# Pillar-Style Login Redesign Plan

## Summary
Redesign the `/login` page to feel premium and “security-platform-grade” in the spirit of Pillar Security’s marketing aesthetic: bold hero headline, crisp feature messaging, and an animated SVG “security graph” background—while keeping all existing SecureSandboxHub login functionality (JWT auth, errors, loading states, navigation).

This plan avoids copying Pillar’s proprietary assets verbatim. Instead it recreates the **layout principles** (hero + form, layered gradients, motion) using original SVG and copy tailored to SecureSandboxHub.

## Current State Analysis
### Current login implementation
- Current login page is a simple centered card with two inputs and a button: [Login.tsx](file:///workspace/packages/frontend/src/pages/Login.tsx)
- Global layout wraps all pages in `.container`, which limits full-bleed hero designs: [Layout.tsx](file:///workspace/packages/frontend/src/components/Layout.tsx)
- Styling is minimal and global: [styles.css](file:///workspace/packages/frontend/src/styles.css)

### Current product capabilities that should be reflected in login copy
Grounded from the running app and README:
- MCP Testing workbench (servers, tool import, scans, findings reports)
- Monitoring (SSE events, session history, alerts)
- Sandboxes + policies (runtime constraints)
- Threat analysis / risk score

## Goals & Success Criteria
### Goals
- Make `/login` visually striking and “enterprise security” credible.
- Preserve the exact existing login behavior and navigation.
- Add a clear “what this platform does” narrative on the login page (copywriting).
- Include animated SVG elements (lightweight, CSS-driven; no heavy libs).

### Success criteria
- Login still works (happy-path + invalid credentials error).
- Page looks good on mobile + desktop (responsive, no horizontal scroll).
- Animations are smooth and do not block interaction.
- No new runtime dependencies introduced.

## Proposed Changes (Implementation-Ready)

### 1) Create a full-bleed auth layout (without breaking the rest of the app)
**Why**
The current `.container` wrapper prevents a true Pillar-style hero layout.

**How**
- Update [Layout.tsx](file:///workspace/packages/frontend/src/components/Layout.tsx) to render auth routes (`/login`, optionally `/register`) in a full-width wrapper instead of `.container`.
  - Keep the existing header behavior (brand + Login/Register buttons).
  - Only change content wrapper behavior for auth routes to avoid affecting app pages.

### 2) Redesign Login page structure and copy
**Files**
- Update [Login.tsx](file:///workspace/packages/frontend/src/pages/Login.tsx)

**New layout**
- Two-column grid on desktop, stacked on mobile:
  - **Left: Marketing hero** (headline, subheadline, “How it works” steps, key capabilities)
  - **Right: Login form** (existing fields and button, but restyled)

**Copywriting (to be implemented)**
- **Hero headline** (example direction):
  - “Secure your MCP workflows. Prove it with repeatable tests.”
- **Subheadline**:
  - “A local-first MCP security testing workbench: inventory tools, detect drift, run checks, export evidence.”
- **How it works (3–4 steps)**:
  1. Register MCP server
  2. Import tool manifest
  3. Run scans (static + drift)
  4. Download findings.json / save report as PDF
- **Feature bullets** (tight, high-signal):
  - Drift-first tool pinning
  - Deterministic risk scoring
  - Real-time monitoring + alerts
  - Local SQLite storage (privacy-first)

**Preserved behavior**
- Keep the same state management (`email`, `password`, `loading`, `error`) and `login()` call.
- Keep the “Create an account” link.

### 3) Add original animated SVG hero art (Pillar-inspired, not copied)
**Files**
- Add a new component (e.g.) `packages/frontend/src/components/AuthHeroArt.tsx` for the SVG.
- Use CSS keyframes in [styles.css](file:///workspace/packages/frontend/src/styles.css) to animate:
  - Gradient movement / mesh shift
  - Orbiting “nodes”
  - Stroke dash offset along paths (network graph feel)
  - Soft pulsing glow behind key nodes

**Design direction**
- Dark, high-contrast security palette:
  - near-black/navy base
  - teal/cyan highlights + a warm accent (coral/red) for “alerts”
- Subtle grain overlay (CSS-only) to add depth.

**Performance**
- Prefer CSS animations over JS; no canvas.
- Reduced-motion support via `@media (prefers-reduced-motion: reduce)` to disable heavy motion.

### 4) Create a scoped “Auth Theme” in CSS
**Files**
- Update [styles.css](file:///workspace/packages/frontend/src/styles.css)

**Approach**
- Add new CSS variables and class names scoped under `.auth-shell` to avoid disrupting the rest of the app:
  - `.auth-shell`, `.auth-hero`, `.auth-form`, `.auth-card`, `.auth-input`, `.auth-cta`
- Keep existing `.btn`, `.input`, `.card` for the rest of the app unchanged.

### 5) Optional: Extend the same design system to Register (recommended for cohesion)
User asked specifically for login; implement login first.
If desired later, replicate the same shell and hero for:
- [Register.tsx](file:///workspace/packages/frontend/src/pages/Register.tsx)

## Assumptions & Decisions
- “Reverse engineer” is interpreted as **matching the premium vibe and layout principles**, not copying proprietary assets.
- Implement **Login redesign only** unless the user later requests Register parity.
- No new frontend libraries (no Framer Motion/Lottie); CSS + SVG only.

## Verification Steps
- Functional:
  - Login success navigates to `/sandboxes`.
  - Wrong password shows error and does not navigate.
- Visual:
  - Desktop: two-column layout, hero art visible, form readable.
  - Mobile: stacked layout, hero collapses gracefully, no clipped SVG.
  - `prefers-reduced-motion` disables motion.
- Regression:
  - Non-auth pages (Sandboxes/Policies/Monitoring/MCP Testing) remain unchanged.

