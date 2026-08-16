import { useState, useEffect } from "react";
import { Search, Download, CheckCircle, XCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AdvancedSearch from "@/components/AdvancedSearch";

interface StudentResult {
  id: number;
  rollNo: string;
  name: string;
  fatherName: string;
  cnic: string;
  session: string;
  internalMarks: number;
  midTerm: number;
  finalTerm: number;
  practicalWork: number;
  totalObtained: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  status: string;
  isSupplementary?: boolean;
  courseCode?: string;
  courseTitle?: string;
  creditHours?: number;
  courseSession?: string;
  courseSemester?: string;
  isCore?: boolean;
}

interface LookupData {
  student: { rollNo: string; name: string; fatherName: string; cnic: string; session: string; departmentName: string | null };
  results: StudentResult[];
  cgpa: number;
  totalCredits: number;
  passCount: number;
  failCount: number;
  semesterGpas?: Record<string, Record<string, number>>;
}

function gradeColor(grade: string) {
  if (["A", "A-"].includes(grade)) return "text-emerald-400";
  if (["B+", "B", "B-"].includes(grade)) return "text-blue-400";
  if (["C+", "C", "C-"].includes(grade)) return "text-yellow-400";
  return "text-red-400";
}

function GpaGauge({ cgpa }: { cgpa: number }) {
  const pct = Math.min(cgpa / 4, 1);
  const color = pct >= 0.75 ? "#34d399" : pct >= 0.5 ? "#4f8ef7" : pct >= 0.25 ? "#fbbf24" : "#f87171";
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference * (1 - pct);
  return (
    <div className="flex flex-col items-center">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r="36" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <circle
          cx="45" cy="45" r="36" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="45" y="49" textAnchor="middle" fill={color} fontSize="16" fontWeight="700" fontFamily="Arial, sans-serif">
          {cgpa.toFixed(2)}
        </text>
      </svg>
      <p className="text-xs text-muted-foreground mt-1">CGPA / 4.00</p>
    </div>
  );
}

function groupBySemester(results: StudentResult[]) {
  const groups: Record<string, { regular: Record<string, StudentResult[]>; supplementary: StudentResult[] }> = {};
  for (const r of results) {
    const sess = r.courseSession || r.session || "Unknown Session";
    const sem = r.courseSemester || "Unknown Semester";
    if (!groups[sess]) groups[sess] = { regular: {}, supplementary: [] };
    if (r.isSupplementary) {
      groups[sess].supplementary.push(r);
    } else {
      if (!groups[sess].regular[sem]) groups[sess].regular[sem] = [];
      groups[sess].regular[sem].push(r);
    }
  }
  return groups;
}

function computeSemGpa(rows: StudentResult[]): number {
  const coreRows = rows.filter((r) => r.isCore !== false);
  const totalPoints = coreRows.reduce((s, r) => s + r.gradePoint * (r.creditHours ?? 0), 0);
  const totalCredits = coreRows.reduce((s, r) => s + (r.creditHours ?? 0), 0);
  if (totalCredits === 0) return 0;
  return Math.round((totalPoints / totalCredits) * 10000) / 10000;
}

export default function StudentsPage() {
  const [rollNo, setRollNo] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [selectedSession, setSelectedSession] = useState("");
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LookupData | null>(null);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/departments", { credentials: "include" }).then((r) => r.json()).then(setDepartments).catch(() => {});
    fetch("/api/results/sessions", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch sessions");
        return r.json();
      })
      .then((data) => {
        // Ensure data is an array before setting
        if (Array.isArray(data)) {
          setSessions(data);
        } else {
          setSessions([]);
        }
      })
      .catch(() => {
        // Silently fail - sessions dropdown will be empty but app won't crash
        setSessions([]);
      });
  }, []);

  async function handleLookup() {
    if (!rollNo.trim() || !departmentId || !selectedSession) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const params = new URLSearchParams({ rollNo: rollNo.trim(), departmentId: String(departmentId), session: selectedSession });
      const res = await fetch(`/api/results/student?${params}`, { credentials: "include" });
      if (res.status === 404) { setError("Student not found."); return; }
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError("Lookup failed: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!data) return;
    const params = new URLSearchParams();
    if (selectedSession) params.set("session", selectedSession);
    if (departmentId) params.set("departmentId", String(departmentId));
    window.location.href = `/api/results/transcript/${data.student.rollNo}?${params}`;
  }

  const grouped = data ? groupBySemester(data.results) : {};

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Student Lookup</h1>
        <p className="text-sm text-muted-foreground">Search by roll number — results grouped by session &amp; semester</p>
      </div>

      {/* Advanced Search Component */}
      <AdvancedSearch />

      {/* Search */}
      <Card className="bg-card border-card-border">
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : "")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Department…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Session…</option>
              {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input
              placeholder="Roll number (e.g. 109400)"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
          </div>
          <Button
            onClick={handleLookup}
            disabled={loading || !rollNo.trim() || !departmentId || !selectedSession}
            className="gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? "Searching…" : "Lookup"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-5">
          {/* Student info */}
          <Card className="bg-card border-card-border">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="sm:hidden">
                    <GpaGauge cgpa={data.cgpa} />
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm min-w-0">
                  <div className="truncate"><span className="text-muted-foreground">Name: </span><span className="text-foreground font-medium">{data.student.name}</span></div>
                  <div><span className="text-muted-foreground">Roll No: </span><span className="text-primary font-bold">{data.student.rollNo}</span></div>
                  <div className="truncate"><span className="text-muted-foreground">Father: </span><span className="text-foreground">{data.student.fatherName}</span></div>
                  <div><span className="text-muted-foreground">CNIC: </span><span className="text-foreground">{data.student.cnic || "—"}</span></div>
                  <div><span className="text-muted-foreground">Session: </span><span className="text-foreground">{data.student.session}</span></div>
                  <div className="truncate"><span className="text-muted-foreground">Department: </span><span className="text-foreground">{data.student.departmentName ?? "—"}</span></div>
                </div>
                <div className="hidden sm:block shrink-0">
                  <GpaGauge cgpa={data.cgpa} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-5 mt-4 pt-4 border-t border-border text-sm">
                <span><span className="text-muted-foreground">Courses: </span><span className="font-semibold">{data.results.length}</span></span>
                <span><span className="text-muted-foreground">Pass: </span><span className="text-emerald-400 font-semibold">{data.passCount}</span></span>
                <span><span className="text-muted-foreground">Fail: </span><span className="text-red-400 font-semibold">{data.failCount}</span></span>
                <span><span className="text-muted-foreground">Credits: </span><span className="font-semibold">{data.totalCredits}</span></span>
                <div className="ml-auto">
                  <Button size="sm" variant="outline" className="gap-2" onClick={handleDownload}>
                    <Download className="w-3.5 h-3.5" /> Transcript
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results grouped by session → semester */}
          {Object.entries(grouped).map(([sess, { regular, supplementary }]) => (
            <div key={sess} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                Session: {sess}
              </h2>

              {Object.entries(regular)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([sem, rows]) => {
                  const semGpa = computeSemGpa(rows);
                  const semGpaColor = semGpa >= 3 ? "text-emerald-400" : semGpa >= 2 ? "text-yellow-400" : "text-red-400";
                  return (
                    <Card key={sem} className="bg-card border-card-border">
                      <CardHeader className="pb-2 pt-4 px-5">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest font-medium flex items-center gap-2">
                          <span>Semester: {sem}</span>
                          <Badge variant="outline" className="text-xs font-normal normal-case tracking-normal">
                            {rows.length} course{rows.length !== 1 ? "s" : ""}
                          </Badge>
                          <span className={`ml-auto text-xs font-semibold ${semGpaColor}`}>
                            Semester GPA: {semGpa.toFixed(2)}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                {["Code", "Title", "Internal", "Mid", "Final", "Practical", "Total", "%", "Grade", "GP", "Credits", "Status"].map((h) => (
                                  <th key={h} className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r) => (
                                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">{r.courseCode ?? "—"}</td>
                                  <td className="px-4 py-2.5 text-xs text-foreground min-w-[180px]">
                                    <div className="flex items-start gap-1.5 flex-wrap">
                                      <span className="break-words">{r.courseTitle ?? "—"}{(r.isSupplementary || r.status === "Fail") && <span className="text-orange-500 font-bold ml-0.5">*</span>}</span>
                                      {r.isCore === false && (
                                        <span className="shrink-0 text-xs text-muted-foreground border border-dashed border-border rounded px-1 py-0.5 leading-none">Ord</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.internalMarks}</td>
                                  <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.midTerm}</td>
                                  <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.finalTerm}</td>
                                  <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.practicalWork || "—"}</td>
                                  <td className="px-4 py-2.5 text-xs text-center">{r.totalObtained}</td>
                                  <td className="px-4 py-2.5 text-xs font-medium text-center">{r.percentage.toFixed(1)}%</td>
                                  <td className={`px-4 py-2.5 text-xs font-bold text-center ${gradeColor(r.grade)}`}>{r.grade}</td>
                                  <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.gradePoint.toFixed(2)}</td>
                                  <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.creditHours ?? "—"}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1">
                                      {r.status === "Pass"
                                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                        : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                      <span className={`text-xs ${r.status === "Pass" ? "text-emerald-400" : "text-red-400"}`}>{r.status}</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

              {/* Supplementary students for this session */}
              {supplementary.length > 0 && (
                <Card className="bg-card border-card-border border-orange-500/30">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-xs font-medium flex items-center gap-2">
                      <span className="text-orange-400 uppercase tracking-widest">Supplementary Exams</span>
                      <Badge variant="outline" className="text-xs font-normal normal-case tracking-normal border-orange-500/40 text-orange-400">
                        {supplementary.length} course{supplementary.length !== 1 ? "s" : ""}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            {["Code", "Title", "Internal", "Mid", "Final", "Practical", "Total", "%", "Grade", "GP", "Credits", "Status"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {supplementary.map((r) => (
                            <tr key={r.id} className="border-b border-border/50 hover:bg-orange-500/5 transition-colors">
                              <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">{r.courseCode ?? "—"}</td>
                              <td className="px-4 py-2.5 text-xs text-foreground min-w-[180px]">
                                <div className="flex items-start gap-1.5 flex-wrap">
                                  <span className="break-words">{r.courseTitle ?? "—"}{(r.isSupplementary || r.status === "Fail") && <span className="text-orange-500 font-bold ml-0.5">*</span>}</span>
                                  {r.isCore === false && (
                                    <span className="shrink-0 text-xs text-muted-foreground border border-dashed border-border rounded px-1 py-0.5 leading-none">Ord</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.internalMarks}</td>
                              <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.midTerm}</td>
                              <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.finalTerm}</td>
                              <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.practicalWork || "—"}</td>
                              <td className="px-4 py-2.5 text-xs text-center">{r.totalObtained}</td>
                              <td className="px-4 py-2.5 text-xs font-medium text-center">{r.percentage.toFixed(1)}%</td>
                              <td className={`px-4 py-2.5 text-xs font-bold text-center ${gradeColor(r.grade)}`}>{r.grade}</td>
                              <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.gradePoint.toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{r.creditHours ?? "—"}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  {r.status === "Pass"
                                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                    : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                  <span className={`text-xs ${r.status === "Pass" ? "text-emerald-400" : "text-red-400"}`}>{r.status}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
