# Error Message Templates — Task T2.3

**Addresses Design Review Issue 3 (LOW): Error message templates**

All messages below are exported as constants from `src/constants/ErrorMessages.ts`
and are the *only* source of user-facing text used by `ValidationService`,
`BookService`, and `BookController` — no ad-hoc strings are used in error
responses.

## Style Guidelines

- Identify the affected field by name (returned alongside the message in the
  `{ field, message }` shape).
- Explain the problem in plain language — no stack traces, exception class
  names, or technical jargon in any message shown to the user.
- Keep messages short (one sentence) and actionable where possible.

## Validation Error Messages

| Constant | Message | Trigger |
|----------|---------|---------|
| `TITLE_REQUIRED` | Title is required | Title missing or empty |
| `TITLE_MAX_LENGTH` | Title must be 255 characters or less | Title exceeds 255 characters |
| `TITLE_WHITESPACE_ONLY` | Title cannot be only whitespace | Title is only spaces/tabs |
| `AUTHOR_REQUIRED` | Author is required | Author missing or empty |
| `AUTHOR_MAX_LENGTH` | Author must be 255 characters or less | Author exceeds 255 characters |
| `AUTHOR_WHITESPACE_ONLY` | Author cannot be only whitespace | Author is only spaces/tabs |
| `ISBN_REQUIRED` | ISBN is required | ISBN missing or empty |
| `ISBN_WHITESPACE_ONLY` | ISBN cannot be only whitespace | ISBN is only spaces/tabs |

## Persistence / Search / Server Error Messages

| Constant | Message | Trigger |
|----------|---------|---------|
| `UNABLE_TO_SAVE` | Unable to save book to database | Excel write failure while adding a book |
| `UNABLE_TO_READ` | Unable to read books from database | Excel read failure |
| `NO_SEARCH_CRITERIA` | Please provide a search criterion (title, author, or isbn) | Search request with no query parameters |
| `UNABLE_TO_SEARCH` | Unable to search at this time | Search operation failure |
| `SERVER_ERROR` | An unexpected error occurred. Please try again later | Any unhandled/unexpected exception |

## Response Shape

Field-level validation errors are returned as an array under `errors`:
```json
{ "success": false, "errors": [{ "field": "title", "message": "Title is required" }] }
```

Generic/system errors are returned as a single `message`:
```json
{ "success": false, "message": "An unexpected error occurred. Please try again later" }
```

## Verification

Enforced and tested in `tests/unit/services/ValidationService.test.ts`,
`tests/unit/services/BookService.test.ts`,
`tests/unit/controllers/BookController.test.ts`, and
`tests/integration/api-endpoints.test.ts` (including the AC-012 test verifying
messages contain no technical jargon such as "Error" or exception class names).
