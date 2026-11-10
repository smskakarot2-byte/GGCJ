# Data flow

## Public result lookup

    Student -> React landing page -> GET /api/results/student -> Express results router -> Drizzle query -> PostgreSQL -> JSON response -> UI renders result

The handler accepts rollNo and optional session/departmentId. It is public in the current implementation; restrict returned personal fields.

## Staff authentication

    Staff -> React login -> Express auth router -> load system_users record -> verify password hash -> establish session -> frontend auth state

This is the conceptual flow of the custom staff auth model. Confirm exact route names and cookie settings in routes/auth.ts and lib/auth.ts.

## PDF ingestion

    Staff selects PDF
      -> multipart API request
      -> Multer checks MIME, extension and 10 MB size limit
      -> in-memory Buffer
      -> parseAwardSheet()
      -> extract text items and coordinates
      -> group rows / parse header / reconstruct students
      -> grading.ts calculates totals and grades
      -> courses route validates and persists/merges records
      -> import summary returned to UI

## Advanced search

The results search handler validates query parameters with Zod, adds a professor department filter, joins result/student/course/department data, applies filters and sorting, deduplicates by student ID, then slices the requested page. The current implementation loads matching rows before in-memory pagination; this can be expensive at scale.

## Core relationships

Department has courses and may group students/staff. Course belongs to a department. Student has result rows. Each result links one student and one course. See DATABASE_SCHEMA.md.
