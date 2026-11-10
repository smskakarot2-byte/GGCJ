# Backend guide

Package: artifacts/api-server (@workspace/api-server). Runtime: Node.js, Express 5, TypeScript and esbuild.

## Core files

- src/index.ts: validates PORT; ensures core DB tables; seeds/synchronizes admin; serves frontend build in production; starts listener.
- src/app.ts: configures middleware and mounts routes.
- src/routes/index.ts: registers feature routers.
- src/routes/*.ts: feature endpoints.
- src/lib/pdfParser.ts: PDF award-sheet extraction.
- src/lib/grading.ts: grade/GPA calculations.
- src/lib/crypto.ts: sensitive field crypto.
- src/middlewares/authMiddleware.ts: authentication context.

## Middleware order

1. Helmet and CSP.
2. CORS with credentials and ALLOWED_ORIGINS allow-list.
3. trust proxy.
4. General API rate limiter (200 requests per 15 minutes per IP).
5. Pino HTTP request logging.
6. Cookie parser.
7. JSON and URL-encoded parsers.
8. Authentication middleware.
9. /api rate limiter and route registry.
10. Generic error handler.

CSP currently permits inline/eval-related script sources to support existing transcript behavior. Revisit these exceptions.

## Route modules

health, auth, departments, users, courses, results and analytics. All are mounted beneath /api.

## PDF upload

courses.ts configures Multer memory storage, 10 MB max file size, PDF MIME check and .pdf extension check. It passes the Buffer to parseAwardSheet(), validates course code/title and non-empty student records, then finds or creates/merges course and student/result records. MIME and extension checks do not prove file contents are safe.

## Grading exports

- getGradePoint: rounds percentage to integer; 85+ => 4.00; below 40 => 0; otherwise uses explicit map.
- computeGrade: returns grade, gradePoint and Pass/Fail.
- computeGPA: credit-hour-weighted average; returns zero if total credits are zero.
- computePercentage: percentage rounded to two decimals; zero when max marks <= 0.
- parseCreditHours: parses leading numeric value; falls back to 3.

Confirm grading policy against current official college rules before official use.

## Database startup

index.ts runs ensureSchema before seedAdmin and before listening. The raw SQL creates core tables if missing. This is not a versioned migration system and duplicates Drizzle definitions. seedAdmin requires ADMIN_EMAIL and ADMIN_PASSWORD and bcrypt-hashes the password; the configured password is synchronized on restart.

## Commands

    pnpm --filter @workspace/api-server run typecheck
    pnpm --filter @workspace/api-server run build
    PORT=8080 pnpm --filter @workspace/api-server run dev

## Hardening checklist

Test anonymous/professor/admin/cross-department access for every endpoint; minimize public student fields; validate production secrets and encryption key; add PDF fixtures; move schema evolution to migrations; review CSP/CORS and upload validation.
