// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (
  buf: Buffer,
  opts?: { pagerender?: (page: unknown) => Promise<string> },
) => Promise<{ text: string }> = require("pdf-parse");

import { computeGrade, parseCreditHours, computePercentage } from "./grading";

export interface ParsedHeader {
  university?: string;
  department?: string;
  program?: string;
  session?: string;
  semester?: string;
  courseTitle?: string;
  courseCode?: string;
  creditHoursRaw?: string;
  creditHours?: number;
  maxMarks?: number;
  [key: string]: unknown;
}

export interface ParsedStudent {
  rollNo: string;
  name: string;
  fatherName: string;
  cnic: string;
  session: string;
  attempt: number;
  internalMarks: number;
  midTerm: number;
  finalTerm: number;
  practicalWork: number;
  totalObtained: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  status: "Pass" | "Fail";
  isSupplementary: boolean;
}

export interface ParsedSheet {
  header: ParsedHeader;
  students: ParsedStudent[];
}

// ── Column x-boundaries (PDF units) ─────────────────────────────────────────
// Determined empirically from GGC award sheet format.
// Each entry is [minX, maxX) for that column.
const X = {
  SR: [10, 32] as [number, number],
  ROLL: [32, 60] as [number, number],
  NAME: [60, 190] as [number, number],
  FATHER: [190, 320] as [number, number],
  CNIC: [320, 400] as [number, number],
  SESSION: [395, 465] as [number, number],
  ATTEMPT: [460, 500] as [number, number],
  INTERNAL: [495, 535] as [number, number],
  MID: [535, 578] as [number, number],
  FINAL: [575, 618] as [number, number],
  PRACTICAL: [615, 658] as [number, number],
};

function inCol(x: number, col: [number, number]): boolean {
  return x >= col[0] && x < col[1];
}

interface TextItem {
  str: string;
  x: number;
  y: number;
}

// Collect all text items with x/y positions from all pages.
// y is offset by pageIndex * PAGE_Y_OFFSET so that items from different
// pages never fall into the same line-group even if their raw y values match.
const PAGE_Y_OFFSET = 10_000;

async function extractItems(buffer: Buffer): Promise<TextItem[]> {
  const allItems: TextItem[] = [];
  let pageIndex = 0;

  await pdfParse(buffer, {
    pagerender: async (pageData: unknown) => {
      const currentPage = pageIndex++;
      const page = pageData as {
        getTextContent: () => Promise<{
          items: Array<{ str: string; transform: number[] }>;
        }>;
      };
      const content = await page.getTextContent();
      for (const item of content.items) {
        const str = item.str; // may include leading space
        if (str.trim()) {
          allItems.push({
            str: str.trim(),
            x: Math.round(item.transform[4]),
            // Offset y by page so pages never share a line-group
            y: Math.round(item.transform[5]) + currentPage * PAGE_Y_OFFSET,
          });
        }
      }
      return "";
    },
  });

  return allItems;
}

// Group text items into lines (same y ± tolerance)
function groupByLine(items: TextItem[]): Map<number, TextItem[]> {
  const lines = new Map<number, TextItem[]>();
  for (const item of items) {
    const existingKey = [...lines.keys()].find((k) => Math.abs(k - item.y) <= 2);
    const key = existingKey ?? item.y;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key)!.push(item);
  }
  // Sort each line's items by x
  for (const items of lines.values()) {
    items.sort((a, b) => a.x - b.x);
  }
  return lines;
}

function extractHeader(items: TextItem[]): ParsedHeader {
  // Flatten all items into a single text blob for header regex matching
  const fullText = items.map((i) => i.str).join(" ");
  const header: ParsedHeader = {};

  const deptM = fullText.match(/Department\s*:\s*([A-Za-z\s]+?)(?:Class\s*:|Semester\s*:)/);
  if (deptM) header.department = deptM[1].trim();

  const ccM = fullText.match(/Course\s*Code\s*:\s*([A-Z]{2,6}-?[A-Z0-9]{1,6})/);
  if (ccM) header.courseCode = ccM[1].trim();

  // Course title: appears as its own item(s) after "Course Title :"
  const ctStart = fullText.indexOf("Course Title :");
  if (ctStart >= 0) {
    const ctSlice = fullText.slice(ctStart + 14, ctStart + 150);
    const ctEnd = ctSlice.search(/Credit|Max|Sheet/i);
    header.courseTitle = (ctEnd > 0 ? ctSlice.slice(0, ctEnd) : ctSlice).trim().replace(/\s+/g, " ");
  }

  const sessM = fullText.match(/Session\s*:\s*(\d{4}-\d{4})/);
  if (sessM) header.session = sessM[1];

  const semM = fullText.match(/Semester\s*:\s*([\w\s]+?Semester)/);
  if (semM) header.semester = semM[1].trim();

  const chM =
    fullText.match(/Credit\s+Hours?\s*:\s*(\d+\([\d-]+\))/) ??
    fullText.match(/Credit\s+Hours?\s*:\s*([\d.]+)/);
  const chRaw = chM ? chM[1] : "3(2-1)";
  header.creditHoursRaw = chRaw;
  header.creditHours = parseCreditHours(chRaw);

  const mmM = fullText.match(/Max\s+Marks?\s*:\s*(\d+(?:\.\d+)?)/);
  header.maxMarks = mmM ? parseFloat(mmM[1]) : 60.0;

  return header;
}

function safeFloat(s: string): number {
  const n = parseFloat(s.replace(/[%,]/g, ""));
  return isNaN(n) ? 0 : n;
}

export async function parseAwardSheet(buffer: Buffer): Promise<ParsedSheet> {
  const allItems = await extractItems(buffer);
  const header = extractHeader(allItems);
  const maxMarks = header.maxMarks ?? 60;
  const headerSession = header.session ?? "";

  const lines = groupByLine(allItems);

  // Sort lines top-to-bottom (highest y first in PDF coordinate system)
  const sortedYs = [...lines.keys()].sort((a, b) => b - a);

  const students: ParsedStudent[] = [];
  const seenRolls = new Set<string>();

  // Accumulate fields across lines for multi-line rows
  let pendingRoll: string | null = null;
  let pendingName = "";
  let pendingFather = "";

  const ROLL_RE = /^\d{5,6}$/;
  const CNIC_RE = /^\d{5}-\d{7}-\d$/;

  function flushPending(
    cnic: string,
    session: string,
    attempt: number,
    internal: number,
    mid: number,
    final: number,
    practical: number,
  ) {
    if (!pendingRoll || seenRolls.has(pendingRoll)) {
      pendingRoll = null;
      pendingName = "";
      pendingFather = "";
      return;
    }

    const total = internal + mid + final + practical;
    const percentage = computePercentage(total, maxMarks);
    const { grade, gradePoint, status } = computeGrade(percentage);
    const sess = /^\d{4}-\d{4}$/.test(session) ? session : headerSession;
    // A student is supplementary if their enrollment session differs from the course's exam session.
    // In GCU-affiliated sheets, back-paper students show a different session in their row than the course header.
    const isSupplementary = headerSession !== "" && sess !== "" && sess !== headerSession;

    students.push({
      rollNo: pendingRoll,
      name: pendingName.trim() || "Unknown",
      fatherName: pendingFather.trim(),
      cnic,
      session: sess,
      attempt,
      internalMarks: internal,
      midTerm: mid,
      finalTerm: final,
      practicalWork: practical,
      totalObtained: total,
      percentage,
      grade,
      gradePoint: status === "Fail" ? 0 : gradePoint,
      status,
      isSupplementary,
    });

    seenRolls.add(pendingRoll);
    pendingRoll = null;
    pendingName = "";
    pendingFather = "";
  }

  for (const y of sortedYs) {
    const lineItems = lines.get(y)!;

    // Categorize items by column
    let sr = "";
    const nameParts: string[] = [];
    const fatherParts: string[] = [];
    let cnic = "";
    let session = "";
    let attempt = 1;
    let internal = 0;
    let mid = 0;
    let final = 0;
    let practical = 0;
    let rollNo = "";

    for (const item of lineItems) {
      const x = item.x;
      const s = item.str;

      if (inCol(x, X.SR)) {
        sr = s;
      } else if (inCol(x, X.ROLL)) {
        if (ROLL_RE.test(s)) rollNo = s;
      } else if (inCol(x, X.NAME)) {
        nameParts.push(s);
      } else if (inCol(x, X.FATHER)) {
        fatherParts.push(s);
      } else if (inCol(x, X.CNIC) && CNIC_RE.test(s)) {
        cnic = s;
      } else if (inCol(x, X.SESSION)) {
        if (/^\d{4}-\d{4}$/.test(s)) session = s;
      } else if (inCol(x, X.ATTEMPT)) {
        if (/^\d$/.test(s)) attempt = parseInt(s, 10);
      } else if (inCol(x, X.INTERNAL)) {
        internal = safeFloat(s);
      } else if (inCol(x, X.MID)) {
        mid = safeFloat(s);
      } else if (inCol(x, X.FINAL)) {
        final = safeFloat(s);
      } else if (inCol(x, X.PRACTICAL)) {
        practical = safeFloat(s);
      }
    }

    const nameStr = nameParts.join(" ").trim();
    const fatherStr = fatherParts.join(" ").trim();

    if (rollNo && ROLL_RE.test(rollNo)) {
      // This line starts a new student row.
      // Flush any previously pending row first (shouldn't normally happen if CNIC is on same line).
      if (pendingRoll && !cnic) {
        // Previous row had no CNIC yet; this is a new row, so abandon previous (shouldn't happen)
        pendingRoll = null;
        pendingName = "";
        pendingFather = "";
      }

      if (cnic) {
        // Complete single-line row: flush immediately
        if (!seenRolls.has(rollNo)) {
          pendingRoll = rollNo;
          pendingName = nameStr;
          pendingFather = fatherStr;
          flushPending(cnic, session, attempt, internal, mid, final, practical);
        }
      } else {
        // Multi-line row: name is on this line, CNIC will come on a later line
        if (!seenRolls.has(rollNo)) {
          pendingRoll = rollNo;
          pendingName = nameStr;
          pendingFather = fatherStr;
        }
      }
    } else if (pendingRoll && !rollNo) {
      // Continuation line for the current pending row
      if (cnic) {
        // This is the CNIC line for the pending multi-line row
        if (nameStr) pendingName = (pendingName + " " + nameStr).trim();
        if (fatherStr) pendingFather = (pendingFather + " " + fatherStr).trim();
        flushPending(cnic, session, attempt, internal, mid, final, practical);
      } else if (nameStr || fatherStr) {
        // Pure continuation: append to name/father based on x position
        if (nameStr) pendingName = (pendingName + " " + nameStr).trim();
        if (fatherStr) pendingFather = (pendingFather + " " + fatherStr).trim();
      } else {
        // Unrecognised line: skip (footer, header, blank, etc.)
      }
    }
  }

  return { header, students };
}
