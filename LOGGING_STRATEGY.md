# Logging Strategy — Task T2.4

**Addresses Design Review Issue 4 (LOW): Logging component design and implementation**

## What Is Logged

| Layer | Events Logged | Level |
|-------|----------------|-------|
| BookController | Incoming search/add requests (type/value, truncated title), unhandled errors | INFO / ERROR |
| BookService | Add/search operation start, validation failures, successful completion, persistence/search errors | INFO / WARN / ERROR |
| ValidationService | (Pure logic, no side effects — failures surface via BookService's WARN log of validation errors) | — |
| ExcelPersistence | Data directory creation, book added, books retrieved (with count), file read/write errors | INFO / ERROR |

## What Is NOT Logged

- Full request bodies or response bodies (only relevant identifiers/fields, e.g.
  book title truncated to 50 chars, search criteria type/value).
- No secrets, credentials, or authentication tokens are logged (the application
  has no authentication).
- Stack traces are logged server-side only (via `Logger.error`) and never
  returned to the HTTP client — client responses use the generic messages in
  `ErrorMessages.ts`.

## Log Levels

`debug < info < warn < error` (configured via `LOG_LEVEL` environment variable,
defaulting to `info`). Each `Logger` instance is scoped to a component name
(e.g., `BookService`, `ExcelPersistence`) for traceability.

## Format

`[<ISO-8601 timestamp>] [<LEVEL>] [<Component>] <message> | <JSON data>`

Example:
```
[2026-08-27T13:35:56.234Z] [INFO] [BookService] Search completed | {"type":"title","resultCount":1}
```

## Implementation

- `src/logger/Logger.ts` — `Logger` class with `debug()`, `info()`, `warn()`,
  `error()` methods; `shouldLog()` filters by configured level;
  `error()` accepts an optional `Error` or arbitrary value and serializes it
  without leaking it to HTTP responses.
- Each service/controller constructs its own `Logger` instance scoped to its
  component name (`new Logger('BookService', 'info')`, etc.).
- `LOG_LEVEL` is read from environment configuration (`.env.example`) and
  can be overridden per deployment.

## Verification

Covered by `tests/unit/logger/Logger.test.ts`: log level filtering (debug/info/
warn/error), Error vs. non-Error formatting, and message/timestamp/component
formatting.
