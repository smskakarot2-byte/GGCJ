import { useState } from "react";
import {
  useGetAnalyticsOverview,
  useGetDepartmentAnalytics,
  useGetSessionsStats,
  useGetSemesterStats,
} from "@workspace/api-client-react";
import {
  Building2, BookOpen, Users, UserCog, TrendingUp, CheckCircle,
  ArrowRight, Calendar, GraduationCap, BarChart2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";

const PALETTE = ["#4f8ef7", "#34d399", "#fbbf24", "#a78bfa", "#f87171", "#38bdf8"];

function StatCard({ icon: Icon, label, value, sub, href, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  color?: string;
}) {
  const [, setLocation] = useLocation();
  return (
    <Card
      className={`bg-card border-card-border transition-all duration-200 ${href ? "cursor-pointer hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 group" : ""}`}
      onClick={() => href && setLocation(href)}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            {href && (
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-0.5 duration-200" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionCard({
  session, courseCount, studentCount, avgPercentage, passRate, isCurrent, onClick,
}: {
  session: string;
  courseCount: number;
  studentCount: number;
  avgPercentage: number;
  passRate: number;
  isCurrent: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-card-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary/70" />
          <span className="text-sm font-bold text-foreground">{session}</span>
        </div>
        {isCurrent && (
          <Badge className="text-xs bg-primary/15 text-primary border-0 font-medium">Current</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Courses</p>
          <p className="text-lg font-bold text-foreground">{courseCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Students</p>
          <p className="text-lg font-bold text-foreground">{studentCount.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Avg Score</p>
          <p className={`text-lg font-bold ${avgPercentage >= 60 ? "text-emerald-400" : avgPercentage >= 40 ? "text-yellow-400" : "text-red-400"}`}>
            {avgPercentage.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Pass Rate</p>
          <p className={`text-lg font-bold ${passRate >= 70 ? "text-emerald-400" : passRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
            {passRate.toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${passRate}%`, background: passRate >= 70 ? "#34d399" : passRate >= 50 ? "#fbbf24" : "#f87171" }}
        />
      </div>
    </button>
  );
}

function SemesterStatCard({ semester, courseCount, studentCount, avgPercentage, passRate }: {
  semester: string;
  courseCount: number;
  studentCount: number;
  avgPercentage: number;
  passRate: number;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="w-4 h-4 text-primary/70" />
        <span className="text-sm font-semibold text-foreground">{semester}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Courses</span>
          <span className="font-medium text-foreground">{courseCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Students</span>
          <span className="font-medium text-foreground">{studentCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Avg Score</span>
          <span className={`font-semibold ${avgPercentage >= 60 ? "text-emerald-400" : avgPercentage >= 40 ? "text-yellow-400" : "text-red-400"}`}>
            {avgPercentage.toFixed(1)}%
          </span>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Pass Rate</span>
            <span className={`font-semibold ${passRate >= 70 ? "text-emerald-400" : passRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
              {passRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-1 rounded-full"
              style={{ width: `${passRate}%`, background: passRate >= 70 ? "#34d399" : passRate >= 50 ? "#fbbf24" : "#f87171" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: overview, isLoading } = useGetAnalyticsOverview({});
  const { data: depts } = useGetDepartmentAnalytics({});
  const { data: sessionsStats, isLoading: sessionsLoading } = useGetSessionsStats();
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  // Pick current (latest) session for semester stats
  const sortedSessions = [...(sessionsStats ?? [])].sort((a, b) => b.session.localeCompare(a.session));
  const currentSession = sortedSessions[0]?.session;
  const { data: semesterStats } = useGetSemesterStats(
    currentSession ? { session: currentSession } : {},
  );

  const chartData = (depts ?? []).map((d, i) => ({
    name: d.departmentName.length > 12 ? d.departmentName.slice(0, 12) + "…" : d.departmentName,
    avg: d.avgPercentage,
    fill: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">System-wide overview — click any card to navigate</p>
      </div>

      {/* Overview stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card border-card-border h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {isAdmin && (
            <StatCard icon={Building2} label="Departments" value={overview?.departmentCount ?? 0} sub="Manage departments" href="/departments" />
          )}
          <StatCard icon={Users} label="Students" value={overview?.studentCount ?? 0} sub="Student lookup" href="/students" />
          {isAdmin && (
            <StatCard icon={UserCog} label="Professors" value={overview?.userCount ?? 0} sub="Manage users" href="/users" />
          )}
          <StatCard icon={TrendingUp} label="Avg Score" value={`${(overview?.avgPercentage ?? 0).toFixed(1)}%`} sub="Analytics overview" href="/analytics" />
          <StatCard icon={CheckCircle} label="Pass Rate" value={`${(overview?.passRate ?? 0).toFixed(1)}%`} sub="View analytics" href="/analytics" />
        </div>
      )}

      {/* Sessions section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Sessions</h2>
          </div>
          <button
            onClick={() => setLocation("/courses")}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View Courses <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {sessionsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 bg-card border border-card-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sortedSessions.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl py-10 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No sessions yet. Upload award sheets to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSessions.map((s, i) => (
              <SessionCard
                key={s.session}
                session={s.session}
                courseCount={s.courseCount}
                studentCount={s.studentCount}
                avgPercentage={s.avgPercentage}
                passRate={s.passRate}
                isCurrent={i === 0}
                onClick={() => setLocation("/courses")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Upload Results", href: "/courses", desc: "Add course PDF" },
          { label: "Student Lookup", href: "/students", desc: "Search by roll no" },
          { label: "Toppers", href: "/toppers", desc: "Leaderboard" },
          { label: "Analytics", href: "/analytics", desc: "Performance charts" },
        ].map(({ label, href, desc }) => (
          <button
            key={href}
            onClick={() => setLocation(href)}
            className="bg-card border border-card-border rounded-xl p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
          >
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary mt-2 group-hover:translate-x-1 transition-all duration-200" />
          </button>
        ))}
      </div>

      {/* Current Semester Statistics */}
      {currentSession && (semesterStats?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Current Semester Stats
              </h2>
              <Badge variant="secondary" className="text-xs font-normal">{currentSession}</Badge>
            </div>
            <button
              onClick={() => setLocation("/analytics")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Full Analytics <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(semesterStats ?? [])
              .sort((a, b) => a.semester.localeCompare(b.semester))
              .map((s) => (
                <SemesterStatCard
                  key={s.semester}
                  semester={s.semester}
                  courseCount={s.courseCount}
                  studentCount={s.studentCount}
                  avgPercentage={s.avgPercentage}
                  passRate={s.passRate}
                />
              ))}
          </div>
        </div>
      )}

      {/* Department chart */}
      {chartData.length > 0 && (
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest flex items-center justify-between">
              <span>Department Avg Scores</span>
              <button
                onClick={() => setLocation("/analytics")}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-normal normal-case tracking-normal"
              >
                Full Analytics <ArrowRight className="w-3 h-3" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "Arial, sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "Arial, sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--card-border))",
                    borderRadius: "8px",
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                    fontFamily: "Arial, sans-serif",
                  }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, "Avg Score"]}
                />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
