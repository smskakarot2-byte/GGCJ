import { useState, useEffect, useCallback } from "react";
import { useGetResultsSearch } from "@workspace/api-client-react";
import { Search, Filter, X, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/use-auth";

interface SearchFilters {
  name?: string;
  rollNo?: string;
  session?: string;
  courseCode?: string;
  status?: string;
  gradeMin?: string;
  gradeMax?: string;
}

interface SearchResult {
  id: number;
  rollNo: string;
  name: string;
  fatherName: string;
  cnic?: string;
  session: string;
  departmentName: string;
  courseCode: string;
  courseTitle: string;
  courseSemester: string;
  totalObtained: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  status: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdvancedSearch() {
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [debouncedFilters, setDebouncedFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"rollNo" | "name" | "grade" | "session">("rollNo");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  // Debounce filter changes - only trigger on actual value changes, not on every keystroke during typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({ ...filters });
      setPage(1); // Reset to first page on filter change
    }, 800);
    return () => clearTimeout(timer);
  }, [JSON.stringify(filters)]);

  const searchParams = {
    ...(debouncedFilters.name && { name: debouncedFilters.name }),
    ...(debouncedFilters.rollNo && { rollNo: debouncedFilters.rollNo }),
    ...(debouncedFilters.session && { session: debouncedFilters.session }),
    ...(debouncedFilters.courseCode && { courseCode: debouncedFilters.courseCode }),
    ...(debouncedFilters.status && { status: debouncedFilters.status }),
    ...(debouncedFilters.gradeMin && { gradeMin: debouncedFilters.gradeMin }),
    ...(debouncedFilters.gradeMax && { gradeMax: debouncedFilters.gradeMax }),
    page: page.toString(),
    limit: "20",
    sortBy,
    sortOrder,
  };

  const { data, isLoading, error } = useGetResultsSearch({
    query: searchParams,
  });

  const results = (data?.data ?? []) as SearchResult[];
  const pagination = data?.pagination as PaginationInfo | undefined;

  const updateFilter = useCallback(<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilter = useCallback(<K extends keyof SearchFilters>(key: K) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;

  const exportToCSV = useCallback(() => {
    if (!results || results.length === 0) return;
    
    const headers = ["Roll No", "Name", "Father Name", "Session", "Department", "Course Code", "Course Title", "Semester", "Total Marks", "Percentage", "Grade", "Status"];
    const rows = results.map((r) => [
      r.rollNo,
      r.name,
      r.fatherName,
      r.session,
      r.departmentName,
      r.courseCode,
      r.courseTitle,
      r.courseSemester,
      r.totalObtained.toString(),
      `${r.percentage.toFixed(1)}%`,
      r.grade,
      r.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `search-results-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Advanced Search
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                    {activeFilterCount}
                  </Badge>
                )}
                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              {results && results.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              id="search-input"
              placeholder="Search by name or roll number..."
              value={filters.name || filters.rollNo || ""}
              onChange={(e) => {
                const value = e.target.value;
                // Reset to empty object first to ensure clean state
                if (!value.trim()) {
                  setFilters({});
                  setDebouncedFilters({});
                  setPage(1);
                  return;
                }
                if (/^\d+$/.test(value)) {
                  setFilters({ rollNo: value });
                } else {
                  setFilters({ name: value });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setDebouncedFilters(filters);
                  setPage(1);
                }
              }}
              className="flex-1"
            />
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="shrink-0">
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="w-full mb-2">
              <X className="w-4 h-4 mr-1" />
              Clear All Filters
            </Button>
          )}

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div>
                <label htmlFor="session-filter" className="text-xs font-medium text-muted-foreground mb-1 block">Session</label>
                <Input
                  id="session-filter"
                  placeholder="e.g., 2023-2027"
                  value={filters.session || ""}
                  onChange={(e) => updateFilter("session", e.target.value)}
                  size="sm"
                />
              </div>
              <div>
                <label htmlFor="course-code-filter" className="text-xs font-medium text-muted-foreground mb-1 block">Course Code</label>
                <Input
                  id="course-code-filter"
                  placeholder="e.g., CS-101"
                  value={filters.courseCode || ""}
                  onChange={(e) => updateFilter("courseCode", e.target.value)}
                  size="sm"
                />
              </div>
              <div>
                <label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <select
                  id="status-filter"
                  value={filters.status || ""}
                  onChange={(e) => updateFilter("status", e.target.value || undefined)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                >
                  <option value="">All</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Grade Point Range</label>
                <div className="flex gap-2">
                  <Input
                    id="grade-min-filter"
                    type="number"
                    step="0.1"
                    min="0"
                    max="4"
                    placeholder="Min"
                    value={filters.gradeMin || ""}
                    onChange={(e) => updateFilter("gradeMin", e.target.value)}
                    className="flex-1"
                    size="sm"
                  />
                  <Input
                    id="grade-max-filter"
                    type="number"
                    step="0.1"
                    min="0"
                    max="4"
                    placeholder="Max"
                    value={filters.gradeMax || ""}
                    onChange={(e) => updateFilter("gradeMax", e.target.value)}
                    className="flex-1"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(filters).map(([key, value]) =>
                value ? (
                  <Badge key={key} variant="secondary" className="gap-1">
                    {key}: {value}
                    <button onClick={() => clearFilter(key as keyof SearchFilters)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ) : null
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Results {pagination && `(${pagination.total} total)`}
            </CardTitle>
            {pagination && (
              <div className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="w-6 h-6 text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>Error loading results. Please try again.</p>
            </div>
          ) : !results || results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No results found. Try adjusting your search criteria.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Roll No</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">CNIC</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden md:table-cell">Father Name</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden lg:table-cell">Department</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden xl:table-cell">Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-mono text-xs">{result.rollNo}</td>
                        <td className="py-2 px-3">
                          <div className="font-medium">{result.name}</div>
                        </td>
                        <td className="py-2 px-3 text-xs">{result.cnic || "N/A"}</td>
                        <td className="py-2 px-3 hidden md:table-cell text-xs">{result.fatherName}</td>
                        <td className="py-2 px-3 hidden lg:table-cell text-xs">{result.departmentName}</td>
                        <td className="py-2 px-3 hidden xl:table-cell text-xs">{result.session}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
