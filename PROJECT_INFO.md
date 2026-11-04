# 📦 PROJECT INFO — What Is Made Of What

**Project:** GCUF Result Portal (Official Examination Result & Verification Portal)
**Institution:** Government Graduate College Jhang (GGC Jhang), affiliated with GCU Faisalabad
**Repository type:** Full-stack TypeScript **monorepo** managed with **pnpm workspaces**

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Student / Staff)               │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│  FRONTEND  ── React 19 + Vite + Tailwind CSS + shadcn/ui    │
│              (artifacts/gcuf-web)                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (/api/*, Zod-validated)
┌──────────────────────────▼──────────────────────────────────┐
│  BACKEND  ── Express 5 + TypeScript (esbuild bundled)       │
│              (artifacts/api-server)                          │
│              Auth · PDF parsing · CGPA engine · Analytics    │
└──────────────────────────┬──────────────────────────────────┘
                           │ Drizzle ORM
┌──────────────────────────▼──────────────────────────────────┐
│  DATABASE  ── PostgreSQL (lib/db)                            │
│              sessions · users · departments · system_users   │
│              courses · students · results                    │
└─────────────────────────────────────────────────────────────┘
```

**Flow in one sentence:** Staff uploads an official result **PDF** → backend parses every row automatically → data lands in **PostgreSQL** → students look up results, CGPA, and transcripts by **roll number** from the **React frontend**.

---

## 📁 Repository Map — Component By Component

| Path | Layer | Built With | Purpose |
|---|---|---|---|
| `artifacts/gcuf-web` | **Frontend** | React, Vite, Tailwind CSS v4, shadcn/ui (Radix primitives), wouter (routing), TanStack Query, Recharts, framer-motion, lucide-react, react-hook-form + zod | The entire user-facing website: public portal, staff dashboard, analytics charts, toppers list, transcript view |
| `artifacts/api-server` | **Backend** | Express 5, TypeScript, esbuild, multer (file upload), pdf-parse, bcryptjs, cookie-parser, express-session-style custom sessions, helmet, cors, express-rate-limit, pino (logging), zod | REST API under `/api`: auth, PDF upload & parsing, results, courses, departments, users, analytics. Also serves the built frontend in production |
| `artifacts/mockup-sandbox` | Dev tooling | Vite sandbox | UI prototyping/experimentation area (not shipped) |
| `lib/db` | **Database layer** | Drizzle ORM + drizzle-kit, PostgreSQL | Schema definitions (`src/schema/auth.ts`, `src/schema/gcuf.ts`), migrations/push, typed query helpers |
| `lib/api-spec` | Shared contract | OpenAPI/TS spec | Single source of truth for API endpoints shared by frontend & backend |
| `lib/api-zod` | Shared contract | Zod schemas | Request/response validation schemas used on **both** sides (type-safe end-to-end) |
| `lib/api-client-react` | Shared client | React hooks + TanStack Query | Auto-generated typed fetch hooks consumed by the frontend |
| `lib/replit-auth-web` | Shared auth UI | React | Login/session helper components for the web app |
| `scripts` | Tooling | Node/TypeScript | Utility scripts (e.g., post-merge hook) |

---

## 🖥️ Frontend Details (`artifacts/gcuf-web`)

- **Framework:** React + Vite (TypeScript, ESM)
- **Styling:** Tailwind CSS v4 + shadcn/ui components (`src/components/ui`) on top of Radix UI primitives
- **Routing:** `wouter` (lightweight router)
- **Data fetching:** TanStack Query via the shared `@workspace/api-client-react` hooks
- **Charts/Animation:** Recharts (analytics graphs), framer-motion (landing page animation)
- **Forms/Validation:** react-hook-form + zod (schemas shared with backend)

**Pages (`src/pages`):**

| Page | What it is |
|---|---|
| `landing.tsx` | Public home page — roll-number result lookup + advanced search |
| `login.tsx` | Staff authentication |
| `dashboard.tsx` | Staff overview — stats, recent uploads, quick actions |
| `courses.tsx` / `course-detail.tsx` | Course/result-sheet management + per-course marks view |
| `students.tsx` | Student records management |
| `departments.tsx` | Department CRUD |
| `users.tsx` | System user (staff role) management |
| `analytics.tsx` | Pass rates, averages, distribution charts |
| `toppers.tsx` | Merit list / toppers by department & session |

**Key components:** `AdvancedSearch.tsx` (multi-criteria student/session search), `Sidebar.tsx` (staff navigation).

---

## ⚙️ Backend Details (`artifacts/api-server`)

- **Runtime:** Node.js + Express 5, written in TypeScript, bundled with esbuild (`build.mjs`)
- **Logging:** pino / pino-http
- **Security:** helmet headers, CORS allow-list (`ALLOWED_ORIGINS`), rate limiting, bcrypt-hashed passwords, signed cookie sessions

**Route modules (`src/routes`):** `auth`, `results`, `courses`, `departments`, `users`, `analytics`, `health`

**Core libraries (`src/lib`):**

| File | Responsibility |
|---|---|
| `pdfParser.ts` | Extracts text from uploaded award-sheet PDFs (pdf-parse) and parses rows via regex/heuristics into structured student results |
| `grading.ts` | HEC-compliant GPA/CGPA computation engine |
| `auth.ts` / `crypto.ts` | Session creation, password hashing, token helpers |
| `authMiddleware.ts` (`src/middlewares`) | Protects staff routes; role-based access control |

**Upload pipeline:** multer accepts PDF only (MIME + extension check) → `parseAwardSheet()` → department-name normalization → rows inserted into `students` / `results` tables → course marked published.

---

## 🗄️ Database (`lib/db`)

PostgreSQL, schema managed with **Drizzle ORM**:

| Table | Contents |
|---|---|
| `sessions` | Server-side login sessions (cookie store) |
| `users` | Generic/auth users |
| `system_users` | Staff accounts with roles (admin/staff) |
| `departments` | Academic departments |
| `courses` | Courses / exam sessions (result sheets) |
| `students` | Student records (roll number, name, department, session) |
| `results` | Per-student, per-course marks, grades, GP/CGPA |

Schema push (dev): `cd lib/db && pnpm drizzle-kit push`

---

## 🔐 Authentication

Custom **session-based auth** (no third-party JWT provider): bcrypt password hashing + signed session cookies stored in the `sessions` table. Admin is seeded on first startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars.

---

## 🚀 Deployment & Environments

| Target | Config file | Notes |
|---|---|---|
| **Render** (unified single service) | `render.yaml`, `backend-render.yaml` | Frontend is built and **served by the Express server**; free PostgreSQL attached; `DATABASE_URL`, `SESSION_SECRET`, `ALLOWED_ORIGINS` env vars |
| **Netlify** (frontend-only option) | `NETLIFY_DEPLOYMENT.md` | Static SPA pointing at separately hosted API |
| **Replit** (development) | `.replit`, `replit.nix`, workflows | Web dev server + API dev server run side-by-side |
| **Docker** | `Dockerfile` | Containerized build of the unified app |
| Local | `LOCAL_SETUP.md` | pnpm workspace, two dev servers |

**Required environment variables:** `DATABASE_URL`, `SESSION_SECRET` (+ `ADMIN_EMAIL`, `ADMIN_PASSWORD` for seeding).

---

## 🧰 Toolchain Summary

- **Package manager:** pnpm (workspaces + catalog versioning — see `pnpm-workspace.yaml`)
- **Language:** TypeScript everywhere (`tsconfig.base.json` shared config, `tsc --build` project references for libs)
- **Quality gates:** `pnpm build` = full typecheck + workspace builds; Prettier for formatting
- **Docs already in repo:** `replit.md` (setup), `PRESENTATION_GUIDE.md` (feature deep-dive), `LOCAL_SETUP.md`, `RENDER_DEPLOYMENT_GUIDE.md`, `NETLIFY_DEPLOYMENT.md`
