# GGC Jhang Result Management System

A full-stack result management portal for Government Graduate College Jhang, affiliated with GCU Faisalabad. The repository is a TypeScript monorepo managed with pnpm workspaces.

## Architecture

- Frontend: React 19 + Vite in **artifacts/gcuf-web**.
- Backend: Express 5 + TypeScript in **artifacts/api-server**.
- Database: PostgreSQL + Drizzle ORM in **lib/db**.
- Shared packages: **lib/api-spec**, **lib/api-zod**, **lib/api-client-react**, **lib/replit-auth-web**.

The browser calls the Express REST API under **/api**. The API uses Drizzle to query PostgreSQL. Staff can upload award-sheet PDFs; the parser extracts student/course data and the backend persists records. Students can look up results by roll number.

## Features

- Public student result lookup.
- Staff login and role-aware dashboard.
- Department, course and student management.
- Award-sheet PDF import.
- Result search, transcripts, analytics and toppers views.
- Grade, grade-point, percentage and GPA calculations.

## Repository map

    artifacts/api-server/       Express API, routes, parser, grading, auth
    artifacts/gcuf-web/         React frontend, pages, components, hooks
    artifacts/mockup-sandbox/   UI prototyping workspace; usage needs review
    lib/db/                     PostgreSQL connection and Drizzle schemas
    lib/api-spec/               Shared API specification
    lib/api-zod/                Shared Zod contracts
    lib/api-client-react/       React Query API hooks/client
    lib/replit-auth-web/        Shared auth UI helpers
    scripts/                    Workspace utilities
    docs/                       Technical documentation

## Main data flow

1. Staff uploads an award-sheet PDF.
2. Multer validates upload metadata and size and keeps the file in memory.
3. pdf-parse extracts text items and coordinates.
4. pdfParser.ts reconstructs header/student rows using coordinate columns and regex patterns.
5. grading.ts calculates totals, percentages, grades and grade points.
6. courses.ts validates and stores/merges course, student and result records through Drizzle.
7. Student lookup routes query PostgreSQL and return result data to the frontend.

## Local development

Prerequisites: Node.js 20+, pnpm and PostgreSQL. Create a development database, then configure a root .env file with placeholders replaced by local values:

    DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE
    SESSION_SECRET=replace-with-a-long-random-secret
    PORT=8080
    ADMIN_EMAIL=admin@example.edu
    ADMIN_PASSWORD=use-a-unique-strong-password

Install dependencies:

    pnpm install

Prepare the schema:

    pnpm --filter @workspace/db run push

Start the API in terminal 1:

    PORT=8080 pnpm --filter @workspace/api-server run dev

Start the frontend in terminal 2:

    PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gcuf-web run dev

PowerShell environment syntax: $env:PORT="8080"; pnpm --filter @workspace/api-server run dev. Open http://localhost:3000.

The API dev script builds and starts the server; check Vite proxy settings if you change the API port.

## Build and typecheck

    pnpm run typecheck
    pnpm run build

Package-level checks:

    pnpm --filter @workspace/gcuf-web run typecheck
    pnpm --filter @workspace/api-server run typecheck

## Environment variables

- DATABASE_URL: PostgreSQL connection string.
- PORT: required API listening port.
- SESSION_SECRET: session signing/configuration secret; verify auth implementation's exact behavior.
- ADMIN_EMAIL and ADMIN_PASSWORD: used by startup to create or synchronize the initial admin account.
- ALLOWED_ORIGINS: comma-separated production CORS allow-list.
- NODE_ENV: controls production behavior and static frontend serving.
- ENCRYPTION_KEY: inspect crypto.ts for exact key format and fail-closed behavior.
- API_PORT: mentioned by local setup instructions for changing the frontend proxy target.

Never commit real credentials. The old local setup guide contained sample admin credentials; do not reuse them.

## Deployment

The repository includes Render, Netlify, Replit and Docker deployment material. The API serves the built frontend in production when NODE_ENV is production. Verify the target deployment config and expected frontend output path before deploying.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [File-by-file guide](docs/FILE_DOCUMENTATION.md)
- [Backend guide](docs/BACKEND_GUIDE.md)
- [Frontend guide](docs/FRONTEND_GUIDE.md)
- [PDF parser](docs/PDF_PARSER_EXPLAINED.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [API reference](docs/API_REFERENCE.md)
- [Data flow](docs/DATA_FLOW.md)
- [Codebase audit](docs/CODEBASE_AUDIT.md)

## Important operational notes

Public result lookup should expose only the minimum necessary student fields. Test role and department authorization on every API route. The PDF parser is tuned to coordinate ranges in a particular award-sheet layout and is not OCR. Drizzle schema definitions and startup CREATE TABLE SQL both exist and must be kept consistent. Do not delete files until imports, build scripts, deployment config and runtime references have been checked.
