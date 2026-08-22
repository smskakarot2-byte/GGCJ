import { Router, type IRouter, type Request, type Response } from "express";
import { db, resultsTable, studentsTable, coursesTable, departmentsTable, systemUsersTable } from "@workspace/db";
import { eq, and, gte, lte, like, or, desc, asc, SQL } from "drizzle-orm";
import { decryptField } from "../lib/crypto";
import { computeGPA } from "../lib/grading";
import fs from "fs";
import path from "path";
import { z } from "zod";

// Embed the college logo once at startup so every transcript request has it ready
let LOGO_DATA_URI = "";
try {
  const logoPath = path.join(__dirname, "../../gcuf-web/public/college-logo.png");
  const b64 = fs.readFileSync(logoPath).toString("base64");
  LOGO_DATA_URI = `data:image/png;base64,${b64}`;
} catch {
  // If logo not found, transcript will render without it
}

const router: IRouter = Router();

router.get("/results/course/:courseId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const courseId = parseInt(req.params.courseId as string);
  if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

  // Professors may only view results for courses in their own department
  const user = req.user as { id: number; role: string };
  if (user.role === "professor") {
    const [prof] = await db
      .select({ departmentId: systemUsersTable.departmentId })
      .from(systemUsersTable)
      .where(eq(systemUsersTable.id, user.id));
    const [course] = await db
      .select({ departmentId: coursesTable.departmentId })
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId));
    if (!prof?.departmentId || prof.departmentId !== course?.departmentId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
  }

  const rows = await db
    .select({
      id: resultsTable.id,
      rollNo: studentsTable.rollNo,
      name: studentsTable.name,
      fatherName: studentsTable.fatherName,
      cnic: studentsTable.cnic,
      session: studentsTable.session,
      internalMarks: resultsTable.internalMarks,
      midTerm: resultsTable.midTerm,
      finalTerm: resultsTable.finalTerm,
      practicalWork: resultsTable.practicalWork,
      totalObtained: resultsTable.totalObtained,
      percentage: resultsTable.percentage,
      grade: resultsTable.grade,
      gradePoint: resultsTable.gradePoint,
      status: resultsTable.status,
      isSupplementary: resultsTable.isSupplementary,
    })
    .from(resultsTable)
    .innerJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
    .where(eq(resultsTable.courseId, courseId))
    .orderBy(studentsTable.rollNo);

  res.json(rows.map((r) => ({ ...r, cnic: decryptField(r.cnic) })));
});

router.get("/results/sessions", async (_req: Request, res: Response) => {
  const rows = await db.selectDistinct({ session: studentsTable.session }).from(studentsTable).orderBy(studentsTable.session);
  res.json(rows.map((r) => r.session).filter(Boolean).sort());
});

// Advanced Search Endpoint for Admin and Professors
router.get("/results/search", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

  const user = req.user as { id: number; role: string; departmentId?: number };

  // Validation schema
  const querySchema = z.object({
    name: z.string().optional(),
    rollNo: z.string().optional(),
    cnic: z.string().optional(),
    session: z.string().optional(),
    departmentId: z.string().optional(),
    courseCode: z.string().optional(),
    gradeMin: z.string().optional(),
    gradeMax: z.string().optional(),
    status: z.string().optional(),
    sortBy: z.enum(["name", "rollNo", "grade", "session"]).optional().default("rollNo"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
    page: z.string().optional().default("1"),
    limit: z.string().optional().default("50"),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.errors });
    return;
  }

  const {
    name,
    rollNo,
    cnic,
    session,
    departmentId: deptFilter,
    courseCode,
    gradeMin,
    gradeMax,
    status,
    sortBy,
    sortOrder,
    page: pageStr,
    limit: limitStr,
  } = parsed.data;

  const page = parseInt(pageStr);
  const limit = Math.min(parseInt(limitStr), 100); // Max 100 per page
  const offset = (page - 1) * limit;

  // Build WHERE conditions - must be done after baseQuery is defined since we reference its tables
  const conditions: SQL[] = [];

  // Professor restriction: can only see their own department
  if (user.role === "professor") {
    if (!user.departmentId) {
      res.status(403).json({ error: "Professor has no department assigned" });
      return;
    }
    conditions.push(eq(studentsTable.departmentId, user.departmentId));
  }

  // Build the base query first
  const baseQuery = db
    .select({
      id: resultsTable.id,
      studentId: studentsTable.id,
      rollNo: studentsTable.rollNo,
      name: studentsTable.name,
      fatherName: studentsTable.fatherName,
      cnic: studentsTable.cnic,
      session: studentsTable.session,
      departmentId: studentsTable.departmentId,
      departmentName: departmentsTable.name,
      courseId: coursesTable.id,
      courseCode: coursesTable.code,
      courseTitle: coursesTable.title,
      courseSemester: coursesTable.semester,
      internalMarks: resultsTable.internalMarks,
      midTerm: resultsTable.midTerm,
      finalTerm: resultsTable.finalTerm,
      practicalWork: resultsTable.practicalWork,
      totalObtained: resultsTable.totalObtained,
      percentage: resultsTable.percentage,
      grade: resultsTable.grade,
      gradePoint: resultsTable.gradePoint,
      status: resultsTable.status,
      isSupplementary: resultsTable.isSupplementary,
    })
    .from(resultsTable)
    .innerJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
    .innerJoin(coursesTable, eq(resultsTable.courseId, coursesTable.id))
    .innerJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id));

  // Apply filters after baseQuery is defined
  if (name && name.trim()) {
    conditions.push(like(studentsTable.name, `%${name.trim()}%`));
  }
  if (rollNo && rollNo.trim()) {
    conditions.push(like(studentsTable.rollNo, `%${rollNo.trim()}%`));
  }
  if (cnic && cnic.trim()) {
    // CNIC is encrypted, so we need to decrypt and compare in application logic
    // For now, skip CNIC filter or implement decryption-based filtering
  }
  if (session && session.trim()) {
    conditions.push(eq(studentsTable.session, session.trim()));
  }
  if (deptFilter && deptFilter.trim()) {
    const deptId = parseInt(deptFilter);
    if (!isNaN(deptId)) {
      // Admins can filter by any department, professors are already restricted above
      if (user.role === "admin") {
        conditions.push(eq(studentsTable.departmentId, deptId));
      }
    }
  }
  if (courseCode && courseCode.trim()) {
    conditions.push(like(coursesTable.code, `%${courseCode.trim()}%`));
  }
  if (status && status.trim()) {
    conditions.push(eq(resultsTable.status, status.trim()));
  }
  if (gradeMin) {
    const minGp = parseFloat(gradeMin);
    if (!isNaN(minGp)) {
      conditions.push(gte(resultsTable.gradePoint, minGp));
    }
  }
  if (gradeMax) {
    const maxGp = parseFloat(gradeMax);
    if (!isNaN(maxGp)) {
      conditions.push(lte(resultsTable.gradePoint, maxGp));
    }
  }

  if (conditions.length > 0) {
    baseQuery.where(and(...conditions));
  }

  // Sorting
  const sortColumn = 
    sortBy === "name" ? studentsTable.name :
    sortBy === "grade" ? resultsTable.gradePoint :
    sortBy === "session" ? studentsTable.session :
    studentsTable.rollNo;
  
  baseQuery.orderBy(sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn));

  // Get all matching rows first
  const allRows = await baseQuery;

  // Deduplicate by studentId to show each student only once
  // Keep the first occurrence (or highest grade if sorting by grade)
  const seen = new Set<number>();
  const uniqueRows: typeof allRows = [];
  for (const row of allRows) {
    if (!seen.has(row.studentId)) {
      seen.add(row.studentId);
      uniqueRows.push(row);
    }
  }

  const total = uniqueRows.length;

  // Apply pagination manually
  const rows = uniqueRows.slice(offset, offset + limit);

  res.json({
    data: rows.map((r) => ({ ...r, cnic: decryptField(r.cnic) })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.get("/results/student", async (req: Request, res: Response) => {
  const rollNo = req.query.rollNo as string;
  const session = req.query.session as string | undefined;
  const deptIdParam = req.query.departmentId as string | undefined;
  const departmentId = deptIdParam ? parseInt(deptIdParam) : undefined;

  if (!rollNo) { res.status(400).json({ error: "rollNo required" }); return; }

  const conditions = [eq(studentsTable.rollNo, rollNo)];
  if (session) conditions.push(eq(studentsTable.session, session));
  if (departmentId && !isNaN(departmentId)) conditions.push(eq(studentsTable.departmentId, departmentId));

  const studentRows = await db
    .select()
    .from(studentsTable)
    .where(and(...conditions))
    .limit(1);

  if (!studentRows.length) { res.status(404).json({ error: "Student not found" }); return; }
  const student = studentRows[0];

  const resultRows = await db
    .select({
      id: resultsTable.id,
      courseId: coursesTable.id,
      rollNo: studentsTable.rollNo,
      name: studentsTable.name,
      fatherName: studentsTable.fatherName,
      cnic: studentsTable.cnic,
      session: studentsTable.session,
      internalMarks: resultsTable.internalMarks,
      midTerm: resultsTable.midTerm,
      finalTerm: resultsTable.finalTerm,
      practicalWork: resultsTable.practicalWork,
      totalObtained: resultsTable.totalObtained,
      percentage: resultsTable.percentage,
      grade: resultsTable.grade,
      gradePoint: resultsTable.gradePoint,
      status: resultsTable.status,
      isSupplementary: resultsTable.isSupplementary,
      courseCode: coursesTable.code,
      courseTitle: coursesTable.title,
      creditHours: coursesTable.creditHours,
      courseSession: coursesTable.session,
      courseSemester: coursesTable.semester,
      isCore: coursesTable.isCore,
    })
    .from(resultsTable)
    .innerJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
    .innerJoin(coursesTable, eq(resultsTable.courseId, coursesTable.id))
    .where(eq(resultsTable.studentId, student.id))
    .orderBy(coursesTable.session, coursesTable.semester, studentsTable.rollNo);

  const deptRow = resultRows.length > 0
    ? await db.select({ name: departmentsTable.name }).from(coursesTable)
        .innerJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
        .where(eq(coursesTable.id, resultRows[0]?.courseId ?? 0)).limit(1)
    : [];

  const coreResults = resultRows.filter((r) => r.isCore !== false && !r.isSupplementary);
  const cgpa = computeGPA(coreResults.map((r) => ({
    gradePoint: r.gradePoint,
    creditHours: r.creditHours,
    status: r.status,
  })));

  const passCount = resultRows.filter((r) => r.status === "Pass").length;
  const failCount = resultRows.filter((r) => r.status === "Fail").length;
  const totalCredits = coreResults.reduce((s, r) => s + r.creditHours, 0);

  // Compute per-semester GPA grouped by courseSession → courseSemester
  type RR = (typeof resultRows)[0];
  const semGpaMap: Record<string, Record<string, number>> = {};
  const grouped: Record<string, Record<string, RR[]>> = {};
  for (const r of resultRows) {
    const sess = r.courseSession || "Unknown Session";
    const sem = r.courseSemester || "Unknown Semester";
    if (!grouped[sess]) grouped[sess] = {};
    if (!grouped[sess][sem]) grouped[sess][sem] = [];
    grouped[sess][sem].push(r);
  }
  for (const [sess, sems] of Object.entries(grouped)) {
    semGpaMap[sess] = {};
    for (const [sem, rows] of Object.entries(sems)) {
      const coreRows = rows.filter((r) => r.isCore !== false && !r.isSupplementary);
      semGpaMap[sess][sem] = computeGPA(coreRows.map((r) => ({ gradePoint: r.gradePoint, creditHours: r.creditHours, status: r.status })));
    }
  }

  res.json({
    student: {
      rollNo: student.rollNo,
      name: student.name,
      fatherName: student.fatherName,
      cnic: decryptField(student.cnic),
      session: student.session,
      departmentName: deptRow[0]?.name ?? null,
    },
    results: resultRows.map((r) => ({ ...r, cnic: decryptField(r.cnic) })),
    cgpa,
    totalCredits,
    passCount,
    failCount,
    semesterGpas: semGpaMap,
  });
});

router.get("/results/transcript/:rollNo", async (req: Request, res: Response) => {
  // Allow unauthenticated access for students viewing their own transcript via the public landing page
  // But require authentication for admins/professors downloading transcripts from the admin panel
  const rollNo = req.params.rollNo as string;
  const session = req.query.session as string | undefined;
  const deptIdParam = req.query.departmentId as string | undefined;
  const departmentId = deptIdParam ? parseInt(deptIdParam) : undefined;

  // Check if user is authenticated
  const isAuthenticated = req.isAuthenticated();
  const user = req.user as { id: number; role: string; departmentId?: number } | undefined;

  // If not authenticated, only allow access if requesting own transcript (no departmentId in query)
  // This allows students to view their transcript on the landing page without logging into admin panel
  if (!isAuthenticated) {
    // Unauthenticated users can only access transcripts without departmentId filter
    // This is for the public student result page
    if (departmentId) {
      res.status(403).json({ error: "Authentication required to download transcripts with department filter" });
      return;
    }
  } else {
    // Authenticated users (admin/professor) can only access transcripts for their authorized departments
    if (user?.role === "professor" && user?.departmentId && departmentId !== user.departmentId) {
      res.status(403).json({ error: "Forbidden: Can only access transcripts for your own department" });
      return;
    }
  }

  const conditions: ReturnType<typeof eq>[] = [eq(studentsTable.rollNo, rollNo)];
  if (session) conditions.push(eq(studentsTable.session, session));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (departmentId && !isNaN(departmentId)) conditions.push(eq(studentsTable.departmentId, departmentId as any));

  const studentRows = await db.select().from(studentsTable).where(and(...conditions)).limit(1);
  if (!studentRows.length) { res.status(404).json({ error: "Student not found" }); return; }
  const student = { ...studentRows[0], cnic: decryptField(studentRows[0].cnic) };

  const resultRows = await db
    .select({
      id: resultsTable.id,
      percentage: resultsTable.percentage,
      grade: resultsTable.grade,
      gradePoint: resultsTable.gradePoint,
      status: resultsTable.status,
      totalObtained: resultsTable.totalObtained,
      internalMarks: resultsTable.internalMarks,
      midTerm: resultsTable.midTerm,
      finalTerm: resultsTable.finalTerm,
      practicalWork: resultsTable.practicalWork,
      courseCode: coursesTable.code,
      courseTitle: coursesTable.title,
      creditHours: coursesTable.creditHours,
      creditHoursRaw: coursesTable.creditHoursRaw,
      session: coursesTable.session,
      semester: coursesTable.semester,
      departmentName: departmentsTable.name,
      isCore: coursesTable.isCore,
      isSupplementary: resultsTable.isSupplementary,
    })
    .from(resultsTable)
    .innerJoin(coursesTable, eq(resultsTable.courseId, coursesTable.id))
    .innerJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
    .where(eq(resultsTable.studentId, student.id))
    .orderBy(coursesTable.session, coursesTable.semester);

  const coreRows = resultRows.filter((r) => r.isCore !== false);
  const cgpa = computeGPA(coreRows.map((r) => ({ gradePoint: r.gradePoint, creditHours: r.creditHours, status: r.status })));
  const totalCredits = coreRows.reduce((s, r) => s + r.creditHours, 0);
  const passCount = resultRows.filter((r) => r.status === "Pass").length;
  const failCount = resultRows.filter((r) => r.status === "Fail").length;

  // Group by session → semester
  type ResultRow = (typeof resultRows)[0];
  const grouped: Record<string, Record<string, ResultRow[]>> = {};
  for (const r of resultRows) {
    const sess = r.session || "Unknown Session";
    const sem = r.semester || "Unknown Semester";
    if (!grouped[sess]) grouped[sess] = {};
    if (!grouped[sess][sem]) grouped[sess][sem] = [];
    grouped[sess][sem].push(r);
  }

  function semGPA(rows: ResultRow[]): number {
    const core = rows.filter((r) => r.isCore !== false);
    return computeGPA(core.map((r) => ({ gradePoint: r.gradePoint, creditHours: r.creditHours, status: r.status })));
  }
  function semCredits(rows: ResultRow[]): number {
    return rows.filter((r) => r.isCore !== false).reduce((s, r) => s + r.creditHours, 0);
  }
  function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function gradeColor(pct: number): string {
    if (pct >= 80) return "#15803d";
    if (pct >= 60) return "#b45309";
    return "#dc2626";
  }
  const cgpaColor = cgpa >= 3 ? "#15803d" : cgpa >= 2 ? "#b45309" : "#dc2626";

  const tableRows = (rows: ResultRow[]) =>
    rows
      .map(
        (r) => `
      <tr>
        <td class="left code">${esc(r.courseCode ?? "")}</td>
        <td class="left">${esc(r.courseTitle ?? "")}${(r.isSupplementary || r.status === "Fail") ? ' <span class="supplementary">*</span>' : ""}${r.isCore === false ? ' <span class="ordinary">(Ord)</span>' : ""}</td>
        <td>${r.internalMarks}</td>
        <td>${r.midTerm}</td>
        <td>${r.finalTerm}</td>
        <td>${r.practicalWork || "—"}</td>
        <td><strong>${r.totalObtained}</strong></td>
        <td style="color:${gradeColor(r.percentage)}">${r.percentage.toFixed(1)}%</td>
        <td style="color:${gradeColor(r.percentage)}"><strong>${esc(r.grade)}</strong></td>
        <td>${r.gradePoint.toFixed(2)}</td>
        <td>${esc(r.creditHoursRaw ?? String(r.creditHours))}</td>
        <td class="${r.status === "Pass" ? "pass" : "fail"}">${r.status}</td>
      </tr>`,
      )
      .join("");

  const semesterBlocks = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sess, sems]) => {
      const semHtml = Object.entries(sems)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sem, rows]) => {
          const gpa = semGPA(rows);
          const cr = semCredits(rows);
          return `
        <div class="sem-label">${esc(sem)}</div>
        <div class="table-wrap"><table>
          <thead>
            <tr>
              <th class="left">Code</th>
              <th class="left">Subject</th>
              <th>Internal</th><th>Mid</th><th>Final</th><th>Practical</th>
              <th>Total</th><th>%</th><th>Grade</th><th>GP</th><th>Cr.Hr</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows(rows)}
            <tr class="sem-summary">
              <td colspan="9" class="left">Semester GPA</td>
              <td colspan="2">${cr} cr</td>
              <td style="color:${gradeColor(gpa * 25)}">${gpa.toFixed(2)}</td>
            </tr>
          </tbody>
        </table></div>`;
        })
        .join("");
      return `<div class="session-header">Session: ${esc(sess)}</div>${semHtml}`;
    })
    .join("");

  const logoHtml = LOGO_DATA_URI
    ? `<img src="${LOGO_DATA_URI}" alt="GGC Logo" style="width:80px;height:80px;object-fit:contain;flex-shrink:0;">`
    : `<div style="width:80px;height:80px;border-radius:50%;background:#1e1b4b;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:18pt;flex-shrink:0;">GGC</div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transcript — ${esc(student.rollNo)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#000;background:#fff;padding:24px;max-width:980px;margin:0 auto}
.print-btn{text-align:right;margin-bottom:14px}
.print-btn button{background:#1e1b4b;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-size:10pt;cursor:pointer;letter-spacing:.4px}
.print-btn button:hover{background:#2d2a6e}

/* ── Header ── */
.header{border-bottom:4px double #1e1b4b;padding-bottom:14px;margin-bottom:18px}
.header-inner{display:flex;align-items:center;gap:18px}
.header-text{flex:1;text-align:center}
.header-spacer{width:80px;flex-shrink:0}
.college-name{font-size:18pt;font-weight:bold;letter-spacing:.5px;text-transform:uppercase;color:#1e1b4b;line-height:1.15}
.college-sub{font-size:9.5pt;color:#555;margin-top:4px;letter-spacing:.2px}
.college-tagline{font-size:8pt;color:#777;margin-top:2px;font-style:italic}
.transcript-badge{display:inline-block;margin-top:10px;background:#1e1b4b;color:#fff;font-size:10pt;font-weight:bold;letter-spacing:3px;text-transform:uppercase;padding:4px 22px;border-radius:2px}

/* ── Student Info ── */
.info{display:grid;grid-template-columns:1fr 1fr;gap:5px 30px;border:1.5px solid #1e1b4b;border-radius:4px;padding:12px 16px;margin-bottom:16px;font-size:10pt;background:#f8f8ff}
.info-row{display:flex;gap:6px;align-items:baseline}
.info-label{font-weight:bold;min-width:120px;flex-shrink:0;color:#1e1b4b;font-size:9pt;text-transform:uppercase;letter-spacing:.3px}

/* ── Tables ── */
.session-header{font-size:11pt;font-weight:bold;background:#1e1b4b;color:#fff;padding:6px 14px;margin-top:18px;border-radius:3px 3px 0 0;letter-spacing:.5px}
.sem-label{font-size:9.5pt;font-weight:bold;background:#e8eaf6;color:#1e1b4b;padding:4px 14px;border-bottom:1px solid #c5cae9;border-top:1px solid #c5cae9;margin-top:6px;letter-spacing:.3px}
table{width:100%;border-collapse:collapse;margin-top:0;font-size:8.5pt}
th{background:#1e1b4b;color:#fff;border:1px solid #3d3a6b;padding:5px 5px;text-align:center;font-size:8pt;white-space:normal;word-break:break-word}
th.left{text-align:left}
td{border:1px solid #ddd;padding:3px 5px;text-align:center;white-space:nowrap}
td.left{text-align:left;white-space:normal}
td.code{font-family:monospace;font-size:8pt;font-weight:bold}
tr:nth-child(even) td{background:#fafafa}
.pass{color:#15803d;font-weight:bold}.fail{color:#dc2626;font-weight:bold}
.ordinary{color:#888;font-style:italic;font-size:7.5pt}
.supplementary{color:#ea580c;font-weight:bold;font-size:9pt}
.sem-summary td{background:#e8eaf6!important;font-weight:bold;color:#1e1b4b;border-top:2px solid #1e1b4b}

/* ── Summary Box ── */
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:2px solid #1e1b4b;border-radius:4px;overflow:hidden;margin-top:20px}
.sum-item{text-align:center;padding:14px 8px;border-right:1px solid #c5cae9}
.sum-item:last-child{border-right:none}
.sum-label{font-size:7.5pt;color:#555;text-transform:uppercase;letter-spacing:.8px;font-weight:bold}
.sum-val{font-size:20pt;font-weight:bold;margin-top:4px;line-height:1}
.sum-item:first-child{background:#1e1b4b}
.sum-item:first-child .sum-label{color:#a5b4fc}
.sum-item:first-child .sum-val{color:#fff}

/* ── Footer ── */
.footer{display:flex;justify-content:space-between;align-items:center;font-size:8pt;color:#777;margin-top:18px;border-top:1.5px solid #1e1b4b;padding-top:10px}
.footer-sig{text-align:center;border-top:1px solid #999;padding-top:4px;min-width:160px;font-size:8pt;color:#555}

.table-wrap{overflow-x:visible}

@media screen and (max-width:600px){
  .table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  body{padding:10px;font-size:9.5pt}
  .header-inner{flex-direction:column;align-items:center;text-align:center;gap:10px}
  .header-spacer{display:none}
  .college-name{font-size:13pt}
  .college-sub,.college-tagline{font-size:8.5pt}
  .transcript-badge{font-size:8.5pt;padding:3px 14px;letter-spacing:1.5px}
  .info{grid-template-columns:1fr;gap:4px 0}
  .info-label{min-width:90px;font-size:8.5pt}
  .session-header{font-size:9.5pt;padding:5px 10px}
  .sem-label{padding:4px 10px}
  table{font-size:7.5pt}
  th,td{padding:3px 4px}
  .summary{grid-template-columns:repeat(2,1fr)}
  .sum-item:nth-child(2){border-right:none}
  .sum-item:nth-child(3){border-top:1px solid #c5cae9}
  .sum-item:nth-child(4){border-top:1px solid #c5cae9;border-right:none}
  .sum-val{font-size:16pt}
  .footer{flex-direction:column;gap:8px;text-align:center;align-items:center}
  .footer-sig{margin:0 auto}
  .print-btn button{width:100%;padding:10px}
}

@media print{
  .print-btn{display:none}
  body{padding:8px}
  @page{margin:1.5cm}
  table{font-size:8pt}
  .session-header{border-radius:0}
}
</style>
</head>
<body>
<div class="print-btn"><button onclick="window.print()">🖨&nbsp; Print / Save as PDF</button></div>

<div class="header">
  <div class="header-inner">
    ${logoHtml}
    <div class="header-text">
      <div class="college-name">Government Graduate College Jhang</div>
      <div class="college-sub">Jhang, Punjab, Pakistan</div>
      <div class="college-tagline">Affiliated with Government College University Faisalabad</div>
      <div class="transcript-badge">Official Academic Transcript</div>
    </div>
    <div class="header-spacer"></div>
  </div>
</div>

<div class="info">
  <div class="info-row"><span class="info-label">Student Name:</span><span><strong>${esc(student.name)}</strong></span></div>
  <div class="info-row"><span class="info-label">Roll Number:</span><span><strong>${esc(student.rollNo)}</strong></span></div>
  <div class="info-row"><span class="info-label">Father's Name:</span><span>${esc(student.fatherName)}</span></div>
  <div class="info-row"><span class="info-label">CNIC:</span><span>${esc(student.cnic || "—")}</span></div>
  <div class="info-row"><span class="info-label">Admission Session:</span><span>${esc(student.session)}</span></div>
  <div class="info-row"><span class="info-label">Department:</span><span>${esc(resultRows[0]?.departmentName ?? "—")}</span></div>
</div>

${semesterBlocks}

<div class="summary">
  <div class="sum-item">
    <div class="sum-label">CGPA</div>
    <div class="sum-val" style="color:${cgpaColor === "#15803d" ? "#86efac" : cgpaColor === "#b45309" ? "#fcd34d" : "#fca5a5"}">${cgpa.toFixed(2)}</div>
  </div>
  <div class="sum-item">
    <div class="sum-label">Core Credits</div>
    <div class="sum-val">${totalCredits}</div>
  </div>
  <div class="sum-item">
    <div class="sum-label">Passed</div>
    <div class="sum-val" style="color:#15803d">${passCount}</div>
  </div>
  <div class="sum-item">
    <div class="sum-label">Failed</div>
    <div class="sum-val" style="color:${failCount > 0 ? "#dc2626" : "#000"}">${failCount}</div>
  </div>
</div>

<div class="footer">
  <span>Generated: ${new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })}</span>
  <div class="footer-sig">Controller of Examinations</div>
  <span>This is a computer-generated transcript.</span>
</div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src-attr 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");
  res.send(html);
});

export default router;
