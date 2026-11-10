# API reference

All feature routers are mounted under /api by artifacts/api-server/src/app.ts and src/routes/index.ts. This is a source-derived route-family guide, not yet a complete OpenAPI specification.

## Registered router modules

| Module | Scope |
|---|---|
| health.ts | Health/status |
| auth.ts | Staff authentication/session |
| departments.ts | Department management |
| users.ts | Staff account management |
| courses.ts | Course management and PDF upload |
| results.ts | Result retrieval/search/student lookup/transcripts |
| analytics.ts | Analytics/reporting |

## Confirmed result routes

| Method | Full path | Access in handler |
|---|---|---|
| GET | /api/results/course/:courseId | Authenticated; professor department check |
| GET | /api/results/sessions | No explicit auth check in this handler |
| GET | /api/results/search | Authenticated; professor department restriction |
| GET | /api/results/student | Public; rollNo required; optional session/departmentId |

The public student lookup must be reviewed for personal data exposure. The result search accepts filters such as name, rollNo, CNIC, session, department, course code, grade bounds, status, sorting and pagination. The current handler does not implement CNIC filtering because CNIC is encrypted.

## Courses

The courses router supports listing/management and PDF import. The upload handler expects a multipart PDF file, uses Multer, supports session/semester overrides and can merge new students into an existing course. Consult routes/courses.ts for exact method, path and multipart field name.

## Completing the API contract

For every handler, document method/path, authentication, role/department policy, parameters, body schema, multipart field names, response schema, error statuses, pagination and personal-data fields. Compare Express handlers with lib/api-spec and lib/api-zod to detect contract drift. Use synthetic data in examples; never publish real student data or credentials.
