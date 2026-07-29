import { useState } from "react";
import {
  useGetDepartmentAnalytics,
  useGetAnalyticsOverview,
  useGetSessions,
  useGetSemesterStats,
} from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, RadialBarChart, RadialBar, CartesianGrid, Legend,
} from "recharts";
import {
  TrendingUp, Users, CheckCircle, BookOpen, Award, GraduationCap,
  BarChart3, ArrowUpRight, Filter,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PALETTE = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e",
  "#8b5cf6", "#0ea5e9", "#84cc16", "#ec4899", "#14b8a6",
];

function scoreColor(pct: number) {
  if (pct >= 75) return "#10b981";
  if (pct >= 60) return "#6366f1";
  if (pct >= 45) return "#f59e0b";
  return "#f43f5e";
}

function scoreBadgeClass(pct: number) {
  if (pct >= 75) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400";
  if (pct >= 45) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
}

function scoreLabel(pct: number) {
  if (pct >= 75) return "Excellent";
  if (pct >= 60) return "Good";
  if (pct >= 45) return "Average";
  return "Needs Work";
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; fill?: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl px-4 py-3 shadow-2xl">
      {label && <p className="text-xs font-semibold text-foreground mb-2">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mt-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color ?? p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-popover border border-border rounded-xl px-4 py-3 shadow-2xl">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
        <span className="font-semibold text-foreground">{p.name}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{p.value} student{p.value !== 1 ? "s" : ""}</p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5 flex flex-col gap-3">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${accent}, transparent 70%)` }}
      />
      <div className="flex items-center justify-between">
        <div className="p-2.5 rounded-xl" style={{ background: `${accent}20` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`rounded-xl bg-muted/40 animate-pulse ${className}`} />;
}

function DonutLabel({ total }: { total: number }) {
  return (
    <text x="42%" y="50%" textAnchor="middle" dominantBaseline="central">
      <tspan x="42%" dy="-0.4em" style={{ fontSize: 22, fontWeight: 700, fill: "hsl(var(--foreground))" }}>{total}</tspan>
      <tspan x="42%" dy="1.4em" style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}>students</tspan>
    </text>
  );
}

const SEMESTER_ORDER = [
  "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
  "5th Semester", "6th Semester", "7th Semester", "8th Semester",
];

function semesterSortKey(s: string) {
  const idx = SEMESTER_ORDER.indexOf(s);
  return idx === -1 ? 99 : idx;
}

export default function AnalyticsPage() {
  const [selectedSession, setSelectedSession] = useState<string>("__all__");
  const [selectedSemester, setSelectedSemester] = useState<string>("__all__");

  const { data: sessions } = useGetSessions();

  const params = {
    ...(selectedSession !== "__all__" ? { session: selectedSession } : {}),
    ...(selectedSemester !== "__all__" ? { semester: selectedSemester } : {}),
  };

  const { data: depts, isLoading } = useGetDepartmentAnalytics(params);
  const { data: overview } = useGetAnalyticsOverview(params);

  const semesterParams = selectedSession !== "__all__" ? { session: selectedSession } : {};
  const { data: semesterStats } = useGetSemesterStats(semesterParams);

  const availableSemesters = selectedSession !== "__all__"
    ? (semesterStats ?? []).sort((a, b) => semesterSortKey(a.semester) - semesterSortKey(b.semester))
    : [];

  const totalStudents = overview?.studentCount ?? 0;
  const avgScore = overview?.avgPercentage ?? 0;
  const passRate = overview?.passRate ?? 0;
  const courseCount = overview?.courseCount ?? 0;
  const deptCount = overview?.departmentCount ?? 0;

  const barData = (depts ?? []).map((d, i) => ({
    name: d.departmentName.length > 14 ? d.departmentName.slice(0, 14) + "…" : d.departmentName,
    fullName: d.departmentName,
    avg: parseFloat(d.avgPercentage.toFixed(1)),
    passRate: parseFloat(d.passRate.toFixed(1)),
    students: d.studentCount,
    color: PALETTE[i % PALETTE.length],
  }));

  const pieData = (depts ?? [])
    .filter((d) => d.studentCount > 0)
    .map((d, i) => ({
      name: d.departmentName.length > 22 ? d.departmentName.slice(0, 22) + "…" : d.departmentName,
      value: d.studentCount,
      fill: PALETTE[i % PALETTE.length],
    }));

  const axisStyle = {
    fontSize: 11,
    fill: "hsl(var(--muted-foreground))",
    fontFamily: "Inter, sans-serif",
  };

  const hasDepts = barData.length > 0;
  const topDept = hasDepts ? [...barData].sort((a, b) => b.avg - a.avg)[0] : null;
  const filterActive = selectedSession !== "__all__" || selectedSemester !== "__all__";

  return (
    <div className="min-h-full bg-background p-4 sm:p-6 space-y-5 sm:space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground">Session and semester performance intelligence</p>
        </div>
        {topDept && (
          <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
            <Award className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Top Department</p>
              <p className="text-xs text-muted-foreground truncate max-w-[160px]">{topDept.fullName} — {topDept.avg}%</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          Filter by
        </div>

        <Select value={selectedSession} onValueChange={(v) => {
          setSelectedSession(v);
          setSelectedSemester("__all__");
        }}>
          <SelectTrigger className="w-full sm:w-44 bg-background text-xs h-8">
            <SelectValue placeholder="All Sessions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All Sessions</SelectItem>
            {(sessions ?? []).sort((a, b) => b.localeCompare(a)).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedSession !== "__all__" && (
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-full sm:w-44 bg-background text-xs h-8">
              <SelectValue placeholder="All Semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">All Semesters</SelectItem>
              {availableSemesters.map((s) => (
                <SelectItem key={s.semester} value={s.semester} className="text-xs">{s.semester}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filterActive && (
          <button
            onClick={() => { setSelectedSession("__all__"); setSelectedSemester("__all__"); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg bg-muted/40 hover:bg-muted"
          >
            Clear filters
          </button>
        )}

        {filterActive && (
          <span className="text-xs text-indigo-500 ml-auto">
            {selectedSession !== "__all__" && `Session: ${selectedSession}`}
            {selectedSemester !== "__all__" && ` · ${selectedSemester}`}
          </span>
        )}
      </div>

      {/* ── Semester Cards Strip ── */}
      {selectedSession !== "__all__" && availableSemesters.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {availableSemesters.map((s) => {
            const isActive = selectedSemester === s.semester;
            return (
              <button
                key={s.semester}
                onClick={() => setSelectedSemester(isActive ? "__all__" : s.semester)}
                className={`rounded-xl border p-3 text-left transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-500/10 border-indigo-500/40"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <p className="text-xs font-semibold text-foreground mb-2">{s.semester}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Courses</span><span className="text-foreground">{s.courseCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Students</span><span className="text-foreground">{s.studentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg</span>
                    <span className={s.avgPercentage >= 60 ? "text-emerald-500" : s.avgPercentage >= 40 ? "text-amber-500" : "text-rose-500"}>
                      {s.avgPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pass</span>
                    <span className={s.passRate >= 70 ? "text-emerald-500" : s.passRate >= 50 ? "text-amber-500" : "text-rose-500"}>
                      {s.passRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── KPI Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard icon={Users} label="Total Students" value={totalStudents.toLocaleString()} accent="#6366f1" />
          <KpiCard icon={BookOpen} label="Courses" value={courseCount} accent="#22d3ee" />
          <KpiCard icon={GraduationCap} label="Departments" value={deptCount} accent="#f59e0b" />
          <KpiCard icon={TrendingUp} label="Average Score" value={`${avgScore.toFixed(1)}%`} accent="#10b981" sub={filterActive ? "Filtered" : "Across all courses"} />
          <KpiCard icon={CheckCircle} label="Pass Rate" value={`${passRate.toFixed(1)}%`} accent="#f43f5e" sub={filterActive ? "Filtered" : "University-wide"} />
        </div>
      )}

      {!hasDepts && !isLoading ? (
        <div className="rounded-2xl bg-card border border-border flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            {filterActive ? "No data for selected filters" : "No data yet"}
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-xs mt-1.5">
            {filterActive
              ? "Try selecting a different session or semester."
              : "Upload PDF award sheets from the Courses section to populate analytics."}
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Row 1: Grouped bar + Radial gauge ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Section title="Avg Score vs Pass Rate" subtitle="Side-by-side department comparison">
                <div className="px-4 pb-5">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barData} margin={{ top: 12, right: 12, left: -16, bottom: 4 }} barCategoryGap="30%" barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} dy={6} />
                      <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))", paddingTop: 12, fontFamily: "Inter, sans-serif" }}
                        iconSize={8}
                        iconType="circle"
                      />
                      <Bar dataKey="avg" name="Avg Score" radius={[4, 4, 0, 0]} maxBarSize={28} fill="#6366f1" fillOpacity={0.85} />
                      <Bar dataKey="passRate" name="Pass Rate" radius={[4, 4, 0, 0]} maxBarSize={28} fill="#10b981" fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            </div>

            <Section title="University Pass Rate" subtitle={filterActive ? "Filtered result clearance" : "Overall result clearance"}>
              <div className="px-4 pb-5 flex flex-col items-center">
                <div className="relative">
                  <ResponsiveContainer width={200} height={200}>
                    <RadialBarChart
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      startAngle={225} endAngle={-45}
                      data={[{ value: 100, fill: "hsl(var(--muted)/0.3)" }, { value: passRate, fill: "#10b981" }]}
                    >
                      <RadialBar dataKey="value" cornerRadius={8} background={false} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">{passRate.toFixed(0)}%</span>
                    <span className="text-xs text-muted-foreground">passing</span>
                  </div>
                </div>
                <div className="w-full mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fail</span>
                    <span className="text-muted-foreground">Pass</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${passRate}%`, background: "linear-gradient(90deg, #f43f5e, #10b981)" }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-rose-500 font-semibold">{(100 - passRate).toFixed(1)}% failed</span>
                    <span className="text-emerald-500 font-semibold">{passRate.toFixed(1)}% passed</span>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* ── Row 2: Donut + horizontal bar ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Student Distribution" subtitle="Enrollment share by department">
              <div className="px-4 pb-5">
                {pieData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">No students yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="42%" cy="50%"
                        innerRadius={62} outerRadius={88}
                        dataKey="value"
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} fillOpacity={0.9} />
                        ))}
                        <DonutLabel total={totalStudents} />
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend
                        layout="vertical" align="right" verticalAlign="middle"
                        iconSize={7} iconType="circle"
                        formatter={(value) => (
                          <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontFamily: "Inter, sans-serif" }}>
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Section>

            <Section title="Average Score by Department" subtitle="Ranked best to lowest">
              <div className="px-4 pb-5">
                <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 44)}>
                  <BarChart
                    data={[...barData].sort((a, b) => b.avg - a.avg)}
                    layout="vertical"
                    margin={{ top: 4, right: 52, left: 4, bottom: 4 }}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="name" type="category" tick={axisStyle} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
                    <Bar dataKey="avg" name="Avg Score" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {[...barData].sort((a, b) => b.avg - a.avg).map((entry, index) => (
                        <Cell key={index} fill={scoreColor(entry.avg)} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>

          {/* ── Row 3: Department table ── */}
          <Section title="Department Summary" subtitle="Complete breakdown with performance rating">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-t border-border">
                    {["#", "Department", "Courses", "Students", "Avg Score", "Pass Rate", "Rating"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(depts ?? []).map((d, i) => (
                    <tr key={d.departmentId} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex w-6 h-6 items-center justify-center rounded-lg text-xs font-bold"
                          style={{ background: `${PALETTE[i % PALETTE.length]}18`, color: PALETTE[i % PALETTE.length] }}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                          <span className="text-sm font-medium text-foreground">{d.departmentName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{d.courseCount ?? 0}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{d.studentCount.toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-[100px]">
                          <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all duration-700"
                              style={{ width: `${d.avgPercentage}%`, background: scoreColor(d.avgPercentage) }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-foreground w-10 text-right">
                            {d.avgPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-[100px]">
                          <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all duration-700"
                              style={{ width: `${d.passRate}%`, background: d.passRate >= 70 ? "#10b981" : d.passRate >= 50 ? "#f59e0b" : "#f43f5e" }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-foreground w-10 text-right">
                            {d.passRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${scoreBadgeClass(d.avgPercentage)}`}>
                          {scoreLabel(d.avgPercentage)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
