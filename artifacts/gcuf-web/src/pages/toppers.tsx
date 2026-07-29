import { useState } from "react";
import { useGetToppers, useGetSessions, useGetDepartments } from "@workspace/api-client-react";
import { Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function rankBadge(rank: number) {
  if (rank === 1) return <span className="text-yellow-400 text-lg">🥇</span>;
  if (rank === 2) return <span className="text-slate-300 text-lg">🥈</span>;
  if (rank === 3) return <span className="text-orange-400 text-lg">🥉</span>;
  return <span className="text-xs font-mono text-muted-foreground w-6 text-center">{rank}</span>;
}

function GpaBar({ cgpa }: { cgpa: number }) {
  const pct = Math.min(cgpa / 4 * 100, 100);
  const color = pct >= 75 ? "#34d399" : pct >= 50 ? "#4f8ef7" : pct >= 25 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>{cgpa.toFixed(2)}</span>
    </div>
  );
}

export default function TopperPage() {
  const { data: sessions } = useGetSessions();
  const { data: departments } = useGetDepartments();
  const [session, setSession] = useState("all");
  const [deptId, setDeptId] = useState("all");

  const params = {
    ...(session !== "all" ? { session } : {}),
    ...(deptId !== "all" ? { departmentId: parseInt(deptId) } : {}),
    limit: 20,
  };

  const { data: toppers, isLoading } = useGetToppers(params);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" /> Toppers
        </h1>
        <p className="text-sm text-muted-foreground">Ranked by average percentage</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Select value={session} onValueChange={setSession}>
          <SelectTrigger className="w-full sm:w-48 bg-card border-card-border">
            <SelectValue placeholder="All Sessions" />
          </SelectTrigger>
          <SelectContent className="bg-card border-card-border">
            <SelectItem value="all">All Sessions</SelectItem>
            {(sessions ?? []).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deptId} onValueChange={setDeptId}>
          <SelectTrigger className="w-full sm:w-56 bg-card border-card-border">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent className="bg-card border-card-border">
            <SelectItem value="all">All Departments</SelectItem>
            {(departments ?? []).map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Podium — top 3 */}
      {!isLoading && (toppers ?? []).length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {(toppers ?? []).slice(0, 3).map((t, i) => (
            <Card key={t.rollNo} className={`bg-card border-card-border text-center py-5 ${i === 0 ? "ring-1 ring-yellow-400/30" : ""}`}>
              <CardContent className="pt-0">
                <div className="text-3xl mb-2">{["🥇", "🥈", "🥉"][i]}</div>
                <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{t.rollNo}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.departmentName ?? "—"}</p>
                <p className="text-2xl font-bold text-primary mt-3">{t.avgPercentage.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">CGPA {t.cgpa.toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full list */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (toppers ?? []).length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">No data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Rank", "Student", "Dept", "Session", "Avg %", "CGPA"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(toppers ?? []).map((t) => (
                    <tr key={t.rollNo} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3">{rankBadge(t.rank)}</td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{t.rollNo}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{t.departmentName ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{t.session ?? "—"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-primary whitespace-nowrap">{t.avgPercentage.toFixed(1)}%</td>
                      <td className="px-4 py-3 w-32 min-w-[100px]"><GpaBar cgpa={t.cgpa} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
