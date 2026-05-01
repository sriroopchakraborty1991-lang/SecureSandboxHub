# Pillar-Style Login Redesign Plan (Revised)

## Summary
Redesign the `/login` page to match the **layout language** of https://www.pillar.security/ (hero-first, big headline, pill-shaped top bar, dual CTAs, soft organic corner gradients), while adapting it to SecureSandboxHub’s real capabilities (MCP security testing workbench) and keeping the login flow fully functional.

The end result is a login page that looks like a modern AI security platform landing hero, but with:
- a real sign-in form
- clear “what you get after login” product narrative
- original SVG animations (not copied assets) and a distinct, eye-catching color grade (not Pillar’s red)

This plan does **not** copy Pillar’s proprietary SVG files or images. It recreates the design with original vector art and CSS, “reverse-engineering” the structure and motion style.

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

## Reverse-Engineered Pillar Design Primitives (What we will reproduce)
Based on live inspection of https://www.pillar.security/ (hero section):
- **Pill navigation bar**: rounded capsule container, logo on left, a single strong action on right (often “Get a demo”), plus a hamburger menu on small screens.
- **Hero-first composition**: the page is primarily a hero, not a “form-first” screen.
- **Single bold H1** with generous line height and tight letter spacing.
- **One subheadline** under H1 (short, high clarity).
- **Two CTAs** side-by-side:
  - Primary filled CTA
  - Secondary outline CTA
- **Soft, organic corner gradients** (large blurred shapes) that frame content.
- **Minimal borders** and heavy reliance on whitespace and gradients.

We will implement the same composition in `/login`, but the primary CTA is “Sign in”, and the secondary CTA is “Create account”.

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

### 2) Redesign Login page structure and copy (Pillar hero layout + real form)
**Files**
- Update [Login.tsx](file:///workspace/packages/frontend/src/pages/Login.tsx)

**New layout (decision-complete)**
- Full-viewport hero container: `.auth-shell`
- Top pill nav inside hero: `.auth-pillbar`
  - Left: SecureSandboxHub mark (logo + name)
  - Right: “Create account” CTA (button-link)
- Main hero center: `.auth-hero`
  - H1 + subheadline
  - Two CTAs: “Sign in” (scroll/focus form) + “Create account”
- Form card is visually integrated into the hero:
  - Desktop: right-side glass card (or bottom-right) while hero text stays left/center
  - Mobile: hero text → CTAs → form card stacked
  - Form remains always visible (no modal required)

**Copywriting (final copy to implement)**
- H1:
  - “Secure the MCP Toolchain.”
  - Line 2: “Test. Detect drift. Export evidence.”
- Subheadline:
  - “A local-first MCP security testing workbench to inventory tools, run lightweight checks, and generate shareable findings—before risky agents ship.”
- “How it works” micro-section (compact, 4 steps) placed under the form or under hero CTAs:
  - “1) Register an MCP server”
  - “2) Import a tool manifest”
  - “3) Run scans (static + drift)”
  - “4) Download findings.json + printable report”
- Feature chips (badge row):
  - “Tool pinning (hash)”
  - “Drift alerts”
  - “Real-time monitoring”
  - “Deterministic risk score”
  - “SQLite local storage”

**Preserved behavior**
- Keep the same state management (`email`, `password`, `loading`, `error`) and `login()` call.
- Keep the “Create an account” link.

### 3) Add original animated SVG hero art (Pillar-style motion, unique palette)
**Files**
- Add a new component (e.g.) `packages/frontend/src/components/AuthHeroArt.tsx` for the SVG.
- Use CSS keyframes in [styles.css](file:///workspace/packages/frontend/src/styles.css) to animate:
  - Gradient movement / mesh shift (slow, 12–20s)
  - Orbiting “nodes” (2–3 independent loops)
  - Stroke dash offset along paths (network graph feel, 6–10s)
  - Soft pulsing glow behind key nodes (2–3s)
  - Subtle parallax on hover (CSS transform only)

**SVG concept (specific)**
- A “security graph” illustration:
  - 6–10 nodes (circles) connected by 8–14 edges (paths)
  - 1–2 “alert nodes” with a warm accent glow
  - a faint concentric ring to imply “boundary / policy perimeter”
  - a gradient mesh behind the graph (SVG rect + radial gradients)

**Color grading (different from Pillar red)**
- Base: deep ink #050814 → #060A1A
- Electric highlight: cyan/teal #20E3D2
- Secondary highlight: ultraviolet #7C5CFF
- Warm accent for alerts: amber #FFB020 (or coral #FF5C7A)
- Subtle grain overlay on top using CSS repeating-radial-gradient/opacity mask

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

**Concrete CSS features to implement**
- Full-bleed gradient background with large blurred “corner blobs”
- Pill nav styling (rounded capsule, subtle border, glass effect)
- CTA buttons:
  - primary: filled with gradient + soft shadow
  - secondary: outline + hover sheen
- Form card:
  - glassmorphism (backdrop-filter), with fallback when unsupported
  - input focus ring that matches highlight color grade
  - error state uses warm accent

### 5) Optional: Extend the same design system to Register (recommended for cohesion)
User asked specifically for login; implement login first.
If desired later, replicate the same shell and hero for:
- [Register.tsx](file:///workspace/packages/frontend/src/pages/Register.tsx)

## Assumptions & Decisions
- “Same design” is implemented as **same layout primitives and motion style**, using original assets and a different color grade.
- Implement **Login redesign only** (per request). If you want Register to match, we will apply the same shell with minimal extra work.
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

