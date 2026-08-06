import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { encryptField } from "../lib/crypto";
import { db, coursesTable, studentsTable, resultsTable, departmentsTable, systemUsersTable } from "@workspace/db";
import { eq, count, avg, countDistinct, sql, and } from "drizzle-orm";
import { parseAwardSheet } from "../lib/pdfParser";
import { parseCreditHours } from "../lib/grading";
import { computeGrade } from "../lib/grading";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter(_req, file, cb) {
    const validMime = file.mimetype === "application/pdf";
    const validExt = file.originalname.toLowerCase().endsWith(".pdf");
    if (!validMime || !validExt) {
      cb(new Error("Only PDF files are accepted"));
      return;
    }
    cb(null, true);
  },
});

// GET /courses
router.get("/courses", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  // Professors are restricted to their own department — always do a fresh DB lookup
  let departmentId: number | undefined;
  if (req.user.role === "professor") {
    const [userRow] = await db
      .select({ departmentId: systemUsersTable.departmentId })
      .from(systemUsersTable)
      .where(eq(systemUsersTable.id, req.user.id))
      .limit(1);
    const deptId = userRow?.departmentId ?? null;
    if (deptId === null) {
      // Professor has no department assigned — return empty list
      res.json([]);
      return;
    }
    departmentId = deptId;
  } else {
    departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
  }

  const rows = await db
    .select({
      id: coursesTable.id,
      code: coursesTable.code,
      title: coursesTable.title,
      creditHoursRaw: coursesTable.creditHoursRaw,
      creditHours: coursesTable.creditHours,
      session: coursesTable.session,
      semester: coursesTable.semester,
      departmentId: coursesTable.departmentId,
      departmentName: departmentsTable.name,
      maxMarks: coursesTable.maxMarks,
      isCore: coursesTable.isCore,
      studentCount: countDistinct(resultsTable.studentId),
      avgPercentage: avg(resultsTable.percentage),
      createdAt: coursesTable.createdAt,
    })
    .from(coursesTable)
    .leftJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
    .leftJoin(resultsTable, eq(resultsTable.courseId, coursesTable.id))
    .where(departmentId ? eq(coursesTable.departmentId, departmentId) : sql`1=1`)
    .groupBy(coursesTable.id, departmentsTable.name)
    .orderBy(coursesTable.createdAt);

  // Compute passCount
  const passData = await db
    .select({ courseId: resultsTable.courseId, status: resultsTable.status })
    .from(resultsTable);
  const passMap: Record<number, { total: number; pass: number }> = {};
  for (const r of passData) {
    if (!r.courseId) continue;
    if (!passMap[r.courseId]) passMap[r.courseId] = { total: 0, pass: 0 };
    passMap[r.courseId].total++;
    if (r.status === "Pass") passMap[r.courseId].pass++;
  }

  const result = rows.map((r) => ({
    ...r,
    studentCount: Number(r.studentCount ?? 0),
    avgPercentage: Math.round(parseFloat(String(r.avgPercentage ?? "0")) * 100) / 100,
    passCount: passMap[r.id]?.pass ?? 0,
  }));

  res.json(result);
});

// GET /courses/:id
router.get("/courses/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({
      id: coursesTable.id,
      code: coursesTable.code,
      title: coursesTable.title,
      creditHoursRaw: coursesTable.creditHoursRaw,
      creditHours: coursesTable.creditHours,
      session: coursesTable.session,
      semester: coursesTable.semester,
      departmentId: coursesTable.departmentId,
      departmentName: departmentsTable.name,
      maxMarks: coursesTable.maxMarks,
      isCore: coursesTable.isCore,
      studentCount: countDistinct(resultsTable.studentId),
      avgPercentage: avg(resultsTable.percentage),
      createdAt: coursesTable.createdAt,
    })
    .from(coursesTable)
    .leftJoin(departmentsTable, eq(coursesTable.departmentId, departmentsTable.id))
    .leftJoin(resultsTable, eq(resultsTable.courseId, coursesTable.id))
    .where(eq(coursesTable.id, id))
    .groupBy(coursesTable.id, departmentsTable.name);

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  // Compute actual pass/fail counts for this course
  const resultRows = await db
    .select({ status: resultsTable.status })
    .from(resultsTable)
    .where(eq(resultsTable.courseId, id));

  const passCount = resultRows.filter((r) => r.status === "Pass").length;

  res.json({ ...row, studentCount: Number(row.studentCount ?? 0), avgPercentage: Math.round(parseFloat(String(row.avgPercentage ?? "0")) * 100) / 100, passCount });
});

// DELETE /courses/:id
router.delete("/courses/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.status(204).send();
});

// PATCH /courses/:id — update isCore flag
router.patch("/courses/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { isCore } = req.body;
  if (typeof isCore !== "boolean") { res.status(400).json({ error: "isCore (boolean) required" }); return; }
  const [updated] = await db.update(coursesTable).set({ isCore }).where(eq(coursesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Course not found" }); return; }
  res.json({ id: updated.id, isCore: updated.isCore });
});

// POST /courses/upload
router.post("/courses/upload", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  // Professors are locked to their own department; admins pick freely
  let departmentId: number | null = null;
  if (req.user.role === "professor") {
    departmentId = req.user.departmentId ?? null;
    if (!departmentId) { res.status(403).json({ error: "Your account has no department assigned" }); return; }
  } else {
    departmentId = req.body.departmentId ? parseInt(req.body.departmentId) : null;
    if (!departmentId || isNaN(departmentId)) { res.status(400).json({ error: "departmentId required" }); return; }
  }

  let parsed;
  try {
    parsed = await parseAwardSheet(req.file.buffer);
  } catch (err) {
    req.log.error({ err }, "PDF parse error");
    res.status(422).json({ error: "Failed to parse PDF" });
    return;
  }

  const { header, students } = parsed;

  // Validate award sheet format
  if (!header.courseCode || !/[A-Za-z]{2,6}-?[A-Za-z0-9]{1,6}/.test(header.courseCode)) {
    res.status(422).json({ error: "Invalid file: Course Code not found. Please upload a valid GGC award sheet PDF." });
    return;
  }
  if (!header.courseTitle) {
    res.status(422).json({ error: "Invalid file: Course Title not found. Please upload a valid GGC award sheet PDF." });
    return;
  }
  if (students.length === 0) {
    res.status(422).json({ error: "Invalid file: No student records found. Please upload a valid GGC award sheet PDF." });
    return;
  }

  // Allow form-supplied session/semester to override what the PDF contains
  const sessionOverride = (req.body.session as string | undefined)?.trim();
  const semesterOverride = (req.body.semester as string | undefined)?.trim();

  // Upsert course
  const creditHoursRaw = header.creditHoursRaw ?? "3(2-1)";
  const creditHours = parseCreditHours(creditHoursRaw);

  const courseCode = header.courseCode ?? "UNKNOWN";
  const courseSession = sessionOverride || header.session || "";
  const courseSemester = semesterOverride || header.semester || "";

  // Check for duplicate: same code + session + semester + department
  const [existing] = await db
    .select({ id: coursesTable.id })
    .from(coursesTable)
    .where(
      and(
        eq(coursesTable.code, courseCode),
        eq(coursesTable.session, courseSession),
        eq(coursesTable.semester, courseSemester),
        eq(coursesTable.departmentId, departmentId),
      ),
    )
    .limit(1);

  const subjectIsCore = req.body.isCore !== "false";

  let courseId: number;
  let isNewCourse = false;

  if (existing) {
    // Course already exists — attempt to merge new students in
    courseId = existing.id;

    // Get rolls already in this course
    const existingResults = await db
      .select({ rollNo: studentsTable.rollNo })
      .from(resultsTable)
      .innerJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
      .where(eq(resultsTable.courseId, courseId));

    const existingRolls = new Set(existingResults.map((r) => r.rollNo));
    const newStudents = students.filter((s) => !existingRolls.has(s.rollNo));

    if (newStudents.length === 0) {
      res.status(200).json({
        merged: false,
        message: `Course "${courseCode}" already uploaded. No new students found in this file.`,
        importedCount: 0,
        passCount: 0,
        failCount: 0,
      });
      return;
    }

    // Merge only new students
    let importedCount = 0, passCount = 0, failCount = 0;
    for (const s of newStudents) {
      try {
        const [student] = await db
          .insert(studentsTable)
          .values({ rollNo: s.rollNo, name: s.name, fatherName: s.fatherName, cnic: encryptField(s.cnic ?? ""), session: s.session || header.session || "", departmentId })
          .onConflictDoUpdate({ target: [studentsTable.rollNo, studentsTable.session, studentsTable.departmentId], set: { name: s.name, fatherName: s.fatherName, cnic: encryptField(s.cnic ?? "") } })
          .returning();
        await db.insert(resultsTable).values({
          studentId: student.id, courseId,
          internalMarks: s.internalMarks, midTerm: s.midTerm, finalTerm: s.finalTerm,
          practicalWork: s.practicalWork, totalObtained: s.totalObtained,
          percentage: s.percentage, grade: s.grade, gradePoint: s.gradePoint,
          status: s.status, isSupplementary: s.isSupplementary,
        }).onConflictDoNothing();
        importedCount++;
        if (s.status === "Pass") passCount++; else failCount++;
      } catch (err) {
        req.log.warn({ err, rollNo: s.rollNo }, "Skipping student during merge");
      }
    }

    res.status(200).json({ merged: true, message: `Merged ${importedCount} new student(s) into existing course "${courseCode}".`, importedCount, passCount, failCount, header });
    return;
  } else {
    isNewCourse = true;
    const [inserted] = await db
      .insert(coursesTable)
      .values({
        code: courseCode,
        title: header.courseTitle ?? req.file.originalname,
        creditHoursRaw,
        creditHours,
        session: courseSession,
        semester: courseSemester,
        departmentId,
        maxMarks: header.maxMarks ?? 60,
        isCore: subjectIsCore,
        uploadedBy: req.user.id,
      })
      .returning();
    courseId = inserted.id;
  }

  let importedCount = 0, passCount = 0, failCount = 0;

  for (const s of students) {
    try {
      // Upsert student
      const [student] = await db
        .insert(studentsTable)
        .values({
          rollNo: s.rollNo,
          name: s.name,
          fatherName: s.fatherName,
          cnic: encryptField(s.cnic ?? ""),
          session: s.session || header.session || "",
          departmentId,
        })
        .onConflictDoUpdate({
          target: [studentsTable.rollNo, studentsTable.session, studentsTable.departmentId],
          set: { name: s.name, fatherName: s.fatherName, cnic: encryptField(s.cnic ?? "") },
        })
        .returning();

      // Insert result
      await db
        .insert(resultsTable)
        .values({
          studentId: student.id,
          courseId,
          internalMarks: s.internalMarks,
          midTerm: s.midTerm,
          finalTerm: s.finalTerm,
          practicalWork: s.practicalWork,
          totalObtained: s.totalObtained,
          percentage: s.percentage,
          grade: s.grade,
          gradePoint: s.gradePoint,
          status: s.status,
          isSupplementary: s.isSupplementary,
        })
        .onConflictDoNothing();

      importedCount++;
      if (s.status === "Pass") passCount++;
      else failCount++;
    } catch (err) {
      req.log.warn({ err, rollNo: s.rollNo }, "Skipping student due to error");
    }
  }

  if (!isNewCourse) {
    res.status(200).json({ merged: false, importedCount, passCount, failCount, header });
    return;
  }

  const [courseRow] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);

  const courseWithStats = {
    ...courseRow,
    departmentName: null,
    studentCount: importedCount,
    avgPercentage: students.length > 0
      ? Math.round(students.reduce((s, r) => s + r.percentage, 0) / students.length * 100) / 100
      : 0,
    passCount,
  };

  res.status(201).json({
    course: courseWithStats,
    importedCount,
    passCount,
    failCount,
    header,
  });
});

// ── Dept-name matching helper ────────────────────────────────────────────────
function normDept(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function matchDept(
  pdfDept: string,
  allDepts: { id: number; name: string }[],
): { id: number; name: string } | null {
  const pn = normDept(pdfDept);
  return (
    allDepts.find((d) => {
      const dn = normDept(d.name);
      return (
        dn === pn ||
        dn.startsWith(pn.slice(0, 5)) ||
        pn.startsWith(dn.slice(0, 5)) ||
        dn.includes(pn) ||
        pn.includes(dn)
      );
    }) ?? null
  );
}

// POST /courses/bulk-upload
router.post("/courses/bulk-upload", upload.array("files", 60), async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) { res.status(400).json({ error: "No files uploaded" }); return; }

  const allDepts = await db.select({ id: departmentsTable.id, name: departmentsTable.name }).from(departmentsTable);

  let professorDeptId: number | null = null;
  let professorDeptName: string | null = null;
  if (req.user.role === "professor") {
    const [prof] = await db
      .select({ departmentId: systemUsersTable.departmentId })
      .from(systemUsersTable)
      .where(eq(systemUsersTable.id, req.user.id));
    if (!prof?.departmentId) {
      res.status(403).json({ error: "No department assigned to your account" });
      return;
    }
    professorDeptId = prof.departmentId;
    professorDeptName = allDepts.find((d) => d.id === professorDeptId)?.name ?? null;
  }

  const bulkIsCore = req.body.isCore !== "false";
  const results: Record<string, unknown>[] = [];

  for (const file of files) {
    const entry: Record<string, unknown> = { filename: file.originalname, success: false };
    try {
      let parsed;
      try {
        parsed = await parseAwardSheet(file.buffer);
      } catch {
        throw new Error("Could not read PDF — file may be encrypted, corrupted, or not a PDF.");
      }

      const { header, students } = parsed;

      // Format validation
      if (!header.courseCode || !/[A-Za-z]{2,6}-?[A-Za-z0-9]{1,6}/.test(header.courseCode)) {
        throw new Error("Invalid format: Course Code not found. This does not appear to be a GGC award sheet.");
      }
      if (!header.courseTitle) {
        throw new Error("Invalid format: Course Title not found. This does not appear to be a GGC award sheet.");
      }
      if (students.length === 0) {
        throw new Error("No student records found in this PDF.");
      }

      // Determine department
      let departmentId: number;
      let departmentName: string;

      if (req.user.role === "professor") {
        departmentId = professorDeptId!;
        departmentName = professorDeptName!;
        // Validate dept match if PDF has dept info
        if (header.department) {
          const pn = normDept(header.department);
          const profN = normDept(professorDeptName!);
          const match =
            pn.includes(profN.slice(0, 5)) ||
            profN.includes(pn.slice(0, 5)) ||
            pn === profN;
          if (!match) {
            throw new Error(
              `Department mismatch: PDF is for "${header.department}" but your department is "${professorDeptName}". This file was rejected.`,
            );
          }
        }
      } else {
        if (!header.department) {
          throw new Error(
            "Department name not found in PDF header. Use single upload to assign department manually.",
          );
        }
        const matched = matchDept(header.department, allDepts);
        if (!matched) {
          throw new Error(
            `No matching department for "${header.department}". Create this department first or use single upload.`,
          );
        }
        departmentId = matched.id;
        departmentName = matched.name;
      }

      const creditHoursRaw = header.creditHoursRaw ?? "3(2-1)";
      const creditHours = parseCreditHours(creditHoursRaw);
      const courseCode = header.courseCode;
      const courseSession = header.session || "";
      const courseSemester = header.semester || "";

      // Duplicate check — merge gracefully if course already exists
      const [existing] = await db
        .select({ id: coursesTable.id })
        .from(coursesTable)
        .where(
          and(
            eq(coursesTable.code, courseCode),
            eq(coursesTable.session, courseSession),
            eq(coursesTable.semester, courseSemester),
            eq(coursesTable.departmentId, departmentId),
          ),
        )
        .limit(1);

      let courseId: number;
      let studentsToImport = students;
      let isMerge = false;

      if (existing) {
        courseId = existing.id;
        isMerge = true;
        const existingResults = await db
          .select({ rollNo: studentsTable.rollNo })
          .from(resultsTable)
          .innerJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
          .where(eq(resultsTable.courseId, courseId));
        const existingRolls = new Set(existingResults.map((r) => r.rollNo));
        studentsToImport = students.filter((s) => !existingRolls.has(s.rollNo));
        if (studentsToImport.length === 0) {
          entry.success = true;
          entry.course = header.courseTitle;
          entry.code = courseCode;
          entry.department = departmentName;
          entry.session = courseSession;
          entry.semester = courseSemester;
          entry.importedCount = 0;
          entry.passCount = 0;
          entry.failCount = 0;
          entry.merged = false;
          entry.mergeNote = "No new students found — already fully imported.";
          results.push(entry);
          continue;
        }
      } else {
        const [inserted] = await db
          .insert(coursesTable)
          .values({
            code: courseCode,
            title: header.courseTitle,
            creditHoursRaw,
            creditHours,
            session: courseSession,
            semester: courseSemester,
            departmentId,
            maxMarks: header.maxMarks ?? 60,
            isCore: bulkIsCore,
            uploadedBy: req.user.id,
          })
          .returning();
        courseId = inserted.id;
      }

      let importedCount = 0, passCount = 0, failCount = 0;
      for (const s of studentsToImport) {
        try {
          const [student] = await db
            .insert(studentsTable)
            .values({
              rollNo: s.rollNo,
              name: s.name,
              fatherName: s.fatherName,
              cnic: encryptField(s.cnic ?? ""),
              session: s.session || header.session || "",
              departmentId,
            })
            .onConflictDoUpdate({
              target: [studentsTable.rollNo, studentsTable.session, studentsTable.departmentId],
              set: { name: s.name, fatherName: s.fatherName, cnic: encryptField(s.cnic ?? "") },
            })
            .returning();
          await db
            .insert(resultsTable)
            .values({
              studentId: student.id,
              courseId,
              internalMarks: s.internalMarks,
              midTerm: s.midTerm,
              finalTerm: s.finalTerm,
              practicalWork: s.practicalWork,
              totalObtained: s.totalObtained,
              percentage: s.percentage,
              grade: s.grade,
              gradePoint: s.gradePoint,
              status: s.status,
              isSupplementary: s.isSupplementary,
            })
            .onConflictDoNothing();
          importedCount++;
          if (s.status === "Pass") passCount++; else failCount++;
        } catch (err) {
          req.log.warn({ err, rollNo: s.rollNo }, "Skipping student (bulk)");
        }
      }

      entry.success = true;
      entry.course = header.courseTitle;
      entry.code = courseCode;
      entry.department = departmentName;
      entry.session = courseSession;
      entry.semester = courseSemester;
      entry.importedCount = importedCount;
      entry.passCount = passCount;
      entry.failCount = failCount;
      if (isMerge) { entry.merged = true; entry.mergeNote = `Merged ${importedCount} new student(s) into existing course.`; }
    } catch (err) {
      entry.error = err instanceof Error ? err.message : String(err);
    }
    results.push(entry);
  }

  res.json({ results });
});

export default router;
