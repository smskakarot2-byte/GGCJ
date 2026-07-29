# GGC Result System

A full-stack web application for GGC Jhang examination result management with role-based access, PDF award-sheet parsing, GPA calculation, analytics, and transcript generation.

## Run & Operate

- Frontend: `pnpm --filter @workspace/gcuf-web run dev` (port from $PORT, preview at `/`)
- API: `pnpm --filter @workspace/api-server run dev` (port 8080, proxy at `/api`)
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
- DB migrate: `pnpm --filter @workspace/db run migrate`
- Required env vars: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- **Frontend**: React 18 + Vite 7, Tailwind v4, shadcn/ui, Recharts, Wouter, TanStack Query
- **Backend**: Express 4, pino logging, multer (PDF upload)
- **Auth**: Replit Auth OIDC/PKCE (`@workspace/replit-auth-server` / `@workspace/replit-auth-web`)
- **Database**: PostgreSQL via Drizzle ORM (`@workspace/db`)
- **PDF**: pdf-parse@1.1.1 with `pagerender` hook for x/y position extraction
- **API contract**: OpenAPI → Zod schemas + React Query hooks via Orval

## Where things live

```
artifacts/
  api-server/src/
    app.ts               — Express setup, middleware
    routes/              — departments, courses (upload), results, analytics, users, auth
    lib/
      pdfParser.ts       — x-position-based column detection (the hard part)
      grading.ts         — GGC grade scale, GPA, percentage logic
  gcuf-web/src/
    pages/               — dashboard, courses, course-detail, students, analytics, toppers, departments, users
    components/          — Sidebar, shadcn ui
lib/
  db/src/schema/gcuf.ts  — DB schema (departments, students, courses, results, system_users)
  api-spec/              — OpenAPI spec → codegen
```

## Architecture decisions

- **PDF parsing**: `pdf-parse pagerender` hook extracts text items with x/y coordinates. Column boundaries hard-coded from GGC award sheet format (Name x≈63, Father x≈199, CNIC x≈328). Page y-offset (×10 000) prevents cross-page line merging.
- **Fail rule**: If `status='Fail'`, `gradePoint` stored as `0.00` in DB (enforced in parser and GPA computation)
- **Ranking by CGPA**: Toppers sorted by CGPA (core subjects only), avg percentage as tiebreaker — both metrics use same core-subjects-only pool for consistency
- **Auth gate**: All API routes (except `/api/healthz`, `/api/analytics/sessions`, `/api/results/student`) require Replit Auth session cookie
- **Contract-first API**: OpenAPI spec drives Zod validation on server and typed hooks on client

## Product

- Sign in with Replit → Admin or Professor role
- **Admin**: Dashboard stats, department CRUD, user management, cross-dept analytics charts, toppers leaderboard
- **Professor**: Upload GGC award-sheet PDF → auto-parse 100+ students, per-course result cards, student lookup with CGPA gauge, text transcript download

## Auth

- **Custom email/password auth** (replaced Replit OIDC)
- Admin hardcoded: `smskakarot@gmail.com` / `GCUF2025` — seeded on every server startup (password unchanged)
- Professors: email/password accounts created by admin via Users panel
- Public landing page (roll-number lookup) for unauthenticated visitors
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/user`
- Sessions stored in `sessions` table (no OIDC tokens — just user+role JSON)
- Role-based sidebar: admin sees all 7 items; professor sees 5 (no Departments/Users)

## User preferences

- Theme: Deep Dark default, Light mode available via toggle (Arial font throughout)
- Font: Arial, Helvetica, sans-serif
- Web app only (no Python desktop app)

## Gotchas

- `pdf-parse` is marked **external** in `artifacts/api-server/build.mjs` — do NOT bundle it (it loads test fixtures at require-time)
- GGC roll numbers are always 6 digits in the award sheet format; column x-boundaries may need adjustment for other GGC PDF layouts
- The `pagerender` callback increments a `pageIndex` counter — order of page processing matches PDF page order

## Pointers

- GGC grading scale: `artifacts/api-server/src/lib/grading.ts`
- DB schema: `lib/db/src/schema/gcuf.ts`
- PDF column x-boundaries: `artifacts/api-server/src/lib/pdfParser.ts` → `const X = {...}`
- Color palette: `artifacts/gcuf-web/src/index.css`
