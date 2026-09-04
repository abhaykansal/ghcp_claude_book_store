/**
 * Book Entity - Represents a book in the library catalog
 * This is the primary data model used throughout the application
 *
 * Eight-field model per SCRUM-9 requirements:
 * 1. Book Name (1-255 chars, text, mandatory)
 * 2. Author Name (1-255 chars, text, mandatory)
 * 3. ISBN (valid ISBN-10 or ISBN-13, text, mandatory, unique key)
 * 4. Publication Year (4 digits, number, not future, mandatory)
 * 5. Genre (one of 11 predefined values, mandatory)
 * 6. Publisher (1-255 chars, text, mandatory)
 * 7. Total Copies (positive integer, mandatory)
 * 8. Available Copies (non-negative integer, ≤ Total Copies, mandatory)
 *
 * NOTE: No surrogate BookID. ISBN is the unique identifier per FR-03.
 * NOTE: No dateAdded. Only user-supplied fields are stored.
 */

/**
 * Genre values - single source of truth for all 11 allowed genres
 * Used in validation, dropdown rendering, and database persistence
 * This constant is the SOLE source of the genre list in the codebase
 * (frontend dropdown, API endpoint, validation rules all consume this)
 */
export const GENRE_VALUES = [
  'Fiction',
  'Non-Fiction',
  'Science',
  'Technology',
  'History',
  'Biography',
  'Children',
  'Fantasy',
  'Mystery',
  'Romance',
  'Other',
] as const;

/**
 * Genre type - Literal union of all genre values
 */
export type Genre = typeof GENRE_VALUES[number];

/**
 * Book interface - Core domain model
 * All 8 fields, no surrogate key
 */
export interface Book {
  /** Book title/name (max 255 characters) */
  bookName: string;

  /** Author name (max 255 characters) */
  authorName: string;

  /** ISBN identifier (ISBN-10 or ISBN-13, unique across all books) */
  isbn: string;

  /** Year of publication (4-digit number, not greater than current year) */
  publicationYear: number;

  /** Genre category (one of GENRE_VALUES) */
  genre: Genre;

  /** Publisher name (max 255 characters) */
  publisher: string;

  /** Total number of copies in inventory (positive integer) */
  totalCopies: number;

  /** Number of copies currently available (non-negative integer, ≤ totalCopies) */
  availableCopies: number;
}

/**
 * Request DTO for adding a new book
 * Client sends these 8 fields; server validates and stores
 */
export interface AddBookRequest {
  bookName: string;
  authorName: string;
  isbn: string;
  publicationYear: number;
  genre: string; // Sent as string from client; validated server-side to be a Genre
  publisher: string;
  totalCopies: number;
  availableCopies: number;
}

/**
 * Response DTO for successfully added book
 */
export interface AddBookResponse {
  success: true;
  message: string;
  book: Book;
}

/**
 * Response DTO for search results
 * Can be zero results (empty array) — this is not an error
 */
export interface SearchResponse {
  success: true;
  count: number;
  results: Book[];
}

/**
 * Error response DTO - used when validation/persistence/search fails
 */
export interface ErrorResponse {
  success: false;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  message?: string;
}

/**
 * Validation error with field and message
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Result of validation with errors array (collected, not just first)
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Custom Exception Types
 * Replaces the exception types previously defined in BookService.ts
 * for a cleaner separation of concerns
 */

/**
 * ValidationException - thrown when input validation fails
 * Contains collected validation errors (one per failing field)
 */
export class ValidationException extends Error {
  public readonly validationErrors: ValidationError[];

  constructor(validationErrors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
    this.validationErrors = validationErrors;
  }
}

/**
 * DuplicateIsbnException - thrown when ISBN uniqueness check fails
 * This is a BINDING architectural decision per architecture.md §3.4:
 * Duplicate detection happens INSIDE the serialized write-queue operation
 * in ExcelPersistence, NOT in ValidationEngine, to ensure TOCTOU-race safety.
 * Receiving this exception means: the ISBN is already in use, no write occurred,
 * original record is byte-for-byte unchanged (per AC-04).
 */
export class DuplicateIsbnException extends Error {
  public readonly isbn: string;

  constructor(isbn: string) {
    super(`A book with ISBN ${isbn} already exists`);
    this.name = 'DuplicateIsbnException';
    this.isbn = isbn;
  }
}

/**
 * PersistenceException - thrown when Excel read/write fails
 * Includes file-lock specific messages per M-2 (T-08)
 */
export class PersistenceException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PersistenceException';
  }
}

/**
 * SearchException - thrown when search operation fails (e.g., getAllBooks fails)
 */
export class SearchException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchException';
  }
}
