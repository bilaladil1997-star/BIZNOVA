# BIZNOVA ERP project instructions

## Project context
- This repository is a Vite + React + TypeScript ERP prototype for BIZNOVA, with bilingual English/Arabic UX and role-aware dashboard flows.
- The app is intentionally incremental and phase-based. Preserve the existing structure and extend it rather than replacing it.
- Treat this as a real ERP product, not a generic demo: keep admin/build-status tracking, auditability, role logic, and safety rules in mind.

## Architecture and code placement
- Keep front-end logic in `src/` and server/mock APIs in `server/`.
- Add new UI modules under `src/components/` and their supporting data under `src/data/`.
- Reuse the existing app patterns from `App.tsx`, `src/api.ts`, and the current component structure instead of introducing a new architecture.
- Keep route-level features aligned with the existing navigation and role model in `App.tsx`.
- For copy/text, prefer the existing bilingual pattern in `src/i18n/` rather than hard-coding strings in components.

## Engineering rules
- Use TypeScript strictly; prefer typed props and data models over `any`.
- Prefer small, composable React components and keep state local unless the existing app already uses a shared pattern.
- Preserve existing routes, records, pages, fields, and data contracts; do not delete or rename established entities without an explicit migration plan.
- Keep authentication, employee, and ERP data access flowing through the existing API helpers in `src/api.ts`.
- For UI changes, respect the app's bilingual directionality (`en` / `ar`) and existing class names/layout patterns.
- Prefer extending current modules and mock data before creating brand-new parallel structures.

## ERP-specific constraints
- Maintain the build-status flow and keep the GM-only status page accessible at `/admin/build-status`.
- Follow the phased delivery order described in `README.md`; do not jump ahead to future modules without completing the current step.
- Keep role-aware behavior consistent with the roles already modeled in `src/data/erp.ts` and `App.tsx`.
- Preserve user-entered data and avoid destructive updates or one-off resets unless the task specifically requires a migration.

## Validation
- Run the smallest relevant validation command for the change.
- For front-end or TypeScript changes, use `npm run build`.
- If the change touches server or API behavior, also run `npm run test:api`.
- Do not run broad suites when a focused check is sufficient.

## Working style
- Inspect the current code before editing; do not assume a file is unused or replace patterns without checking the repo.
- Keep changes surgical and aligned with the current ERP prototype design.
- Document non-obvious decisions inline when the logic is otherwise hard to infer.
- If a task needs a larger refactor, first confirm the current pattern and integration points before changing architecture.
