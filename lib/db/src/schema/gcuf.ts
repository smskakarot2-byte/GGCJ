import { pgTable, serial, text, integer, real, timestamp, unique, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Departments ──────────────────────────────────────────────────────────────
export const departmentsTable = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDepartmentSchema = createInsertSchema(departmentsTable).omit({ id: true, createdAt: true });
export type Department = typeof departmentsTable.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

// ─── System Users (Professors / Admin) ───────────────────────────────────────
export const systemUsersTable = pgTable("system_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("professor"), // 'admin' | 'professor'
  fullName: text("full_name").notNull().default(""),
  departmentId: integer("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSystemUserSchema = createInsertSchema(systemUsersTable).omit({ id: true, createdAt: true });
export type SystemUser = typeof systemUsersTable.$inferSelect;
export type InsertSystemUser = z.infer<typeof insertSystemUserSchema>;

// ─── Courses ─────────────────────────────────────────────────────────────────
export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  creditHoursRaw: text("credit_hours_raw").notNull().default("3(2-1)"),
  creditHours: real("credit_hours").notNull().default(3),
  session: text("session").notNull().default(""),
  semester: text("semester").notNull().default(""),
  departmentId: integer("department_id").notNull().references(() => departmentsTable.id, { onDelete: "cascade" }),
  maxMarks: real("max_marks").notNull().default(60),
  isCore: boolean("is_core").notNull().default(true),
  uploadedBy: integer("uploaded_by").references(() => systemUsersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export type Course = typeof coursesTable.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  rollNo: text("roll_no").notNull(),
  name: text("name").notNull(),
  fatherName: text("father_name").notNull().default(""),
  cnic: text("cnic").notNull().default(""),
  session: text("session").notNull().default(""),
  departmentId: integer("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("students_roll_session_dept").on(t.rollNo, t.session, t.departmentId)]);

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true });
export type Student = typeof studentsTable.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

// ─── Results ──────────────────────────────────────────────────────────────────
export const resultsTable = pgTable("results", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  internalMarks: real("internal_marks").notNull().default(0),
  midTerm: real("mid_term").notNull().default(0),
  finalTerm: real("final_term").notNull().default(0),
  practicalWork: real("practical_work").notNull().default(0),
  totalObtained: real("total_obtained").notNull().default(0),
  percentage: real("percentage").notNull().default(0),
  grade: text("grade").notNull().default(""),
  gradePoint: real("grade_point").notNull().default(0),
  status: text("status").notNull().default("Pass"),
  isSupplementary: boolean("is_supplementary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("results_student_course").on(t.studentId, t.courseId)]);

export const insertResultSchema = createInsertSchema(resultsTable).omit({ id: true, createdAt: true });
export type Result = typeof resultsTable.$inferSelect;
export type InsertResult = z.infer<typeof insertResultSchema>;
