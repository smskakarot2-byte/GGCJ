---
name: Express 5 params typing
description: req.params values are typed as string | string[] in Express 5 TypeScript; parseInt and other string ops require a cast
---

## Rule
Always cast `req.params.someId as string` before passing to `parseInt()` or any function expecting `string`.

**Why:** Express 5's TypeScript types broaden `req.params` to `string | string[]` even though at runtime params are always strings. Without the cast, `tsc --noEmit` reports TS2345 errors.

**How to apply:** `const id = parseInt(req.params.id as string);` — apply the same pattern to any route param used with string operations.
