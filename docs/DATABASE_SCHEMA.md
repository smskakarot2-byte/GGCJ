# Database schema

The database package is `lib/db` (`@workspace/db`), using PostgreSQL through `pg` and Drizzle ORM. Academic schema is defined in `src/schema/gcuf.ts`; generic users and sessions are defined in `src/schema/auth.ts`.

## Academic tables

| Table | Important fields and relationships |
|---|---|
| `departments` | Primary key `id`; unique required `name`; `created_at`. |
| `system_users` | Primary key; unique username; password hash; role (default professor); full name; optional department FK (set null on department deletion); creation timestamp. |
| `courses` | Course code/title, raw/numeric credit hours, session, semester, required department FK (cascade), max marks, core flag, optional uploading user FK and creation timestamp. |
| `students` | Roll number, name, father name, CNIC, session, optional department FK (set null on department deletion), creation timestamp. Unique on roll number + session + department. |
| `results` | Student/course FKs (both cascade), internal/midterm/final/practical marks, total, percentage, grade, grade point, status, supplementary flag and timestamp. Unique on student + course. |

## Authentication-related tables

- `sessions`: session ID primary key, JSON session payload and expiry timestamp, with an expiry index.
- `users`: generic profile identity with UUID-default string ID, email, first/last name, profile image URL and timestamps.

The custom staff account model is `system_users`; do not assume `users` is the staff table.

## Relationships

    departments -> system_users
    departments -> courses
    departments -> students
    system_users -> courses (uploaded_by)
    students -> results
    courses -> results

## Schema management caveat

Drizzle schemas coexist with raw `CREATE TABLE IF NOT EXISTS` SQL in `artifacts/api-server/src/index.ts`. The definitions can drift. `CREATE TABLE IF NOT EXISTS` does not migrate an existing table when columns or constraints change. Prefer reviewed, versioned Drizzle migrations and one authoritative schema definition.

## Data protection

CNIC is sensitive personal data. Inspect `crypto.ts` for key parsing, IV/authentication-tag handling, missing-key behavior and rotation. Public API responses should return only fields needed for result verification.
