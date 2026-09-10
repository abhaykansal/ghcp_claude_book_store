# Concurrent Write Strategy Decision — Task T2.2

**Addresses Design Review Issue 2 (MEDIUM): Concurrent write strategy**

## Options Evaluated

1. **OS-level file locking with retry** — Rely on the filesystem to lock
   `books.xlsx` during a write; retry with backoff on lock conflicts.
2. **In-memory write queue with serialized writer** — Serialize all write
   operations to the Excel file through a single in-process async queue, so only
   one write is ever in flight regardless of how many `addBook()` calls arrive
   concurrently.

## Decision

**Selected: In-memory write queue (Option 2).**

## Rationale

- The application runs as a **single Node.js process** with **no clustering**
  in the target deployment (Section 11 of architecture.md), so an in-process
  queue is sufficient to fully serialize writes — no cross-process coordination
  is needed.
- OS-level file locking behaves inconsistently across platforms (Windows vs.
  Linux/macOS) and adds retry/backoff complexity without benefit in a
  single-process deployment.
- A write queue guarantees **no partial/interleaved writes** to the Excel file:
  each `addBook()` call reads the current file, appends a row, and writes it
  back — and the queue ensures these three steps never overlap between
  concurrent callers.
- Trade-off accepted: `addBook()` calls are processed **one at a time**, so
  under heavy concurrent load, later calls wait for earlier ones to finish
  (added latency), but this is preferable to file corruption or lost writes.

## Implementation

Implemented in `src/persistence/ExcelPersistence.ts`:
- `writeQueue: Array<() => Promise<void>>` holds pending write operations.
- `isWriting` flag plus `processWriteQueue()` ensures only one write operation
  executes at a time; subsequent `addBook()` calls enqueue and await their turn.
- Each queued operation performs the full read-modify-write cycle (open
  workbook → read or create → append row → write file) before the next
  operation starts.

## Verification

`tests/unit/persistence/ExcelPersistence.test.ts` includes
`should serialize multiple concurrent addBook calls without data loss`, which
issues 3 concurrent `addBook()` calls and verifies all 3 receive unique
BookIDs and all 3 writes occur (no data loss, no corruption).
