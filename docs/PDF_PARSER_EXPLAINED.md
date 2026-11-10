# PDF award-sheet parser

Source: artifacts/api-server/src/lib/pdfParser.ts. It uses pdf-parse and returns a ParsedSheet containing a ParsedHeader and ParsedStudent array.

## Extraction

pdf-parse is called with a custom pagerender callback. For each page, getTextContent() returns text items and transform matrices. The parser records trimmed text and rounded X/Y coordinates. It adds a 10,000-unit Y offset per page so page rows cannot be grouped together. This is text-layer extraction, not OCR; image-only scanned PDFs are not handled by this logic alone.

## Coordinate columns

| Field | X range |
|---|---:|
| Serial | 10-32 |
| Roll | 32-60 |
| Name | 60-190 |
| Father | 190-320 |
| CNIC | 320-400 |
| Session | 395-465 |
| Attempt | 460-500 |
| Internal | 495-535 |
| Midterm | 535-578 |
| Final | 575-618 |
| Practical | 615-658 |

These ranges are empirically calibrated to a specific award-sheet format. Some ranges touch/overlap at boundaries; add tests for edge positions.

## Line and header parsing

Text items within two Y units are grouped into a line and sorted by X. Header extraction flattens text and uses regular expressions for department, course code/title, session, semester, credit hours and max marks. Current fallbacks include 3(2-1) credit hours and 60 maximum marks; verify these defaults against official sheets.

## Student reconstruction

Roll number regex: 5-6 digits. CNIC regex: 5 digits, hyphen, 7 digits, hyphen, 1 digit. The parser classifies each item by X range, accumulates name/father fragments and marks, and keeps a pending student row when CNIC appears on a continuation line. A Set suppresses duplicate roll numbers within a sheet.

## Calculations

Marks total = internal + midterm + final + practical. Percentage uses header max marks. grading.ts supplies grade/status/grade point. Row session falls back to header session. Supplementary is inferred when row session differs from header session. Failed records receive zero grade points.

## Upload integration

courses.ts uses Multer memory storage with a 10 MB cap and PDF MIME/extension checks, calls parseAwardSheet(), validates course code/title and at least one student, then inserts or merges course/student/result records.

## Limitations and tests

- Template-specific fixed X coordinates; new layouts may shift columns.
- No OCR for image-only PDFs.
- PDF text order and coordinates can vary by generator.
- Y tolerance may split or merge rows.
- Header regexes and default values need fixture coverage.
- Verify marks model and supplementary policy with academic staff.

Add regression fixtures for normal and multi-page sheets, multi-line records, supplementary rows, duplicates, malformed headers, scanned PDFs, changed coordinates, missing marks and grading boundaries.
