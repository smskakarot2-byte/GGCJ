---
name: DB dist stale after schema changes
description: lib/db/dist/schema/gcuf.d.ts needs manual patching when new columns are added to the Drizzle schema; tsc rebuild fails due to drizzle-zod/Zod version mismatch
---

## Rule
When columns are added to `lib/db/src/schema/gcuf.ts`, manually add the matching PgColumn declaration block to `lib/db/dist/schema/gcuf.d.ts`. Also add the field to the corresponding `insertXxxSchema` Zod object in the same file.

**Why:** `drizzle-zod@0.8.3` generates types using `z.ZodInt` and Zod v4 APIs, but the project uses `zod@3.x`. This makes `tsc -p lib/db/tsconfig.json` fail with `ZodType` constraint errors, so the dist cannot be auto-rebuilt. The api-server esbuild build still succeeds (esbuild skips type checking), but `tsc --noEmit` for the api-server uses project references and reads the stale dist/*.d.ts files.

**How to apply:** After editing `lib/db/src/schema/gcuf.ts` to add a column, open `lib/db/dist/schema/gcuf.d.ts` and insert the corresponding `PgColumn<{...}>` block in the correct table's `columns` object, following the existing pattern. Boolean columns use `columnType: "PgBoolean"`, integer FKs use `columnType: "PgInteger"`.
