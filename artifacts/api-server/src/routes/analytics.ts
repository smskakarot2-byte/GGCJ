import { Router, type IRouter, type Request, type Response } from "express";
import { db, resultsTable, studentsTable, coursesTable, departmentsTable, systemUsersTable } from "@workspace/db";
import { eq, sql, avg, count, countDistinct, and } from "drizzle-orm";
import { computeGPA } from "../lib/grading";

const router: IRouter = Router();

// Resolve the department id for a professor (null = not a professor or no dept)
async function getProfessorDeptId(req: Request): Promise<number | null> {
  if (!req.user || (req.user as { role: string }).role !== "professor") return null;
  const [prof] = await db
    .select({ departmentId: systemUsersTable.departmentId })
    .from(systemUsersTable)
    .where(eq(systemUsersTable.id, (req.user as { id: number }).id));
  return prof?.departmentId ?? null;
}

function buildCourseConditions(session?: string, semester?: string, deptId?: number | null) {
  const conditions = [];
  if (session) conditions.push(eq(coursesTable.session, session));
  if (semester) conditions.push(eq(coursesTable.semester, semester));
  if (deptId != null) conditions.push(eq(coursesTable.departmentId, deptId));
  return conditions;
}

// GET /analytics/overview
router.get("/analytics/overview", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const session = req.query.session as string | undefined;
  const semester = req.query.semester as string | undefined;
  const profDeptId = await getProfessorDeptId(req);
  const courseConditions = buildCourseConditions(session, semester, profDeptId);

  // Always join through courses when any filter is active
  if (courseConditions.length > 0) {
    const [courseCount] = await db
      .select({ n: countDistinct(coursesTable.id) })
      .from(coursesTable)
      .where(and(...courseConditions));

    const filteredResults = await db
      .select({ studentId: resultsTable.studentId, percentage: resultsTable.percentage, status: resultsTable.status })
      .from(resultsTable)
      .innerJoin(coursesTable, eq(resultsTable.courseId, coursesTable.id))
      .where(and(...courseConditions));

    const total = filteredResults.length;
    const passed = filteredResults.filter((r) => r.status === "Pass").length;
    const studentIds = new Set(filteredResults.map((r) => r.studentId));
    const avgPct = total > 0
      ? filteredResults.reduce((s, r) => s + parseFloat(String(r.percentage ?? "0")), 0) / total
      : 0;

    // Dept count: for professors just 1; for admins re-derive from filtered data
    const deptCountVal = profDeptId != null ? 1 : (await db.select({ n: count() }).from(departmentsTable))[0]?.n ?? 0;
    const userCountVal = profDeptId != null ? 0 : (await db.select({ n: count() }).from(systemUsersTable))[0]?.n ?? 0;

    return res.json({
      departmentCount: Number(deptCountVal),
      courseCount: Number(courseCount?.n ?? 0),
      studentCount: studentIds.size,
      userCount: Number(userCountVal),
      avgPercentage: Math.round(avgPct * 100) / 100,
      passRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0,
    });
  }

  // Admin with no filters — full aggregate
  const [deptCount] = await db.select({ n: count() }).from(departmentsTable);
  const [userCount] = await db.select({ n: count() }).from(systemUsersTable);
  const [courseCount] = await db.select({ n: count() }).from(coursesTable);
  const [studentCount] = await db.select({ n: countDistinct(resultsTable.studentId) }).from(resultsTable);
  const [avgPct] = await db.select({ v: avg(resultsTable.percentage) }).from(resultsTable);
  const allResults = await db.select({ status: resultsTable.status }).from(resultsTable);
  const total = allResults.length;
  const passed = allResults.filter((r) => r.status === "Pass").length;

  res.json({
    departmentCount: deptCount?.n ?? 0,
    courseCount: courseCount?.n ?? 0,
    studentCount: studentCount?.n ?? 0,
    userCount: userCount?.n ?? 0,
    avgPercentage: Math.round(parseFloat(String(avgPct?.v ?? "0")) * 100) / 100,
    passRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0,
  });
});

// GET /analytics/departments
router.get("/analytics/departments", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const session = req.query.session as string | undefined;
  const semester = req.query.semester as string | undefined;
  const profDeptId = await getProfessorDeptId(req);
  const courseConditions = buildCourseConditions(session, semester, profDeptId);

  const baseCondition = courseConditions.length > 0 ? and(...courseConditions) : undefined;

  // Base query — scoped to professor's dept if applicable
  const deptCondition = profDeptId != null ? eq(departmentsTable.id, profDeptId) : undefined;

  const rows = await db
    .select({
      departmentId: departmentsTable.id,
      departmentName: departmentsTable.name,
      avgPercentage: avg(resultsTable.percentage),
      studentCount: countDistinct(resultsTable.studentId),
      courseCount: countDistinct(coursesTable.id),
    })
    .from(departmentsTable)
    .leftJoin(coursesTable, and(
      eq(coursesTable.departmentId, departmentsTable.id),
      ...(courseConditions.length > 0 ? courseConditions : [])
    ))
    .leftJoin(resultsTable, eq(resultsTable.courseId, coursesTable.id))
    .where(deptCondition)
    .groupBy(departmentsTable.id, departmentsTable.name)
    .orderBy(departmentsTable.name);

  // Compute pass rates
  const passQuery = db
    .select({ departmentId: departmentsTable.id, status: resultsTable.status })
    .from(resultsTable)
    .innerJoin(coursesTable, eq(resultsTable.courseId, coursesTable.id))
    .innerJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
    .$dynamic();

  const passConditions = [];
  if (baseCondition) passConditions.push(baseCondition);
  if (deptCondition) passConditions.push(deptCondition);

  const deptResults = passConditions.length > 0
    ? await passQuery.where(and(...passConditions))
    : await passQuery;

  const passMap: Record<number, { total: number; pass: number }> = {};
  for (const r of deptResults) {
    if (!passMap[r.departmentId]) passMap[r.departmentId] = { total: 0, pass: 0 };
    passMap[r.departmentId].total++;
    if (r.status === "Pass") passMap[r.departmentId].pass++;
  }

  const result = rows.map((r) => {
    const pm = passMap[r.departmentId] ?? { total: 0, pass: 0 };
    return {
      departmentId: r.departmentId,
      departmentName: r.departmentName,
      studentCount: Number(r.studentCount ?? 0),
      courseCount: Number(r.courseCount ?? 0),
      avgPercentage: Math.round(parseFloat(String(r.avgPercentage ?? "0")) * 100) / 100,
      passRate: pm.total > 0 ? Math.round((pm.pass / pm.total) * 10000) / 100 : 0,
    };
  });

  res.json(result);
});

// GET /analytics/sessions
router.get("/analytics/sessions", async (req: Request, res: Response) => {
  const rows = await db
    .selectDistinct({ session: coursesTable.session })
    .from(coursesTable)
    .where(sql`${coursesTable.session} != ''`)
    .orderBy(coursesTable.session);
  res.json(rows.map((r) => r.session));
});

// GET /analytics/sessions-stats
router.get("/analytics/sessions-stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const profDeptId = await getProfessorDeptId(req);
  const deptCondition = profDeptId != null ? eq(coursesTable.departmentId, profDeptId) : undefined;

  const baseWhere = deptCondition
    ? and(sql`${coursesTable.session} != ''`, deptCondition)
    : sql`${coursesTable.session} != ''`;

  const rows = await db
    .select({
      session: coursesTable.session,
      courseCount: countDistinct(coursesTable.id),
      studentCount: countDistinct(resultsTable.studentId),
      avgPercentage: avg(resultsTable.percentage),
    })
    .from(coursesTable)
    .leftJoin(resultsTable, eq(resultsTable.courseId, coursesTable.id))
    .where(baseWhere)
    .groupBy(coursesTable.session)
    .orderBy(coursesTable.session);

  const passQuery = db
    .select({ session: coursesTable.session, status: resultsTable.status })
    .from(resultsTable)
    .innerJoin(coursesTable, eq(resultsTable.courseId, coursesTable.id))
    .$dynamic();

  const sessionResults = deptCondition
    ? await passQuery.where(and(sql`${coursesTable.session} != ''`, deptCondition))
    : await passQuery.where(sql`${coursesTable.session} != ''`);

  const passMap: Record<string, { total: number; pass: number }> = {};
  for (const r of sessionResults) {
    if (!r.session) continue;
    if (!passMap[r.session]) passMap[r.session] = { total: 0, pass: 0 };
    passMap[r.session].total++;
    if (r.status === "Pass") passMap[r.session].pass++;
  }

  res.json(rows.map((r) => {
    const pm = passMap[r.session] ?? { total: 0, pass: 0 };
    return {
      session: r.session,
      courseCount: Number(r.courseCount ?? 0),
      studentCount: Number(r.studentCount ?? 0),
      avgPercentage: Math.round(parseFloat(String(r.avgPercentage ?? "0")) * 100) / 100,
      passRate: pm.total > 0 ? Math.round((pm.pass / pm.total) * 10000) / 100 : 0,
    };
  }));
});

// GET /analytics/semester-stats?session=
router.get("/analytics/semester-stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const session = req.query.session as string | undefined;
  const profDeptId = await getProfessorDeptId(req);

  const conditions: ReturnType<typeof eq>[] = [];
  if (session) conditions.push(eq(coursesTable.session, session));
  if (profDeptId != null) conditions.push(eq(coursesTable.departmentId, profDeptId));

  const whereCondition = conditions.length > 0
    ? and(sql`${coursesTable.semester} != ''`, ...conditions)
    : sql`${coursesTable.semester} != ''`;

  const rows = await db
    .select({
      semester: coursesTable.semester,
      courseCount: countDistinct(coursesTable.id),
      studentCount: countDistinct(resultsTable.studentId),
      avgPercentage: avg(resultsTable.percentage),
    })
    .from(coursesTable)
    .leftJoin(resultsTable, eq(resultsTable.courseId, coursesTable.id))
    .where(whereCondition)
    .groupBy(coursesTable.semester)
    .orderBy(coursesTable.semester);

  const passQuery = db
    .select({ semester: coursesTable.semester, status: resultsTable.status })
    .from(resultsTable)
    .innerJoin(coursesTable, eq(resultsTable.courseId, coursesTable.id))
    .$dynamic();

  const passConditions = [];
  if (session) passConditions.push(eq(coursesTable.session, session));
  if (profDeptId != null) passConditions.push(eq(coursesTable.departmentId, profDeptId));

  const semesterResults = passConditions.length > 0
    ? await passQuery.where(and(...passConditions))
    : await passQuery;

  const passMap: Record<string, { total: number; pass: number }> = {};
  for (const r of semesterResults) {
    if (!r.semester) continue;
    if (!passMap[r.semester]) passMap[r.semester] = { total: 0, pass: 0 };
    passMap[r.semester].total++;
    if (r.status === "Pass") passMap[r.semester].pass++;
  }

  res.json(rows.map((r) => {
    const pm = passMap[r.semester] ?? { total: 0, pass: 0 };
    return {
      semester: r.semester,
      courseCount: Number(r.courseCount ?? 0),
      studentCount: Number(r.studentCount ?? 0),
      avgPercentage: Math.round(parseFloat(String(r.avgPercentage ?? "0")) * 100) / 100,
      passRate: pm.total > 0 ? Math.round((pm.pass / pm.total) * 10000) / 100 : 0,
    };
  }));
});

// GET /analytics/toppers?session=&departmentId=&limit=
router.get("/analytics/toppers", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const session = req.query.session as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

  // Professors are locked to their own department
  const profDeptId = await getProfessorDeptId(req);
  const requestedDeptId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
  const departmentId = profDeptId != null ? profDeptId : requestedDeptId;

  let query = db
    .select({
      studentId: studentsTable.id,
      rollNo: studentsTable.rollNo,
      name: studentsTable.name,
      session: studentsTable.session,
      departmentName: departmentsTable.name,
      percentage: resultsTable.percentage,
      gradePoint: resultsTable.gradePoint,
      creditHours: coursesTable.creditHours,
      status: resultsTable.status,
      isSupplementary: resultsTable.isSupplementary,
      isCore: coursesTable.isCore,
    })
    .from(resultsTable)
    .innerJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
    .innerJoin(coursesTable, eq(resultsTable.courseId, coursesTable.id))
    .innerJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
    .$dynamic();

  const conditions = [];
  if (session) conditions.push(eq(studentsTable.session, session));
  if (departmentId) conditions.push(eq(departmentsTable.id, departmentId));
  if (conditions.length > 0) query = query.where(and(...conditions));

  const rows = await query;

  const studentMap: Record<number, {
    rollNo: string; name: string; session: string; departmentName: string | null;
    results: Array<{ gradePoint: number; creditHours: number; status: string; percentage: number; isSupplementary: boolean; isCore: boolean }>;
    hasNonSupplementaryResult: boolean;
  }> = {};

  for (const r of rows) {
    if (!studentMap[r.studentId]) {
      studentMap[r.studentId] = { rollNo: r.rollNo, name: r.name, session: r.session, departmentName: r.departmentName, results: [], hasNonSupplementaryResult: false };
    }
    studentMap[r.studentId].results.push({
      gradePoint: r.gradePoint, creditHours: r.creditHours, status: r.status, percentage: r.percentage,
      isSupplementary: r.isSupplementary ?? false, isCore: r.isCore ?? true,
    });
    if (!r.isSupplementary) studentMap[r.studentId].hasNonSupplementaryResult = true;
  }

  const toppers = Object.values(studentMap)
    // Exclude students who only appear as supplementary (no regular enrollment)
    .filter((s) => s.hasNonSupplementaryResult)
    // Use only non-supplementary results for pass/fail check
    .filter((s) => s.results.filter((r) => !r.isSupplementary).every((r) => r.status === "Pass"))
    .map((s) => {
      // Both GPA and avgPercentage use the same pool: core + non-supplementary only
      const coreResults = s.results.filter((r) => !r.isSupplementary && r.isCore);
      return {
        rollNo: s.rollNo,
        name: s.name,
        session: s.session,
        departmentName: s.departmentName,
        avgPercentage: Math.round((coreResults.reduce((sum, r) => sum + r.percentage, 0) / (coreResults.length || 1)) * 100) / 100,
        cgpa: computeGPA(coreResults),
        rank: 0,
      };
    });

  // Sort by CGPA (primary academic metric), then avgPercentage as tiebreaker
  toppers.sort((a, b) => b.cgpa - a.cgpa || b.avgPercentage - a.avgPercentage);
  toppers.forEach((t, i) => { t.rank = i + 1; });

  res.json(toppers.slice(0, limit));
});

export default router;
