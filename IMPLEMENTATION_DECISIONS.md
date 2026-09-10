# Excel Library Selection — Task T1.3

**Addresses Design Review Issue 6 (LOW): Excel library selection**

## Libraries Evaluated

| Criteria | ExcelJS | xlsx (SheetJS) |
|----------|---------|----------------|
| Read/write API | Object-oriented, promise-based (`workbook.xlsx.readFile/writeFile`) | Buffer/array-of-arrays based, more low-level |
| TypeScript support | First-class, actively maintained `@types` bundled | Community types, less ergonomic for row-by-row access |
| Streaming support | Yes (useful if catalog grows large) | Limited |
| Bundle size | Larger (~1MB+) | Smaller |
| Documentation | Clear, example-driven | Good but oriented around spreadsheet-wide operations |
| License | MIT | Apache-2.0 |

## Decision

**Selected: ExcelJS**

## Rationale

- ExcelJS's promise-based API (`workbook.xlsx.readFile`, `worksheet.addRow`,
  `worksheet.eachRow`) maps cleanly onto the append-only read-modify-write
  pattern required by `ExcelPersistence` (Task T3.3), with less boilerplate
  than xlsx's array-of-arrays model.
- Native async/await support avoids callback-style or synchronous blocking
  file I/O, which matters for an Express request-handling process.
- The performance benchmark in `PERFORMANCE_VALIDATION.md` confirms ExcelJS
  read/write performance is well within the <200ms p95 search budget for
  catalogs up to 1000 books.

## Implementation

- Added as a direct dependency in `package.json` (`exceljs`).
- Used directly in `src/persistence/ExcelPersistence.ts` (the sole component
  that touches the Excel library, per the architecture's persistence-layer
  abstraction — `IPersistence`/`ExcelPersistence` isolates all other code
  from the specific library choice).
