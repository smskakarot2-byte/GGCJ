import { useState, useRef } from "react";
import { useGetCourses, useDeleteCourse, getGetCoursesQueryKey, getGetToppersQueryKey, useGetDepartments } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Upload, Trash2, BookOpen, Eye, Search, Building2,
  ChevronDown, ChevronRight, Calendar, Users, TrendingUp, CheckCircle,
  XCircle, Files, ToggleLeft, ToggleRight,
} from "lucide-react";

interface BulkFileResult {
  filename: string;
  success: boolean;
  error?: string;
  course?: string;
  code?: string;
  department?: string;
  session?: string;
  semester?: string;
  importedCount?: number;
  passCount?: number;
  failCount?: number;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import type { Course } from "@workspace/api-client-react";

const SEMESTERS = [
  "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
  "5th Semester", "6th Semester", "7th Semester", "8th Semester",
];

function gradeColor(pct: number) {
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 60) return "text-yellow-400";
  return "text-red-400";
}

interface GroupedCourses {
  [session: string]: {
    [semester: string]: Course[];
  };
}

interface GroupedByDept {
  [dept: string]: GroupedCourses;
}

function groupCourses(courses: Course[]): GroupedCourses {
  const grouped: GroupedCourses = {};
  for (const c of courses) {
    const sess = c.session || "Unknown Session";
    const sem = c.semester || "Unknown Semester";
    if (!grouped[sess]) grouped[sess] = {};
    if (!grouped[sess][sem]) grouped[sess][sem] = [];
    grouped[sess][sem].push(c);
  }
  return grouped;
}

function groupByDept(courses: Course[]): GroupedByDept {
  const grouped: GroupedByDept = {};
  for (const c of courses) {
    const dept = c.departmentName || "Unknown Department";
    const sess = c.session || "Unknown Session";
    const sem = c.semester || "Unknown Semester";
    if (!grouped[dept]) grouped[dept] = {};
    if (!grouped[dept][sess]) grouped[dept][sess] = {};
    if (!grouped[dept][sess][sem]) grouped[dept][sess][sem] = [];
    grouped[dept][sess][sem].push(c);
  }
  return grouped;
}

function CourseRow({ c, isAdmin, onDelete, onToggleCore }: {
  c: Course; isAdmin: boolean;
  onDelete: (id: number) => void;
  onToggleCore: (id: number, currentIsCore: boolean) => void;
}) {
  const isCore = (c as any).isCore !== false;
  return (
    <div className="flex items-center gap-4 bg-background/40 border border-border/40 rounded-lg px-4 py-3 hover:bg-card/80 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
        <p className="text-xs text-muted-foreground">
          {c.code}
          {isAdmin && c.departmentName ? ` · ${c.departmentName}` : ""}
        </p>
      </div>
      <div className="text-right hidden sm:block">
        <p className={`text-sm font-semibold ${gradeColor(c.avgPercentage ?? 0)}`}>
          {(c.avgPercentage ?? 0).toFixed(1)}%
        </p>
        <p className="text-xs text-muted-foreground">{c.studentCount ?? 0} students</p>
      </div>
      <button
        title={isCore ? "Core subject — click to mark as Ordinary" : "Ordinary subject — click to mark as Core"}
        onClick={() => onToggleCore(c.id, isCore)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
          isCore
            ? "border-primary/40 text-primary bg-primary/5 hover:bg-primary/15"
            : "border-dashed border-muted-foreground/50 text-muted-foreground hover:border-muted-foreground"
        }`}
      >
        {isCore
          ? <><ToggleRight className="w-3 h-3" /> Core</>
          : <><ToggleLeft className="w-3 h-3" /> Ordinary</>}
      </button>
      <Badge variant="outline" className="text-xs hidden md:inline-flex">
        {c.creditHours} cr
      </Badge>
      <div className="flex gap-1">
        <Link href={`/courses/${c.id}`}>
          <Button size="icon" variant="ghost" className="w-7 h-7">
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <Button
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(c.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SessionStatsCard({
  session, totalCourses, totalStudents, avgScore, isCurrent,
}: {
  session: string;
  totalCourses: number;
  totalStudents: number;
  avgScore: number;
  isCurrent: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-4 px-5 pt-3 pb-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Session</p>
          <p className="text-xs font-semibold text-foreground">{session}</p>
        </div>
        {isCurrent && (
          <Badge className="text-xs bg-primary/15 text-primary border-0 ml-1">Current</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Courses</p>
          <p className="text-xs font-semibold text-foreground">{totalCourses}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Enrollments</p>
          <p className="text-xs font-semibold text-foreground">{totalStudents.toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Avg Score</p>
          <p className={`text-xs font-semibold ${gradeColor(avgScore)}`}>{avgScore.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const { user, isAdmin } = useAuth();
  const { data: courses, isLoading } = useGetCourses({});
  const { data: departments } = useGetDepartments();
  const deleteCourse = useDeleteCourse();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTab, setUploadTab] = useState<"single" | "bulk">("single");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkFileResult[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const [selectedDept, setSelectedDept] = useState<string>("");
  const [session, setSession] = useState("");
  const [semester, setSemester] = useState("");
  const [subjectIsCore, setSubjectIsCore] = useState(true);

  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(new Set());
  const [collapsedSemesters, setCollapsedSemesters] = useState<Set<string>>(new Set());

  const toggleDept = (d: string) =>
    setCollapsedDepts((prev) => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; });

  const toggleSession = (s: string) =>
    setCollapsedSessions((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });

  const toggleSemester = (key: string) =>
    setCollapsedSemesters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const professorDeptName = !isAdmin ? (user?.departmentName ?? null) : null;

  const allCourses = courses ?? [];
  const filtered = search
    ? allCourses.filter(
        (c: Course) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : allCourses;

  const deptGrouped = groupByDept(filtered);
  const deptNames = Object.keys(deptGrouped).sort();
  const grouped = groupCourses(filtered);
  const sessions = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  function resetForm() {
    setSelectedDept("");
    setSession("");
    setSemester("");
    setSubjectIsCore(true);
    if (fileRef.current) fileRef.current.value = "";
    setBulkResults(null);
    if (bulkFileRef.current) bulkFileRef.current.value = "";
  }

  async function handleBulkUpload() {
    const files = bulkFileRef.current?.files;
    if (!files?.length) { toast({ title: "Please select PDF files", variant: "destructive" }); return; }
    setBulkUploading(true);
    setBulkResults(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      formData.append("isCore", subjectIsCore ? "true" : "false");
      const res = await fetch("/api/courses/bulk-upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBulkResults(data.results as BulkFileResult[]);
      queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey() });
    } catch (err) {
      toast({ title: "Bulk upload failed", description: String(err), variant: "destructive" });
    } finally {
      setBulkUploading(false);
    }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast({ title: "Please select a PDF file", variant: "destructive" }); return; }
    if (isAdmin && !selectedDept) { toast({ title: "Please select a department", variant: "destructive" }); return; }
    if (!session.trim()) { toast({ title: "Please enter a session (e.g. 2024-2025)", variant: "destructive" }); return; }
    if (!semester) { toast({ title: "Please select a semester", variant: "destructive" }); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session", session.trim());
      formData.append("semester", semester);
      formData.append("isCore", subjectIsCore ? "true" : "false");
      if (isAdmin) formData.append("departmentId", selectedDept);

      const res = await fetch("/api/courses/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast({
        title: "Upload successful",
        description: `Imported ${data.importedCount} students · ${data.passCount} Pass · ${data.failCount} Fail`,
      });
      queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey() });
      setUploadOpen(false);
      resetForm();
    } catch (err: unknown) {
      toast({ title: "Upload failed", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this course and all its results?")) return;
    await deleteCourse.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey() });
    toast({ title: "Course deleted" });
  }

  async function handleToggleCore(id: number, currentIsCore: boolean) {
    const newIsCore = !currentIsCore;
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isCore: newIsCore }),
      });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetToppersQueryKey() });
      toast({ title: `Changed to ${newIsCore ? "Core" : "Ordinary"}` });
    } catch (err) {
      toast({ title: "Failed to update subject type", description: String(err), variant: "destructive" });
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">Courses</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "All uploaded award sheets"
              : professorDeptName
              ? `${professorDeptName} — uploaded award sheets`
              : "Your uploaded award sheets"}
          </p>
        </div>
        <Button size="sm" className="gap-2 shrink-0" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Result</span>
          <span className="sm:hidden">Upload</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search courses…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-card border border-card-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-card-border">
          <CardContent className="py-16 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No courses yet. Upload an award sheet PDF.</p>
          </CardContent>
        </Card>
      ) : isAdmin ? (
        /* ── Admin view: Department → Session Cards → Semester → Courses ── */
        <div className="space-y-4">
          {deptNames.map((dept) => {
            const deptCollapsed = collapsedDepts.has(dept);
            const deptSessions = Object.keys(deptGrouped[dept]).sort((a, b) => b.localeCompare(a));
            const totalDeptCourses = deptSessions.reduce((n, s) =>
              n + Object.values(deptGrouped[dept][s]).reduce((m, cs) => m + cs.length, 0), 0);

            return (
              <div key={dept} className="bg-card border border-card-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors text-left"
                  onClick={() => toggleDept(dept)}
                >
                  <div className="flex items-center gap-3">
                    {deptCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    <Building2 className="w-4 h-4 text-primary/70" />
                    <span className="text-sm font-bold text-foreground">{dept}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{deptSessions.length} session{deptSessions.length !== 1 ? "s" : ""}</span>
                </button>

                {!deptCollapsed && (
                  <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-3">
                    {deptSessions.map((sess, sessIdx) => {
                      const sessKey = `${dept}__${sess}`;
                      const sessCollapsed = collapsedSessions.has(sessKey);
                      const sessSemesters = Object.keys(deptGrouped[dept][sess]).sort();
                      const totalSessCourses = sessSemesters.reduce((n, sem) => n + deptGrouped[dept][sess][sem].length, 0);
                      const totalSessStudents = sessSemesters.reduce((n, sem) =>
                        n + deptGrouped[dept][sess][sem].reduce((m, c) => m + (c.studentCount ?? 0), 0), 0);
                      const sessAvg = (() => {
                        const allC = sessSemesters.flatMap((sem) => deptGrouped[dept][sess][sem]);
                        return allC.length > 0
                          ? allC.reduce((sum, c) => sum + (c.avgPercentage ?? 0), 0) / allC.length
                          : 0;
                      })();

                      return (
                        <div
                          key={sess}
                          className="border border-border/50 rounded-xl overflow-hidden"
                        >
                          {/* Session Card Header */}
                          <button
                            className="w-full hover:bg-muted/10 transition-colors text-left"
                            onClick={() => toggleSession(sessKey)}
                          >
                            <div className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3">
                                {sessCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />}
                                <Calendar className="w-3.5 h-3.5 text-primary/60" />
                                <span className="text-sm font-semibold text-foreground">{sess}</span>
                                {sessIdx === 0 && (
                                  <Badge className="text-xs bg-primary/15 text-primary border-0">Current</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">{sessSemesters.length} semester{sessSemesters.length !== 1 ? "s" : ""}</span>
                            </div>
                            {/* Session stats strip */}
                            <div className="flex items-center gap-6 px-10 pb-3 text-xs text-muted-foreground">
                              <span className={`flex items-center gap-1.5 font-medium ${gradeColor(sessAvg)}`}>
                                <TrendingUp className="w-3 h-3" />{sessAvg.toFixed(1)}% avg
                              </span>
                            </div>
                          </button>

                          {!sessCollapsed && (
                            <div className="border-t border-border/30">
                              {sessSemesters.map((sem, semIdx) => {
                                const semKey = `${dept}__${sess}__${sem}`;
                                const semCollapsed = collapsedSemesters.has(semKey);
                                const semCourses = deptGrouped[dept][sess][sem];

                                return (
                                  <div key={sem} className={semIdx > 0 ? "border-t border-border/20" : ""}>
                                    <button
                                      className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-muted/10 transition-colors text-left"
                                      onClick={() => toggleSemester(semKey)}
                                    >
                                      {semCollapsed ? <ChevronRight className="w-3 h-3 text-muted-foreground/40" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/40" />}
                                      <span className="text-xs font-medium text-primary">{sem}</span>
                                      <span className="text-xs text-muted-foreground ml-auto">{semCourses.length} {semCourses.length === 1 ? "course" : "courses"}</span>
                                    </button>
                                    {!semCollapsed && (
                                      <div className="px-5 pb-3 space-y-2">
                                        {semCourses.map((c) => (
                                          <CourseRow key={c.id} c={c} isAdmin={isAdmin} onDelete={handleDelete} onToggleCore={handleToggleCore} />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Professor view: Session Cards → Semester → Courses ── */
        <div className="space-y-4">
          {sessions.map((sess, sessIdx) => {
            const sessionCollapsed = collapsedSessions.has(sess);
            const semesters = Object.keys(grouped[sess]).sort();
            const totalCourses = semesters.reduce((n, sem) => n + grouped[sess][sem].length, 0);
            const totalStudents = semesters.reduce((n, sem) =>
              n + grouped[sess][sem].reduce((m, c) => m + (c.studentCount ?? 0), 0), 0);
            const sessAvg = (() => {
              const allC = semesters.flatMap((sem) => grouped[sess][sem]);
              return allC.length > 0
                ? allC.reduce((sum, c) => sum + (c.avgPercentage ?? 0), 0) / allC.length
                : 0;
            })();

            return (
              <div
                key={sess}
                className="bg-card border border-card-border rounded-xl overflow-hidden"
              >
                {/* Session Card Header */}
                <button
                  className="w-full hover:bg-muted/10 transition-colors text-left"
                  onClick={() => toggleSession(sess)}
                >
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      {sessionCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      <Calendar className="w-4 h-4 text-primary/70" />
                      <span className="text-sm font-bold text-foreground">{sess}</span>
                      {sessIdx === 0 && (
                        <Badge className="text-xs bg-primary/15 text-primary border-0">Current</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{semesters.length} semester{semesters.length !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Session stats strip */}
                  <div className="flex items-center gap-6 px-12 pb-4 text-xs text-muted-foreground">
                    <span className={`flex items-center gap-1.5 font-medium ${gradeColor(sessAvg)}`}>
                      <TrendingUp className="w-3 h-3" />{sessAvg.toFixed(1)}% avg
                    </span>
                  </div>
                </button>

                {!sessionCollapsed && (
                  <div className="border-t border-border/50">
                    {semesters.map((sem, semIdx) => {
                      const semKey = `${sess}__${sem}`;
                      const semCollapsed = collapsedSemesters.has(semKey);
                      const semCourses = grouped[sess][sem];

                      return (
                        <div key={sem} className={semIdx > 0 ? "border-t border-border/30" : ""}>
                          <button
                            className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-muted/10 transition-colors text-left"
                            onClick={() => toggleSemester(semKey)}
                          >
                            {semCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />}
                            <span className="text-xs font-medium text-primary">{sem}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{semCourses.length} {semCourses.length === 1 ? "course" : "courses"}</span>
                          </button>
                          {!semCollapsed && (
                            <div className="px-4 pb-3 space-y-2">
                              {semCourses.map((c) => (
                                <CourseRow key={c.id} c={c} isAdmin={isAdmin} onDelete={handleDelete} onToggleCore={handleToggleCore} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="bg-card border-card-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Result</DialogTitle>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-background rounded-lg border border-border mt-1">
            {(["single", "bulk"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setUploadTab(tab); setBulkResults(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  uploadTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "single" ? <Upload className="w-3.5 h-3.5" /> : <Files className="w-3.5 h-3.5" />}
                {tab === "single" ? "Single File" : "Bulk Upload"}
              </button>
            ))}
          </div>

          {/* ── Single upload ───────────────────────────────────────────── */}
          {uploadTab === "single" && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm text-muted-foreground block mb-1.5">Department</label>
                {isAdmin ? (
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select department…" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-card-border">
                      {(departments ?? []).map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{professorDeptName ?? (user ? "No department assigned — contact admin" : "Loading…")}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1.5">
                  Session <span className="text-xs">(e.g. 2024-2025)</span>
                </label>
                <Input placeholder="e.g. 2024-2025" value={session} onChange={(e) => setSession(e.target.value)} className="bg-background" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1.5">Semester</label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select semester…" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-card-border">
                    {SEMESTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-2">Subject Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSubjectIsCore(true)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${subjectIsCore ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"}`}>
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <div><p className="font-medium text-xs">Core</p><p className="text-xs opacity-70">Counts toward GPA</p></div>
                  </button>
                  <button type="button" onClick={() => setSubjectIsCore(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${!subjectIsCore ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"}`}>
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <div><p className="font-medium text-xs">Ordinary</p><p className="text-xs opacity-70">Display only</p></div>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1.5">PDF File</label>
                <input ref={fileRef} type="file" accept="application/pdf"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-primary file:text-primary-foreground file:cursor-pointer cursor-pointer" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setUploadOpen(false); resetForm(); }}>Cancel</Button>
                <Button size="sm" onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Uploading…" : "Upload & Parse"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Bulk upload ─────────────────────────────────────────────── */}
          {uploadTab === "bulk" && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select multiple award sheet PDFs. Department, session, and semester are
                auto-detected from each file's header.
                {!isAdmin && " Files belonging to other departments will be rejected."}
              </p>

              <div>
                <label className="text-sm text-muted-foreground block mb-2">Subject Type (applies to all files)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSubjectIsCore(true)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${subjectIsCore ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"}`}>
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <div><p className="font-medium text-xs">Core</p><p className="text-xs opacity-70">Counts toward GPA</p></div>
                  </button>
                  <button type="button" onClick={() => setSubjectIsCore(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${!subjectIsCore ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"}`}>
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <div><p className="font-medium text-xs">Ordinary</p><p className="text-xs opacity-70">Display only</p></div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1.5">PDF Files (up to 60)</label>
                <input ref={bulkFileRef} type="file" accept="application/pdf" multiple
                  onChange={() => setBulkResults(null)}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-primary file:text-primary-foreground file:cursor-pointer cursor-pointer" />
              </div>

              {/* Results */}
              {bulkResults && (
                <div className="max-h-60 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {bulkResults.map((r, i) => (
                    <div key={i} className={`px-3 py-2.5 text-xs ${r.success ? "bg-green-500/5" : "bg-red-500/5"}`}>
                      <div className="flex items-start gap-2">
                        {r.success
                          ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                          : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                        <div className="min-w-0">
                          <p className="font-medium truncate text-foreground">{r.filename}</p>
                          {r.success ? (
                            <p className="text-muted-foreground mt-0.5">
                              <span className="font-medium text-foreground">{r.code}</span> · {r.department} · {r.session} · {r.semester}
                              {" "}— {r.importedCount} students · {r.passCount}P / {r.failCount}F
                            </p>
                          ) : (
                            <p className="text-red-400 mt-0.5">{r.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setUploadOpen(false); resetForm(); }}>
                  {bulkResults ? "Done" : "Cancel"}
                </Button>
                {!bulkResults && (
                  <Button size="sm" onClick={handleBulkUpload} disabled={bulkUploading}>
                    {bulkUploading ? "Uploading…" : "Upload All"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
