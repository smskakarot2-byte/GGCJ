import { useParams } from "wouter";
import { useGetCourse, useGetCourseResults } from "@workspace/api-client-react";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function gradeColor(grade: string) {
  if (["A", "A-"].includes(grade)) return "text-emerald-400";
  if (["B+", "B", "B-"].includes(grade)) return "text-blue-400";
  if (["C+", "C", "C-"].includes(grade)) return "text-yellow-400";
  if (["D+", "D"].includes(grade)) return "text-orange-400";
  return "text-red-400";
}

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const { data: course } = useGetCourse(id);
  const { data: results, isLoading } = useGetCourseResults(id);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/courses">
          <Button size="icon" variant="ghost" className="w-8 h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">{course?.title ?? "Course"}</h1>
          <p className="text-sm text-muted-foreground">
            {course?.code} · {course?.session} · {course?.departmentName}
          </p>
        </div>
      </div>

      {/* Stats */}
      {course && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Students", value: course.studentCount ?? 0 },
            { label: "Pass", value: course.passCount ?? 0 },
            { label: "Avg %", value: `${(course.avgPercentage ?? 0).toFixed(1)}%` },
            { label: "Credits", value: course.creditHoursRaw ?? course.creditHours },
          ].map(({ label, value }) => (
            <Card key={label} className="bg-card border-card-border">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results table */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            Student Results
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (() => {
            const allResults = results ?? [];
            const regular = allResults.filter((r) => !(r as any).isSupplementary);
            const supplementary = allResults.filter((r) => (r as any).isSupplementary);

            const ResultRow = ({ r, highlight }: { r: typeof allResults[0]; highlight?: boolean }) => (
              <tr className={`border-b border-border/50 transition-colors ${highlight ? "hover:bg-orange-500/5" : "hover:bg-muted/20"}`}>
                <td className="px-4 py-2.5 font-mono text-xs text-primary">{r.rollNo}</td>
                <td className="px-4 py-2.5 text-xs text-foreground whitespace-nowrap">{r.name}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground text-center">{r.internalMarks}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground text-center">{r.midTerm}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground text-center">{r.finalTerm}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground text-center">{r.practicalWork}</td>
                <td className="px-4 py-2.5 text-xs font-medium text-foreground text-center">{r.totalObtained}</td>
                <td className="px-4 py-2.5 text-xs font-medium text-foreground text-center">{r.percentage.toFixed(1)}%</td>
                <td className={`px-4 py-2.5 text-xs font-bold text-center ${gradeColor(r.grade)}`}>{r.grade}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground text-center">{r.gradePoint.toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    {r.status === "Pass"
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    <span className={`text-xs ${r.status === "Pass" ? "text-emerald-400" : "text-red-400"}`}>
                      {r.status}
                    </span>
                  </div>
                </td>
              </tr>
            );

            const tableHeader = (
              <tr className="border-b border-border">
                {["Roll No", "Name", "Internal", "Mid", "Final", "Practical", "Total", "%", "Grade", "GP", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            );

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>{tableHeader}</thead>
                  <tbody>
                    {regular.map((r) => <ResultRow key={r.id} r={r} />)}
                  </tbody>
                </table>
                {regular.length === 0 && supplementary.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">No results found.</p>
                )}
                {supplementary.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border-t border-orange-500/20">
                      <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Supplementary Students</span>
                      <Badge variant="outline" className="text-xs border-orange-500/40 text-orange-400">{supplementary.length}</Badge>
                    </div>
                    <table className="w-full text-sm">
                      <thead>{tableHeader}</thead>
                      <tbody>
                        {supplementary.map((r) => <ResultRow key={r.id} r={r} highlight />)}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
