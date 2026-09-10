# Performance Validation — Task T2.1

**Addresses Design Review Issue 1 (MEDIUM): Search performance validation**

## Requirement

Search response time must be <200ms at p95 for datasets of 100-1000 books.

## Method

Benchmark script: `spike/performance-benchmark.ts` (run with `npx ts-node spike/performance-benchmark.ts`).

The benchmark uses the **real** `ExcelPersistence` and `SearchEngine` implementations
(not mocks) against a temporary Excel file. For each dataset size (100, 500, 1000
books), it seeds the file via `addBook()`, then executes 30 full request cycles of
`getAllBooks()` (Excel file read + parse) followed by `searchByTitle()` (in-memory
filter + sort), measuring end-to-end latency per cycle.

## Results (measured on development machine, 2026-08-27)

| Dataset Size | p50 (ms) | p95 (ms) | p99 (ms) |
|--------------|---------:|---------:|---------:|
| 100 books    | 3.43     | 8.47     | 10.57    |
| 500 books    | 8.73     | 10.34    | 11.06    |
| 1000 books   | 16.43    | 19.56    | 22.68    |

**Max p95 across all dataset sizes: 19.56ms**

## Analysis

Performance **meets the <200ms p95 requirement** with significant headroom (>10x
margin at 1000 books). The dominant cost is the full Excel file read via ExcelJS on
every search request (append-only, read-all-then-filter architecture); in-memory
filtering and sorting are negligible by comparison. Latency scales roughly linearly
with dataset size, so the architecture is expected to remain well within budget for
the expected catalog sizes (hundreds to low thousands of books).

## Conclusion

**PASS** — No architecture change required. Proceed with implementation as planned
(read-all Excel file → in-memory filter/sort per request).

## Recommendations

- If catalog size grows beyond ~5,000-10,000 books, consider caching the parsed book
  list in memory between requests (invalidated on write) to avoid repeated full-file
  reads. Not required for the current scope.
