# Initial codebase audit

## Scope and confidence

Static review of selected workspace config, package manifests, frontend entry/routing, API startup/middleware, route handlers, PDF parser, grading and Drizzle schemas. This is not a complete recursive dead-code audit, vulnerability scan, penetration test or runtime verification.

## Findings

### High: public student data minimization

Evidence: artifacts/api-server/src/routes/results.ts defines GET /results/student without an authentication check. The query selects identity fields including father name and CNIC and decrypts CNIC in result responses. Risk: public lookup may expose unnecessary personal data. Action: minimize the public response and add tests asserting exactly which fields are exposed.

### High: encryption configuration

Evidence: crypto.ts is used for sensitive-field encryption/decryption. Confirm current missing-key and malformed-key behavior directly before release. Risk: plaintext fallback or weak key handling would expose sensitive data. Action: require a valid production key, test fail-closed behavior and plan migration for legacy plaintext data.

### High: role and department authorization consistency

Evidence: route handlers implement authentication and department checks individually. A route-by-route permission matrix is still required. Risk: a handler that checks only login or trusts client department IDs may allow cross-department access. Action: test anonymous, professor-own-department, professor-other-department and admin cases for every endpoint.

### Medium: duplicate schema definitions

Evidence: Drizzle schema in lib/db/src/schema and raw CREATE TABLE IF NOT EXISTS SQL in api-server/src/index.ts. Risk: definitions drift; CREATE TABLE IF NOT EXISTS does not migrate existing tables. Action: use reviewed versioned migrations as the authoritative schema.

### Medium: search pagination in memory

Evidence: results.ts awaits all matching rows, deduplicates and slices in application code. Risk: unnecessary memory/latency as data grows. Action: move filtering, deduplication/count/pagination into SQL where practical and measure query plans.

### Medium: fixed-layout PDF parser

Evidence: pdfParser.ts uses hardcoded X-coordinate bands and Y tolerance. Risk: layout changes may silently misclassify fields. Action: build fixture tests and reject uncertain imports.

### Medium: permissive CSP directives

Evidence: app.ts allows inline and eval-related script sources. Risk: weakens CSP protection. Action: identify transcript requirements and move to nonce/hash/external scripts where feasible.

### Low: stale setup credentials/docs

Evidence: LOCAL_SETUP.md contains historical sample admin credentials; current startup seeds from ADMIN_EMAIL and ADMIN_PASSWORD. Action: remove/revoke default credentials, document environment-based setup and never reuse sample values.

## File disposition

| Item | Classification | Action |
|---|---|---|
| pnpm-lock.yaml | Essential | Keep |
| pnpm-workspace.yaml | Essential | Keep |
| Root package.json | Essential | Keep |
| artifacts/api-server | Runtime | Keep |
| artifacts/gcuf-web | Runtime | Keep |
| lib/db and shared API packages | Shared runtime/build packages | Keep unless full dependency graph proves otherwise |
| artifacts/mockup-sandbox | Investigate | Trace workspace, scripts, CI, deployment and imports before removal |
| dist | Generated output | Usually ignore; verify deployment needs |
| node_modules | Installed dependency output | Should not be committed; check Git tracking and add ignore rule |
| Presentation docs | Human-facing documentation | Keep if still useful; not runtime code |
| Render/Netlify/Docker configs | Deployment-specific | Keep only supported targets after checking active platform |

## Dependency audit

Root, frontend, backend and database manifests were inspected. This is not sufficient to label dependencies unused. Check source imports, Vite/esbuild plugins, scripts, peer dependencies, dynamic usage and build tooling before removing packages.

## Priority remediation

1. Minimize public student response fields.
2. Verify encryption key behavior and production secrets.
3. Add full role/department authorization tests.
4. Add parser fixtures and grading boundary tests.
5. Move schema evolution to versioned migrations.
6. Move search pagination into SQL.
7. Tighten CSP.
8. Audit tracked generated files and dependencies.
9. Reconcile deployment guides/config with the actual hosting target.

## Verification still required

- Complete recursive file/import/reference inventory.
- Confirm whether node_modules and dist are tracked.
- Full endpoint/method/auth/request/response matrix.
- Dependency usage and vulnerability scan.
- Automated test run and deployment smoke test.
- Confirm grading policy with current academic rules.
