# GGC Jhang Result Portal — Presentation Guide

> **Institution:** Government Graduate College Jhang (Affiliated with GCU Faisalabad)
> **System Name:** Official Examination Result & Verification Portal
> **Purpose:** A fully digital academic result management system — from PDF upload to instant student verification.

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [The Problem We Solved](#2-the-problem-we-solved)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Database Design](#5-database-design)
6. [How the App Is Structured](#6-how-the-app-is-structured)
7. [Public Portal — Student Side](#7-public-portal--student-side)
8. [Staff Login & Authentication](#8-staff-login--authentication)
9. [Dashboard](#9-dashboard)
10. [PDF Upload & Auto-Parsing](#10-pdf-upload--auto-parsing)
11. [Courses & Result Sheets](#11-courses--result-sheets)
12. [CGPA & Grading Engine](#12-cgpa--grading-engine)
13. [Student Lookup](#13-student-lookup)
14. [Analytics Module](#14-analytics-module)
15. [Merit / Toppers List](#15-merit--toppers-list)
16. [Departments Management](#16-departments-management)
17. [User Management](#17-user-management)
18. [Official Transcript Generation](#18-official-transcript-generation)
19. [Role-Based Access Control](#19-role-based-access-control)
20. [API Endpoints Reference](#20-api-endpoints-reference)
21. [Security Design](#21-security-design)
22. [Key Design Decisions](#22-key-design-decisions)

---

## 1. Project Summary

The **GGC Jhang Result Portal** is a full-stack web application that digitises the entire academic result lifecycle at Government Graduate College Jhang. It replaces the manual, paper-based process of distributing marks sheets with a secure, instant, and verifiable online portal.

**In one sentence:** Staff uploads an official PDF award sheet → the system reads every row automatically → students enter their roll number and get their complete result, CGPA, and a downloadable transcript in seconds.

---

## 2. The Problem We Solved

| Before (Manual) | After (This System) |
|---|---|
| Paper award sheets filed in the office | Every result stored in a structured database |
| Students visit the college to check results | Students check online via roll number — 24/7 |
| GPA calculated by hand (error-prone) | HEC-compliant CGPA computed automatically |
| No official transcript for students | Downloadable transcript with college logo |
| No merit list visibility | Live toppers list filtered by department/session |
| Results take days after upload | Results live the moment the PDF is processed |
| No audit trail | Every upload is logged with the staff member's name |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User's Browser                    │
│         React 19 + Vite + Tailwind CSS              │
│   Public Portal (Students) │ Staff Dashboard        │
└────────────────────┬────────────────────────────────┘
                     │  HTTPS / REST API
┌────────────────────▼────────────────────────────────┐
│               Express API Server (Node.js)          │
│   Auth │ PDF Parser │ Grading Engine │ Routes       │
└────────────────────┬────────────────────────────────┘
                     │  Drizzle ORM
┌────────────────────▼────────────────────────────────┐
│              PostgreSQL Database                    │
│  departments │ system_users │ courses │ students    │
│  results │ sessions                                 │
└─────────────────────────────────────────────────────┘
```

**Monorepo layout (pnpm workspaces):**

```
/
├── artifacts/
│   ├── gcuf-web/          → React frontend (Vite)
│   └── api-server/        → Express backend
├── lib/
│   ├── db/                → Drizzle schema + migrations
│   ├── api-spec/          → OpenAPI specification (source of truth)
│   ├── api-client-react/  → Auto-generated React Query hooks
│   └── api-zod/           → Auto-generated Zod validators
└── pnpm-workspace.yaml
```

---

## 4. Technology Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 with TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| Routing | Wouter (lightweight) |
| Server State | TanStack React Query v5 |
| UI Components | Shadcn/UI (Radix primitives) |
| Icons | Lucide React |
| Charts | Recharts |
| Font | IBM Plex Sans + IBM Plex Mono |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express v5 |
| Language | TypeScript (compiled via esbuild) |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| File Uploads | Multer |
| PDF Parsing | pdf-parse |
| Logging | Pino |
| Auth | Custom sessions (HTTP-only cookies) |

---

## 5. Database Design

Six core tables underpin the entire system:

### `departments`
Stores the academic departments at the college.
```
id | name (unique)
```

### `system_users`
Staff accounts — both admins and professors.
```
id | username (email) | password_hash | role (admin/professor)
   | full_name | department_id → departments
```

### `courses`
Each uploaded PDF award sheet creates one course record.
```
id | code | title | session | semester
   | credit_hours_raw (e.g. "3(2-1)") | credit_hours (numeric)
   | max_marks | is_core | department_id → departments
   | uploaded_by → system_users
```

### `students`
Each unique student. Uniqueness enforced on `(roll_no, session)`.
```
id | roll_no | name | father_name | cnic | session
```

### `results`
One row per student per course. The heart of the system.
```
id | student_id → students | course_id → courses
   | internal_marks | mid_term | final_term | practical_work
   | total_obtained | percentage | grade | grade_point
   | status (Pass/Fail) | is_supplementary
```
Unique constraint on `(student_id, course_id)` — re-uploading the same PDF updates marks safely without duplicating rows.

### `sessions`
Server-side HTTP session store.
```
sid (PK) | sess (JSON blob) | expire (timestamp)
```

**Entity Relationship:**
```
departments ──< system_users
departments ──< courses ──< results >── students
sessions (standalone, referenced by auth cookies)
```

---

## 6. How the App Is Structured

The app has two distinct layers that share the same URL:

```
/ (root)
 ├── Not authenticated → Landing Page (public student portal)
 ├── Not authenticated + /login → Staff Login Page
 └── Authenticated → Staff Dashboard with sidebar navigation
       ├── /            → Dashboard (stats overview)
       ├── /courses     → Course list + upload
       ├── /courses/:id → Individual course result sheet
       ├── /students    → Student search
       ├── /analytics   → Charts and performance analysis
       ├── /toppers     → Merit leaderboard
       ├── /departments → (Admin only) Manage departments
       └── /users       → (Admin only) Manage staff accounts
```

The routing logic in `App.tsx` checks authentication state on load:
- **Unauthenticated** → renders the public landing page
- **Clicking "Staff Login"** → navigates to the login form
- **After successful login** → the same `/` route renders the full staff dashboard

---

## 7. Public Portal — Student Side

**Who uses it:** Any student, anywhere, on any device — no account needed.

**How it works:**
1. Student visits the portal URL
2. Enters their **roll number** (e.g. `109400`) in the search box
3. Presses **Search Result**
4. The frontend calls `GET /api/results/student?rollNo=109400`
5. Results appear — grouped by **session** then by **semester**:
   - Full marks breakdown per course (Internal, Mid-Term, Final, Practical)
   - Grade, Grade Point, Credit Hours per row
   - Pass/Fail status indicator
   - Cumulative CGPA prominently shown
6. Student clicks **Download Transcript** — a formatted document opens ready to print or save as PDF

**Supplementary exams** are marked with `*` and shown separately — excluded from the main CGPA calculation.

---

## 8. Staff Login & Authentication

**Mechanism:** Custom server-side session authentication (not JWT).

**Login flow:**
1. Staff submits email + password at `/login`
2. Server queries `system_users`, verifies the **bcryptjs** password hash
3. On success: inserts a session row into the `sessions` table, sets an **HTTP-only cookie** containing the session ID (`sid`)
4. Every subsequent API request carries this cookie automatically
5. `authMiddleware.ts` reads the `sid`, looks up the session in the database, attaches the user object to `req.user`
6. On logout: the session row is **deleted from the database** immediately

**Why HTTP-only cookies?** They cannot be read by browser JavaScript — this protects against Cross-Site Scripting (XSS) attacks stealing the session token.

**Why server-side sessions over JWT?** Sessions can be instantly invalidated by deleting one database row. A JWT cannot be revoked until it expires — a critical risk for institutional access control.

---

## 9. Dashboard

The first screen staff see after login — an at-a-glance health check of the system.

**Stat cards:**
- Total Departments
- Total Courses uploaded
- Total Students in the system
- Total Staff Accounts

**Charts (Recharts):**
- **Department bar chart** — number of courses per department
- **Session performance** — average percentage and pass rate per academic session (year-over-year trend)
- **Semester breakdown** — course counts and average performance per semester

All data is fetched from the analytics endpoints and rendered without page reload using **React Query**.

---

## 10. PDF Upload & Auto-Parsing

This is the most technically sophisticated part of the system. It eliminates all manual data entry.

### The Award Sheet Format
GGC Jhang's official award sheets are fixed-layout PDFs. Each column of data appears at a known horizontal `x` position on the page:

| Column | x-range |
|---|---|
| Roll No | 32 – 60 |
| Student Name | 65 – 250 |
| Father Name | 250 – 400 |
| CNIC | 400 – 490 |
| Internal Marks | 495 – 535 |
| Mid-Term | 535 – 570 |
| Final Term | 570 – 610 |
| Practical Work | 610 – 650 |
| Total Obtained | 650 – 700 |

### Parsing Pipeline (`pdfParser.ts`)

**Step 1 — Text Extraction**
`pdf-parse` reads the binary PDF and returns every text item with its exact `x`, `y` coordinates on the page and its string content.

**Step 2 — Line Grouping**
Items sharing the same `y` coordinate (within a small tolerance for rounding) are merged into a single logical line.

**Step 3 — Header Extraction (Regex)**
The top section of each award sheet contains course metadata. Regex patterns pull out:
- Course code: `ENG-I`, `MTH-I`, etc.
- Session: `2023-25`
- Credit hours: `3(2-1)` → parsed to `3` numeric hours
- Max marks: `100`

**Step 4 — Student Row Parsing**
Each data row is classified by its `x` position. Roll numbers are detected by the pattern `\d{6,7}`. Each field lands in the column whose `x-range` it falls within.

**Step 5 — Multi-line Name Handling**
Long student names sometimes wrap onto the next line. The parser "pends" the incomplete record and merges the continuation before finalising the row.

**Step 6 — Safe Upsert**
Each student is inserted or updated (`ON CONFLICT DO UPDATE`) so re-uploading the same course refreshes marks without creating duplicate rows.

### Upload UI
- Staff choose **one PDF** or **multiple PDFs** (bulk upload)
- Per-file progress is shown
- Parsing errors are reported file-by-file with detail
- The course appears in the course list immediately after processing

---

## 11. Courses & Result Sheets

### Course List (`/courses`)
- Lists all uploaded courses: code, title, session, semester, department, student count, upload date
- **Professors** see only their department's courses
- **Admins** see all departments
- Each course has a Delete option (removes the course and all its results)

### Course Detail (`/courses/:id`)
- Full result sheet for one course — every enrolled student in one table
- Columns: Roll No, Name, Internal, Mid-Term, Final, Practical, Total, %, Grade, GP, Status
- Searchable and sortable
- Course metadata header: max marks, credit hours, uploaded by, upload date

---

## 12. CGPA & Grading Engine

Implemented in `lib/grading.ts`. Fully compliant with the **HEC Pakistan 4.0 scale**.

### Grade-Point Lookup Table (selected values)

| Percentage Range | Grade | Grade Points |
|---|---|---|
| ≥ 90% | A | 4.00 |
| 85 – 89% | A- | 3.67 |
| 80 – 84% | B+ | 3.33 |
| 75 – 79% | B | 3.00 |
| 70 – 74% | B- | 2.67 |
| 65 – 69% | C+ | 2.33 |
| 60 – 64% | C | 2.00 |
| 55 – 59% | C- | 1.67 |
| 50 – 54% | D | 1.00 |
| < 40% | F | 0.00 |

The system uses an **exact point-by-point lookup** (not banded averages) to match HEC's precise calculation method.

### Formulas

```
Percentage = (Total Obtained / Max Marks) × 100

Semester GPA = Σ(Grade Point × Credit Hours) ÷ Σ(Credit Hours)

CGPA = Σ(Grade Point × Credit Hours) across ALL core semesters
       ÷ Σ(Credit Hours) across ALL core semesters
```

**Rules:**
- Only **core courses** count toward CGPA (optional courses excluded)
- **Supplementary attempts** are excluded from CGPA
- CGPA is rounded to **4 decimal places**

---

## 13. Student Lookup

### Staff View (`/students`)
- Search any student by name fragment or roll number
- Full semester-wise result history
- CGPA, total credits, pass/fail count summary
- Download transcript button

### Public View (Landing Page)
- Identical data — no login required
- Students access directly via roll number
- Designed to be shareable (a student can bookmark their result URL)

---

## 14. Analytics Module

**`/analytics`** — gives management a data-driven performance overview.

### Panels

**System Overview**
- Total courses, students, departments active
- System-wide average percentage
- Overall pass rate

**Department Performance Chart**
- Horizontal bar chart — average percentage per department
- Instantly identifies strong and weak departments

**Session Trend**
- Results grouped by academic session (year)
- Pass rate and average percentage tracked over time

**Semester Breakdown**
- Course counts and average performance per semester
- Useful for understanding where student performance drops

All charts are built with **Recharts** and update live from the database via React Query.

---

## 15. Merit / Toppers List

**`/toppers`** — Live merit leaderboard for honours, scholarships, and award nominations.

**Filters:**
- Department
- Academic Session
- Semester

**Output:**
- Ranked list: Rank, Roll No, Name, CGPA
- Top 3 ranks highlighted distinctly
- Data refreshes live — as soon as a new course is uploaded, the list updates

**Data source:** `GET /api/analytics/toppers` — computes CGPA on-the-fly across all eligible courses and sorts descending.

---

## 16. Departments Management

**Admin-only — `/departments`**

- View all departments currently in the system
- Add new department (e.g. "Department of Physics")
- Rename existing departments
- Delete departments (only if no courses are linked to prevent orphan data)

Departments are the foundational organisational unit — every course upload and every staff account is tied to one.

---

## 17. User Management

**Admin-only — `/users`**

- View all staff accounts with name, role, and department
- Create new accounts (admin or professor level)
- Edit existing accounts (name, department, role)
- Delete accounts

**Password security:** All passwords hashed with **bcryptjs** (cost factor 12). Plain-text passwords are never stored, logged, or returned by any API response.

---

## 18. Official Transcript Generation

**Endpoint:** `GET /api/results/transcript/:rollNo`

Returns a **server-rendered HTML document** formatted as an official college transcript. Contents:

- College name and logo in the header
- Student identity block (name, roll number, father's name, CNIC, session)
- Semester-by-semester results table with all marks columns
- GPA calculated and shown per semester
- Cumulative CGPA highlighted prominently
- Pass/Fail status per course
- Supplementary attempts noted with `*`
- Document generation date and time

**No PDF library needed.** The browser's native `Print → Save as PDF` converts it perfectly — keeping the server lightweight and the output pixel-perfect.

---

## 19. Role-Based Access Control

Two staff roles with clearly separated permissions:

| Feature | Admin | Professor |
|---|---|---|
| View own department's courses | ✅ | ✅ |
| Upload PDFs for own department | ✅ | ✅ |
| View all departments' courses | ✅ | ❌ |
| Upload PDFs for any department | ✅ | ❌ |
| Delete courses | ✅ | ❌ |
| Manage departments | ✅ | ❌ |
| Manage user accounts | ✅ | ❌ |
| Analytics & Toppers | ✅ | ✅ |
| Student Lookup | ✅ | ✅ |

Roles are enforced **server-side** in `authMiddleware.ts` on every request — the UI only hides menu items as a convenience. Access cannot be gained by manipulating the browser.

---

## 20. API Endpoints Reference

All endpoints are prefixed with `/api`.

### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/auth/user` | Cookie | Get current logged-in user |
| POST | `/auth/login` | None | Login with email + password |
| POST | `/auth/logout` | Cookie | Destroy session |

### Departments
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/departments` | Any staff | List all departments |
| POST | `/departments` | Admin | Create department |
| PATCH | `/departments/:id` | Admin | Rename department |
| DELETE | `/departments/:id` | Admin | Delete department |

### Users
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users` | Admin | List all staff accounts |
| POST | `/users` | Admin | Create staff account |
| PATCH | `/users/:id` | Admin | Update staff account |
| DELETE | `/users/:id` | Admin | Delete staff account |

### Courses
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/courses` | Any staff | List courses (filtered by role) |
| POST | `/courses/upload` | Any staff | Upload single PDF award sheet |
| POST | `/courses/bulk-upload` | Any staff | Upload multiple PDFs at once |
| DELETE | `/courses/:id` | Admin | Delete course and results |

### Results
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/results/course/:courseId` | Any staff | All student marks for a course |
| GET | `/results/student?rollNo=` | Public | Full history + CGPA for a student |
| GET | `/results/transcript/:rollNo` | Public | Printable HTML transcript |

### Analytics
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/analytics/overview` | Any staff | System-wide statistics |
| GET | `/analytics/toppers` | Any staff | Merit list sorted by CGPA |
| GET | `/analytics/sessions` | Any staff | List of academic sessions |
| GET | `/analytics/departments` | Any staff | Per-department performance |
| GET | `/analytics/semesters` | Any staff | Per-semester breakdown |

---

## 21. Security Design

| Concern | Approach |
|---|---|
| Password storage | bcryptjs, cost factor 12 — irreversible hash |
| Session tokens | Stored server-side in DB, not in client-readable JWTs |
| Cookie security | HTTP-only flag — JavaScript cannot read or steal it |
| Authorization | Role checked server-side on every protected route |
| Input validation | Zod schemas validate all API request bodies |
| SQL injection | Drizzle ORM uses parameterised queries exclusively |
| File uploads | Multer restricts accepted MIME type to PDF only |
| Re-upload safety | Upsert logic prevents duplicate result rows |
| Session revocation | Logout deletes the session row — instant invalidation |

---

## 22. Key Design Decisions

### Positional PDF parsing instead of text extraction
Standard PDF text extractors don't understand table columns — they return a stream of words with no column context. By using `x`-coordinate boundaries mapped to each mark column, the parser reliably assigns each number to the correct field even when student names span multiple lines.

### Server-rendered transcripts instead of a PDF library
PDF generation libraries (pdfkit, puppeteer) add significant bundle weight and server memory usage. The transcript endpoint returns styled HTML; the browser prints it natively — zero extra dependencies, fast response, and the output is indistinguishable from a generated PDF.

### Monorepo with code generation
The frontend React Query hooks and Zod validators are auto-generated from a single OpenAPI contract (`lib/api-spec`). If the backend API changes, the TypeScript types break at compile time — not silently at runtime in production.

### IBM Plex Sans as the system font
Designed by IBM, it carries an engineering-precision aesthetic — technically rigorous, highly readable at data-dense sizes, and tonally appropriate for an institution handling official academic records. The monospaced variant (`IBM Plex Mono`) is used specifically for numerical data (marks, CGPA, roll numbers) to ensure alignment and prevent digit confusion.

### Single URL for both public and staff views
Rather than separate subdomains (`portal.ggcjhang.edu.pk` and `staff.ggcjhang.edu.pk`), the same URL serves both. Authentication state determines which interface is rendered. This simplifies deployment, SSL certificate management, and sharing — students link directly to the main URL without needing to know which subdomain hosts the public portal.

---

*GGC Jhang Result Portal — Built with React, Express, PostgreSQL and Drizzle ORM*
*Document version: May 2026*
