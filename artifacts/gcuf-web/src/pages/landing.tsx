import { useState, useEffect } from "react";
import { Search, ChevronDown, XCircle, Download, Shield, Lock, Sun, Moon } from "lucide-react";
import collegeLogo from "/college-logo.png";
import { useTheme } from "@/context/ThemeContext";

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
  courseCode?: string;
  courseTitle?: string;
  creditHours?: number;
  courseSession?: string;
  courseSemester?: string;
  isCore?: boolean;
  isSupplementary?: boolean;
}

interface LookupData {
  student: { rollNo: string; name: string; fatherName: string; cnic: string; session: string; departmentName: string | null };
  results: StudentResult[];
  cgpa: number;
  totalCredits: number;
  passCount: number;
  failCount: number;
}

function groupBySemester(results: StudentResult[]) {
  const groups: Record<string, Record<string, StudentResult[]>> = {};
  for (const r of results) {
    const sess = r.courseSession || r.session || "Unknown Session";
    const sem = r.courseSemester || "Unknown Semester";
    if (!groups[sess]) groups[sess] = {};
    if (!groups[sess][sem]) groups[sess][sem] = [];
    groups[sess][sem].push(r);
  }
  return groups;
}

const FEATURES = [
  {
    icon: "verified_user",
    title: "Secure Verification Engine",
    desc: "Ensures all student results are retrieved through a protected and validated system to maintain data integrity and authenticity.",
  },
  {
    icon: "bolt",
    title: "Fast Result Processing",
    desc: "Optimized backend structure allows quick fetching of academic results with minimal delay, even during peak traffic hours.",
  },
  {
    icon: "bar_chart",
    title: "Accurate Academic Records",
    desc: "All results are systematically stored and cross-verified to ensure error-free and consistent academic reporting.",
  },
  {
    icon: "account_balance",
    title: "Institutional Compliance System",
    desc: "Designed in alignment with academic standards to support transparent and reliable examination record management.",
  },
];

const FAQ = [
  {
    q: "How do I check my result?",
    a: "Enter your student roll number (e.g. 109400) in the search box on the home page and click 'Search Result'. Your full result will be displayed instantly.",
  },
  {
    q: "What if my result is not found?",
    a: "Ensure your roll number is entered correctly as it appears on your admit card. If the result still does not appear, it may not have been published yet. Contact your department office.",
  },
  {
    q: "Is this an official system?",
    a: "Yes. This portal is the official result verification system managed by the Department of Computer Science in collaboration with the Examination Branch of Government Graduate College Jhang.",
  },
  {
    q: "Why is the portal showing a delay?",
    a: "System updates may occur during exam cycles. Please wait a few minutes and try again. If the issue persists, contact the examination branch.",
  },
  {
    q: "Who can I contact for support?",
    a: "For any issues related to this website, please contact Syed Faseeh Haider directly at smskakarot@gmail.com or call 0309-7519817.",
  },
];

const TICKER_ITEMS = [
  "Result portal is optimized for official result release sessions",
  "Avoid incorrect roll number format",
  "System updates may occur during exam cycles",
  "Official verification portal for GGC Jhang students",
  "Download your transcript after result verification",
  "Contact examination branch for result discrepancies",
];

interface LandingPageProps {
  onStaffLogin: () => void;
}

export default function LandingPage({ onStaffLogin }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  const [rollNo, setRollNo] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [selectedSession, setSelectedSession] = useState("");
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LookupData | null>(null);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then(setDepartments).catch(() => {});
    fetch("/api/results/sessions")
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
    if (!rollNo.trim()) { setError("Please enter a roll number."); setData(null); return; }
    if (!departmentId) { setError("Please select a department."); setData(null); return; }
    if (!selectedSession) { setError("Please select a session."); setData(null); return; }
    setLoading(true); setError(""); setData(null);
    try {
      const params = new URLSearchParams({ rollNo: rollNo.trim(), departmentId: String(departmentId), session: selectedSession });
      const res = await fetch(`/api/results/student?${params}`);
      if (res.status === 404) { setError("No student found with this roll number, department, and session."); return; }
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch { setError("Lookup failed. Please check your details and try again."); }
    finally { setLoading(false); }
  }

  function handleDownload() {
    if (!data) return;
    const params = new URLSearchParams();
    if (selectedSession) params.set("session", selectedSession);
    if (departmentId) params.set("departmentId", String(departmentId));
    window.open(`/api/results/transcript/${data.student.rollNo}?${params}`, "_blank");
  }

  const grouped = data ? groupBySemester(data.results) : {};

  const c = {
    bg:          dark ? "#080f1c"   : "#f7f9fb",
    navBg:       dark ? "#080f1c"   : "#ffffff",
    navBorder:   dark ? "#1a2d4a"   : "#e2e8f0",
    surface:     dark ? "#0d1a2e"   : "#ffffff",
    surfaceAlt:  dark ? "#0a1525"   : "#f7f9fb",
    border:      dark ? "#1a2d4a"   : "#e2e8f0",
    borderSub:   dark ? "#122040"   : "#f2f4f6",
    textPrimary: dark ? "#d4e3ff"   : "#002449",
    textBody:    dark ? "#8aadce"   : "#43474f",
    textMuted:   dark ? "#4a6a8a"   : "#737780",
    textHeading: dark ? "#d4e3ff"   : "#002449",
    navy:        "#002449",
    blue:        "#1d4ed8",
    blueLight:   dark ? "rgba(29,78,216,0.15)" : "rgba(29,78,216,0.07)",
    blueBorder:  dark ? "rgba(29,78,216,0.35)" : "rgba(29,78,216,0.15)",
    inputBg:     dark ? "#0d1a2e"   : "#ffffff",
    inputBorder: dark ? "#1a2d4a"   : "#c3c6d0",
    statBg:      dark ? "#0a1525"   : "#f2f4f6",
    rowAlt:      dark ? "#0a1525"   : "#f7f9fb",
    passColor:   dark ? "#4ade80"   : "#1a7a4a",
    failColor:   dark ? "#f87171"   : "#ba1a1a",
    footerBg:    dark ? "#040c18"   : "#002449",
    footerBorder:dark ? "#0d1a2e"   : "#0b3a6a",
    footerText:  "rgba(255,255,255,0.85)",
    footerMuted: "rgba(255,255,255,0.35)",
  };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'IBM Plex Sans', sans-serif", background: c.bg, color: c.textPrimary, transition: "background 0.2s, color 0.2s" }}>

      {/* ── Navbar ── */}
      <nav style={{ background: c.navBg, borderBottom: `1px solid ${c.navBorder}`, position: "sticky", top: 0, zIndex: 50, transition: "background 0.2s" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }} className="px-4 sm:px-16">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={collegeLogo} alt="GGC Logo" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: c.textHeading }}>
              GGC Jhang Result System
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={toggleTheme}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                background: "none",
                border: `1px solid ${c.border}`,
                borderRadius: 4,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: c.textBody,
                transition: "border-color 0.2s, color 0.2s",
              }}
            >
              {dark ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
            </button>
            <button
              onClick={onStaffLogin}
              style={{
                background: c.blue,
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'IBM Plex Sans', sans-serif",
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              Staff Login
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1440, margin: "0 auto", paddingTop: "72px", paddingBottom: "64px" }} className="px-4 sm:px-16">
        <div style={{ display: "flex", alignItems: "flex-start" }} className="flex-col lg:flex-row gap-8 lg:gap-20">
          {/* Left */}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.02em", color: c.textHeading, marginBottom: 16 }}>
              Official<br />Examination Result<br />Portal
            </h1>
            <p style={{ fontSize: 16, fontWeight: 400, color: c.textBody, marginBottom: 20 }}>
              Secure Academic Verification System
            </p>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: c.textMuted, lineHeight: 1.6 }}>
              Managed by Department of Computer Science in Collaboration<br />with Examination Branch.
            </p>
          </div>

          {/* Right — Search Form */}
          <div style={{ flexShrink: 0, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 4, padding: 28, transition: "background 0.2s, border-color 0.2s" }} className="w-full lg:w-[340px]">
            {(["Department", "Session", "Roll Number"] as const).map((label, i) => (
              <div key={label}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: c.textMuted, marginBottom: 6 }}>
                  {label}
                </label>
                {i === 0 ? (
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : "")}
                    style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: `1px solid ${c.inputBorder}`, borderRadius: 4, outline: "none", fontFamily: "'IBM Plex Sans', sans-serif", color: departmentId ? c.textPrimary : c.textMuted, background: c.inputBg, marginBottom: 12, boxSizing: "border-box", transition: "background 0.2s, border-color 0.2s", cursor: "pointer" }}
                  >
                    <option value="">Select department…</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                ) : i === 1 ? (
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: `1px solid ${c.inputBorder}`, borderRadius: 4, outline: "none", fontFamily: "'IBM Plex Sans', sans-serif", color: selectedSession ? c.textPrimary : c.textMuted, background: c.inputBg, marginBottom: 12, boxSizing: "border-box", transition: "background 0.2s, border-color 0.2s", cursor: "pointer" }}
                  >
                    <option value="">Select session…</option>
                    {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. 109400"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: `1px solid ${c.inputBorder}`, borderRadius: 4, outline: "none", fontFamily: "'IBM Plex Sans', sans-serif", color: c.textPrimary, background: c.inputBg, marginBottom: 12, boxSizing: "border-box", transition: "background 0.2s, border-color 0.2s" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = c.blue; e.currentTarget.style.boxShadow = `0 0 0 2px rgba(29,78,216,0.2)`; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = c.inputBorder; e.currentTarget.style.boxShadow = "none"; }}
                  />
                )}
              </div>
            ))}
            <button
              onClick={handleLookup}
              disabled={loading || !rollNo.trim() || !departmentId || !selectedSession}
              style={{
                width: "100%",
                background: c.blue,
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "11px 0",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'IBM Plex Sans', sans-serif",
                cursor: (loading || !rollNo.trim() || !departmentId || !selectedSession) ? "not-allowed" : "pointer",
                opacity: (loading || !rollNo.trim() || !departmentId || !selectedSession) ? 0.55 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Search style={{ width: 15, height: 15 }} />
              {loading ? "Searching…" : "Search Result"}
            </button>
            {error && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(186,26,26,0.08)", border: "1px solid rgba(186,26,26,0.22)", borderRadius: 4, fontSize: 12, color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                <XCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
                {error}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Result Display ── */}
      {data && (
        <section style={{ maxWidth: 1440, margin: "0 auto", paddingBottom: "64px" }} className="px-4 sm:px-16">
          <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ background: c.navy, padding: "14px 24px", display: "flex", alignItems: "center", gap: 10 }}>
              <Shield style={{ width: 16, height: 16, color: "#a5c8ff" }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a5c8ff" }}>Verified Academic Record</span>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 48px", flex: 1 }}>
                {[
                  ["Name", data.student.name],
                  ["Roll No", data.student.rollNo],
                  ["Father", data.student.fatherName],
                  ["CNIC", data.student.cnic || "—"],
                  ["Session", data.student.session],
                  ["Department", data.student.departmentName ?? "—"],
                ].map(([label, val]) => (
                  <div key={String(label)} style={{ fontSize: 13 }}>
                    <span style={{ color: c.textMuted, marginRight: 4 }}>{label}:</span>
                    <span style={{ color: c.textPrimary, fontWeight: label === "Roll No" ? 600 : 400 }}>{String(val)}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: c.statBg, border: `1px solid ${c.border}`, borderRadius: 4, padding: "16px 24px", textAlign: "center", minWidth: 120 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: c.textMuted, marginBottom: 4 }}>CGPA</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: c.textHeading, fontFamily: "'IBM Plex Mono', monospace" }}>{data.cgpa.toFixed(2)}</div>
                <div style={{ fontSize: 10, color: c.textMuted }}>out of 4.00</div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${c.border}`, padding: "12px 24px", background: c.surfaceAlt, display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: c.textBody }}>Courses: <strong style={{ color: c.textPrimary }}>{data.results.length}</strong></span>
              <span style={{ fontSize: 12, color: c.textBody }}>Passed: <strong style={{ color: c.passColor }}>{data.passCount}</strong></span>
              <span style={{ fontSize: 12, color: c.textBody }}>Failed: <strong style={{ color: c.failColor }}>{data.failCount}</strong></span>
              <span style={{ fontSize: 12, color: c.textBody }}>Credits: <strong style={{ color: c.textPrimary }}>{data.totalCredits}</strong></span>
              <button
                onClick={handleDownload}
                style={{ marginLeft: "auto", background: c.navy, color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 12, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Download style={{ width: 13, height: 13 }} /> Download Transcript
              </button>
            </div>
          </div>

          {Object.entries(grouped).map(([sess, semesters]) => (
            <div key={sess} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: c.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.blue, display: "inline-block" }} />
                Session: {sess}
              </h3>
              {Object.entries(semesters).sort(([a], [b]) => a.localeCompare(b)).map(([sem, rows]) => (
                <div key={sem} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ padding: "10px 16px", background: c.surfaceAlt, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: c.textHeading }}>{sem}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 2, background: c.blueLight, border: `1px solid ${c.blueBorder}`, color: c.blue, fontWeight: 600 }}>
                      {rows.length} course{rows.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: c.surfaceAlt, borderBottom: `1px solid ${c.border}` }}>
                          {["Code", "Course Title", "Internal", "Mid-Term", "Final", "Practical", "Total", "%", "Grade", "GP", "Cr", "Status"].map((h) => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: h === "Course Title" ? "left" : "center", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: c.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx) => (
                          <tr key={r.id} style={{ borderBottom: idx < rows.length - 1 ? `1px solid ${c.borderSub}` : "none", background: idx % 2 === 0 ? c.surface : c.rowAlt }}>
                            <td style={{ padding: "9px 12px", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", color: c.textBody, whiteSpace: "nowrap" }}>{r.courseCode}</td>
                            <td style={{ padding: "9px 12px", color: c.textPrimary, maxWidth: 220 }}>{r.courseTitle}{(r.isSupplementary || r.status === "Fail") ? <span style={{ color: "#f97316", fontWeight: 700, marginLeft: 2 }}>*</span> : null}</td>
                            {[r.internalMarks, r.midTerm, r.finalTerm, r.practicalWork].map((v, i) => (
                              <td key={i} style={{ padding: "9px 12px", textAlign: "center", color: v > 0 ? c.textBody : c.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>{v > 0 ? v : "—"}</td>
                            ))}
                            <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700, color: c.textHeading, fontFamily: "'IBM Plex Mono', monospace" }}>{r.totalObtained}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", color: c.textBody, fontFamily: "'IBM Plex Mono', monospace" }}>{r.percentage.toFixed(1)}%</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: ["A", "A-"].includes(r.grade) ? c.passColor : ["B+", "B", "B-"].includes(r.grade) ? c.blue : ["C+", "C", "C-"].includes(r.grade) ? "#f59e0b" : c.failColor }}>{r.grade}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", color: c.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>{r.gradePoint.toFixed(2)}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", color: c.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>{r.creditHours ?? "—"}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: r.status === "Pass" ? c.passColor : c.failColor }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.status === "Pass" ? c.passColor : c.failColor, display: "inline-block" }} />
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {/* ── Sections shown when no result ── */}
      {!data && (
        <>
          {/* ── Ticker Banner ── */}
          <div style={{ background: "#002449", borderTop: "1px solid #0b3a6a", borderBottom: "1px solid #0b3a6a", overflow: "hidden" }}>
            <div style={{ padding: "10px 0", display: "flex", alignItems: "center" }}>
              <div style={{ background: c.blue, padding: "0 20px", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, height: 32, borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                <Shield style={{ width: 12, height: 12, color: "#fff" }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffffff", whiteSpace: "nowrap" }}>
                  Government Graduate College Jhang
                </span>
              </div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ display: "inline-flex", gap: 0, animation: "ticker 30s linear infinite", whiteSpace: "nowrap" }}>
                  {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                    <span key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", padding: "0 28px", borderRight: "1px solid rgba(255,255,255,0.12)", display: "inline-flex", alignItems: "center", gap: 6, height: 32 }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(165,200,255,0.5)", display: "inline-block", flexShrink: 0 }} />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── System Features ── */}
          <section style={{ maxWidth: 1440, margin: "0 auto", paddingTop: "72px", paddingBottom: "72px" }} className="px-4 sm:px-16">
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: 28, fontWeight: 600, color: c.textHeading, marginBottom: 12, letterSpacing: "-0.01em" }}>System Features</h2>
              <div style={{ width: 40, height: 3, background: c.blue, margin: "0 auto", borderRadius: 2 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
              {FEATURES.map(({ icon, title, desc }) => (
                <div key={title} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 4, padding: "28px 24px", transition: "background 0.2s, border-color 0.2s" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: c.blueLight, border: `1px solid ${c.blueBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: c.blue }}>{icon}</span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: c.textHeading, marginBottom: 8, lineHeight: 1.4 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: c.textBody, lineHeight: 1.65 }}>{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Institutional Compliance ── */}
          <section style={{ background: c.surface, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, transition: "background 0.2s" }}>
            <div style={{ maxWidth: 1440, margin: "0 auto", paddingTop: "72px", paddingBottom: "72px", display: "flex", alignItems: "center" }} className="px-4 sm:px-16 flex-col lg:flex-row gap-10 lg:gap-16">
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 24, fontWeight: 600, color: c.textHeading, marginBottom: 20, letterSpacing: "-0.01em" }}>Institutional Compliance</h2>
                <blockquote style={{ fontSize: 15, fontStyle: "italic", color: c.textBody, borderLeft: `3px solid ${c.blue}`, paddingLeft: 16, marginBottom: 20, lineHeight: 1.7 }}>
                  "This system is developed for secure academic record verification, ensuring transparency, reliability, and institutional integrity."
                </blockquote>
                <p style={{ fontSize: 13, color: c.textBody, lineHeight: 1.8 }}>
                  The <strong style={{ color: c.textHeading }}>GGC Jhang Result System</strong> serves as the primary gateway for official academic records. Maintained by the{" "}
                  <strong style={{ color: c.textHeading }}>Department of Computer Science</strong> in synergy with the{" "}
                  <strong style={{ color: c.textHeading }}>Examination Branch</strong>, the portal leverages advanced ledger technology to prevent tampering.
                </p>
              </div>
              <div style={{ flexShrink: 0, height: 220, background: "linear-gradient(135deg, #0b3a6a 0%, #142538 100%)", borderRadius: 4, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }} className="w-full lg:w-[340px]">
                <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                  <Lock style={{ width: 40, height: 40, color: "rgba(165,200,255,0.5)", margin: "0 auto 12px" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(165,200,255,0.6)" }}>Secure Infrastructure</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section style={{ maxWidth: 1440, margin: "0 auto", paddingTop: "72px", paddingBottom: "72px" }} className="px-4 sm:px-16">
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <h2 style={{ fontSize: 28, fontWeight: 600, color: c.textHeading, marginBottom: 12, letterSpacing: "-0.01em" }}>Frequently Asked Questions</h2>
                <div style={{ width: 40, height: 3, background: c.blue, margin: "0 auto", borderRadius: 2 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FAQ.map(({ q, a }, i) => (
                  <div key={i} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 4, overflow: "hidden", transition: "background 0.2s" }}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "15px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 500, color: c.textHeading }}>{q}</span>
                      <ChevronDown style={{ width: 16, height: 16, color: c.blue, flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
                    </button>
                    {openFaq === i && (
                      <div style={{ padding: "0 20px 16px", paddingTop: 12, fontSize: 13, color: c.textBody, lineHeight: 1.7, borderTop: `1px solid ${c.borderSub}` }}>{a}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── Footer ── */}
      <footer style={{ background: c.footerBg, borderTop: `1px solid ${c.footerBorder}`, paddingTop: "28px", paddingBottom: "28px" }} className="px-4 sm:px-16">
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <img src={collegeLogo} alt="GGC Logo" style={{ width: 24, height: 24, objectFit: "contain", opacity: 0.85 }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: c.footerText }}>GGC Jhang Result System</span>
            </div>
            <p style={{ fontSize: 11, color: c.footerMuted }}>
              © {new Date().getFullYear()} Department of Computer Science &amp; Examination Branch. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}
