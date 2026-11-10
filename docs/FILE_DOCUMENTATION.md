# File-by-file guide

This is a curated reference for important files confirmed during inspection, not yet a mathematically exhaustive inventory of every tracked path.

## Root

| File | Purpose |
|---|---|
| package.json | Root scripts: typecheck libraries/packages, then recursive builds. preinstall enforces pnpm. |
| pnpm-workspace.yaml | Declares artifacts/*, lib/*, lib/integrations/* and scripts workspace globs; shared version catalog and overrides. |
| pnpm-lock.yaml | Reproducible dependency resolution; keep tracked. |
| PROJECT_INFO.md | Existing architecture and feature overview; code wins if it differs. |
| LOCAL_SETUP.md | Local setup instructions; contains historical sample admin credentials that must not be reused. |
| render.yaml / backend-render.yaml | Render deployment candidates; compare before treating either as redundant. |
| Dockerfile | Container build/run configuration; keep if Docker deployment is supported. |
| NETLIFY_DEPLOYMENT.md / RENDER_DEPLOYMENT_GUIDE.md | Target-specific deployment instructions. |
| PRESENTATION_GUIDE.md / PRESENTATION_SCRIPT.md | Presentation assets, not runtime code. |
| .replit / replit.nix | Replit environment/workflow configuration. |
| tsconfig.base.json | Shared TypeScript compiler configuration. |

## Frontend: artifacts/gcuf-web

| File/path | Purpose |
|---|---|
| package.json | Package scripts and UI dependencies. |
| src/main.tsx | Finds #root and renders App; imports global CSS. |
| src/App.tsx | Creates QueryClient; wraps theme/auth/query/tooltip providers; configures wouter routes; selects public or staff shell; shows admin-only UI routes. |
| src/index.css | Global stylesheet/Tailwind entry. |
| src/pages/landing.tsx | Public landing and student lookup. |
| src/pages/login.tsx | Staff sign-in page. |
| src/pages/dashboard.tsx | Staff dashboard. |
| src/pages/courses.tsx and course-detail.tsx | Course list and detailed course/result view. |
| src/pages/students.tsx | Student management/search. |
| src/pages/departments.tsx and users.tsx | Admin department and staff account screens. |
| src/pages/analytics.tsx and toppers.tsx | Analytics and merit/toppers views. |
| src/components/Sidebar.tsx | Staff navigation. |
| src/lib/use-auth | Frontend authentication state/helper. |
| vite.config.ts | Vite build/dev/proxy configuration. |

## Backend: artifacts/api-server

| File/path | Purpose |
|---|---|
| package.json | API scripts/dependencies; dev sets NODE_ENV, builds and starts. |
| build.mjs | esbuild bundle configuration; affects output/deployment layout. |
| src/index.ts | PORT validation, schema ensure, admin seed, production static frontend and server listener. |
| src/app.ts | Express middleware order, /api mount and generic error handler. |
| src/routes/index.ts | Registers all route modules. |
| src/routes/courses.ts | Course operations and PDF import/merge/persistence. |
| src/routes/results.ts | Course results, sessions, advanced search, public lookup and transcript logic. |
| src/routes/auth.ts | Staff authentication/session endpoints. |
| src/routes/departments.ts | Department endpoints. |
| src/routes/users.ts | Staff/system user endpoints. |
| src/routes/analytics.ts | Analytics/reporting endpoints. |
| src/routes/health.ts | Health/status endpoint. |
| src/lib/pdfParser.ts | Award-sheet extraction into typed header/student records. |
| src/lib/grading.ts | Grade map, GPA, percentage and credit-hour parsing. |
| src/lib/crypto.ts | Sensitive-field encryption/decryption; inspect key behavior before release. |
| src/lib/auth.ts | Authentication/session helpers; inspect exports for exact responsibilities. |
| src/lib/logger.ts | Pino logger configuration. |
| src/middlewares/authMiddleware.ts | Loads authentication context before route handlers. |

## Shared libraries

- lib/db: PostgreSQL pool and Drizzle instance.
- lib/db/src/schema/gcuf.ts: departments, system_users, courses, students, results and inferred types.
- lib/db/src/schema/auth.ts: sessions and generic users schema.
- lib/api-spec: shared API specification.
- lib/api-zod: shared Zod validation contracts.
- lib/api-client-react: React Query API hooks/client.
- lib/replit-auth-web: shared auth UI helpers.

## Completing the inventory

For each remaining file inspect imports/exports, dynamic imports, package scripts, Vite/esbuild config, TS project references, deployment/Docker/Replit/CI files and runtime string paths. Only then classify as removable.
