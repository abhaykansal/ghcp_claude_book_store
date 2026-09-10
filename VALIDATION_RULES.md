# Validation Rules Reference — Task T2.3

Implemented in `src/services/ValidationService.ts`.

## Title

- Required (cannot be empty or non-string).
- Cannot be only whitespace.
- Maximum 255 characters (length checked before trimming, per
  `ValidationService`; trimming for storage happens in `BookService`).
- Special characters and Unicode are accepted.

## Author

- Required (cannot be empty or non-string).
- Cannot be only whitespace.
- Maximum 255 characters.
- Special characters and Unicode are accepted.

## ISBN

- Required (cannot be empty or non-string).
- Cannot be only whitespace.
- No specific format/checksum validation is enforced (ISBN-10, ISBN-13, or any
  non-empty identifier is accepted) — this matches the current requirements
  scope (see requirements.md), which does not mandate ISBN checksum
  validation.

## Examples of Invalid Input

| Field | Invalid Value | Resulting Message |
|-------|----------------|--------------------|
| Title | `""` | Title is required |
| Title | `"   "` | Title cannot be only whitespace |
| Title | `"a".repeat(256)` | Title must be 255 characters or less |
| Author | `""` | Author is required |
| Author | `"   "` | Author cannot be only whitespace |
| Author | `"a".repeat(256)` | Author must be 255 characters or less |
| ISBN | `""` | ISBN is required |
| ISBN | `"   "` | ISBN cannot be only whitespace |

All rules are exercised in `tests/unit/services/ValidationService.test.ts`.
