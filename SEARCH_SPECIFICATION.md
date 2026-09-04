# Search Result Sorting Specification — Task T2.5

**Addresses Design Review Issue 5 (LOW): Search result sorting specification**

## Decision

| Search Type | Sort Order |
|--------------|-----------|
| Title search  | Alphabetical by Title (A-Z), case-insensitive comparison via `localeCompare` |
| Author search | Alphabetical by Author (A-Z) first, then by Title (A-Z) as a tie-breaker |
| ISBN search   | Not applicable — ISBN is an exact match, so at most one result is returned |

## Rationale

- Users scanning search results expect a predictable, alphabetical order —
  consistent with how a library catalog or bookstore search would present
  results.
- Sorting by the searched field first (Title for title search, Author for
  author search) keeps the primary match criterion visually grouped and
  scannable.
- The Author-then-Title tie-breaker ensures a deterministic order when
  multiple books share the same author.
- ISBN search returns a single exact match (or none), so sorting does not
  apply.

## Example

Given books titled `["Zoo Story", "Apple Tree", "Banana Republic"]` all
matching a search term, results are returned as:
`["Apple Tree", "Banana Republic", "Zoo Story"]`.

## Implementation

Implemented in `src/services/SearchEngine.ts`:
- `searchByTitle()` sorts matched results with
  `results.sort((a, b) => a.title.localeCompare(b.title))`.
- `searchByAuthor()` sorts matched results by author, then title, using a
  two-key comparator.
- `searchByISBN()` performs an exact match and returns at most one result
  (no sorting needed).

## Verification

Covered by `tests/unit/services/SearchEngine.test.ts`, including:
- `should sort results alphabetically by title`
- `should sort results by author then title`
- `should sort by author name first when authors differ`
