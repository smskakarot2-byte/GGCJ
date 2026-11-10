# Architecture

## Components

| Layer | Path | Responsibility |
|---|---|---|
| Frontend | artifacts/gcuf-web | React SPA, public lookup and staff UI |
| API | artifacts/api-server | Express middleware, route handlers, PDF import and grading |
| Database | lib/db | PostgreSQL pool, Drizzle client and schema |
| Shared contracts | lib/api-spec, lib/api-zod | API specification and validation schemas |
| React client | lib/api-client-react | Typed React API hooks |
| Auth UI | lib/replit-auth-web | Shared authentication UI helpers |

## Runtime flow

    Browser -> React/Vite -> REST /api -> Express middleware -> route module -> Drizzle -> PostgreSQL

PDF ingestion follows: staff upload -> Multer -> parseAwardSheet -> grading functions -> course/student/result persistence.

## Backend startup

artifacts/api-server/src/index.ts validates PORT, calculates the frontend build path, runs ensureSchema(), runs seedAdmin(), installs production static-file/SPA handling and starts the listener. ensureSchema executes idempotent CREATE TABLE IF NOT EXISTS statements for core tables. seedAdmin requires ADMIN_EMAIL and ADMIN_PASSWORD, hashes the password with bcrypt and creates or synchronizes the admin account.

## Express middleware

artifacts/api-server/src/app.ts configures Helmet/CSP, CORS, trust proxy, rate limiting, Pino request logging, cookie parsing, JSON and URL-encoded body parsing, authMiddleware, then mounts the router at /api and adds a generic error handler.

## Route registry

src/routes/index.ts mounts health, auth, departments, users, courses, results and analytics routers.

## Trust boundaries

Browser input and uploaded PDFs are untrusted. UI route hiding is not authorization; server handlers must enforce roles and department ownership. Public result endpoints should return only intended public fields. Secrets and student personal data must not enter logs or documentation.

## Design caveats

Drizzle schema files and startup SQL duplicate schema definitions. Production static serving assumes the frontend build exists at the path calculated by index.ts. The mockup sandbox is not proven unused; trace package scripts, CI and deployment references before removal.
