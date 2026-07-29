# GCUF Result Portal

A full-stack examination result management system for **Government Graduate College Jhang (GGC Jhang)**. Staff can upload and manage student results; students can look up their results by roll number.

## Stack

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (`artifacts/gcuf-web`)
- **Backend**: Express 5 + TypeScript (`artifacts/api-server`)
- **Database**: PostgreSQL via Drizzle ORM (`lib/db`)
- **Auth**: Custom session-based login (bcrypt passwords, cookie sessions)
- **Shared libs**: `lib/api-client-react`, `lib/api-zod`, `lib/api-spec`

## Running the project

Both services start automatically via Replit workflows:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/gcuf-web: web` | `pnpm --filter @workspace/gcuf-web run dev` | `$PORT` |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | `$PORT` |

## Required environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Replit DB) |
| `SESSION_SECRET` | Secret for signing session cookies |

## Default admin credentials

- **Email**: `smskakarot@gmail.com`
- **Password**: `GCUF2025`

The admin is seeded automatically on first startup.

## Database schema

Tables: `sessions`, `users`, `departments`, `system_users`, `courses`, `students`, `results`

Schema is managed with Drizzle ORM. To push schema changes to development:
```bash
cd lib/db && pnpm drizzle-kit push
```

## User preferences

- Keep the existing monorepo structure (pnpm workspace with `artifacts/` and `lib/` layout)
