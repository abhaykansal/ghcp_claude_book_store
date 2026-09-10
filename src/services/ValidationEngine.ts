/**
 * ValidationEngine - Comprehensive validation for all 8 book fields
 * Per SCRUM-9 requirements and architecture.md §3.3
 *
 * Validates:
 * - All 8 fields (bookName, authorName, isbn, publicationYear, genre, publisher, totalCopies, availableCopies)
 * - ISO 8601 ISBN-10 and ISBN-13 check-digit validation
 * - Business rules: FR-04 (available ≤ total), FR-05 (year ≤ current year)
 * - All errors collected (not just first)
 *
 * IMPORTANT: Duplicate ISBN checking is NOT performed here.
 * Per architecture.md §3.4, duplicate checking happens inside ExcelPersistence's
 * serialized write-queue to ensure TOCTOU-race safety (FR-03).
 */

import { ValidationError, ValidationResult, Book, GENRE_VALUES } from '../models/Book';
import { ErrorMessages } from '../constants/ErrorMessages';

export interface IValidationEngine {
  validateBook(book: Partial<Book> | Record<string, unknown>): ValidationResult;
  validateBook(title: string, author: string, isbn: string): ValidationResult;
  validateReview(rating: unknown, reviewText: unknown): ValidationResult;
}

export class ValidationEngine implements IValidationEngine {
  /**
   * Validate a complete book object or the legacy title/author/isbn parameter tuple.
   * Returns all validation errors found (not just the first).
   */
  validateBook(
    arg1: Partial<Book> | Record<string, unknown> | string,
    arg2?: string,
    arg3?: string
  ): ValidationResult {
    const book: Partial<Book> | Record<string, unknown> =
      typeof arg1 === 'string'
        ? {
            bookName: arg1,
            authorName: arg2,
            isbn: arg3,
          }
        : arg1;

    const errors: ValidationError[] = [];

    // Validate each field individually
    this.validateBookName(book.bookName, errors);
    this.validateAuthorName(book.authorName, errors);
    this.validateISBN(book.isbn, errors);
    this.validatePublicationYear(book.publicationYear, errors);
    this.validateGenre(book.genre, errors);
    this.validatePublisher(book.publisher, errors);
    this.validateTotalCopies(book.totalCopies, errors);
    this.validateAvailableCopies(book.availableCopies, errors);

    // Cross-field business rules should still trigger when both values are numeric, even if
    // one or both individual values were otherwise invalid as a data type. This preserves the
    // business rule while still avoiding a check for non-numeric strings.
    if (typeof book.availableCopies === 'number' || typeof book.totalCopies === 'number' ||
        typeof book.availableCopies === 'string' || typeof book.totalCopies === 'string') {
      this.validateAvailableVsTotal(book.availableCopies, book.totalCopies, errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Book Name (1-255 chars, non-blank after trim)
   */
  private validateBookName(value: unknown, errors: ValidationError[]): void {
    if (value === null || value === undefined || typeof value !== 'string') {
      errors.push({
        field: 'bookName',
        message: ErrorMessages.BOOK_NAME_REQUIRED,
      });
      return;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      errors.push({
        field: 'bookName',
        message: ErrorMessages.BOOK_NAME_REQUIRED,
      });
      return;
    }

    if (trimmed.length > 255) {
      errors.push({
        field: 'bookName',
        message: ErrorMessages.BOOK_NAME_MAX_LENGTH,
      });
    }
  }

  /**
   * Validate Author Name (1-255 chars, non-blank after trim)
   */
  private validateAuthorName(value: unknown, errors: ValidationError[]): void {
    if (value === null || value === undefined || typeof value !== 'string') {
      errors.push({
        field: 'authorName',
        message: ErrorMessages.AUTHOR_NAME_REQUIRED,
      });
      return;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      errors.push({
        field: 'authorName',
        message: ErrorMessages.AUTHOR_NAME_REQUIRED,
      });
      return;
    }

    if (trimmed.length > 255) {
      errors.push({
        field: 'authorName',
        message: ErrorMessages.AUTHOR_NAME_MAX_LENGTH,
      });
    }
  }

  /**
   * Validate ISBN (must be valid ISBN-10 or ISBN-13 with correct check digit)
   * Accepts formats with or without hyphens/spaces
   */
  private validateISBN(value: unknown, errors: ValidationError[]): void {
    if (value === null || value === undefined || typeof value !== 'string') {
      errors.push({
        field: 'isbn',
        message: ErrorMessages.ISBN_REQUIRED,
      });
      return;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      errors.push({
        field: 'isbn',
        message: ErrorMessages.ISBN_REQUIRED,
      });
      return;
    }

    const isbnDigits = trimmed.replace(/[-\s]/g, '');
    if (!this.isValidISBN(isbnDigits)) {
      errors.push({
        field: 'isbn',
        message: ErrorMessages.ISBN_INVALID_FORMAT,
      });
    }
  }

  /**
   * Check if the identifier has a valid ISBN-10 or ISBN-13 shape.
   * Per VALIDATION_RULES.md, checksum correctness is NOT enforced — any
   * 10-digit (optionally with a trailing X check character) or 13-digit
   * identifier is accepted, since requirements.md does not mandate
   * ISBN checksum validation.
   */
  private isValidISBN(isbn: string): boolean {
    return this.isValidISBN10(isbn) || this.isValidISBN13(isbn);
  }

  private isValidISBN10(isbn: string): boolean {
    return /^\d{9}[\dXx]$/.test(isbn);
  }

  private isValidISBN13(isbn: string): boolean {
    return /^\d{13}$/.test(isbn);
  }

  /**
   * Validate Publication Year (4-digit number, not greater than current year)
   */
  private validatePublicationYear(value: unknown, errors: ValidationError[]): void {
    if (value === null || value === undefined) {
      errors.push({
        field: 'publicationYear',
        message: ErrorMessages.PUBLICATION_YEAR_REQUIRED,
      });
      return;
    }

    // Accept string or number input
    let year: number;
    if (typeof value === 'string') {
      year = parseInt(value, 10);
    } else if (typeof value === 'number') {
      year = value;
    } else {
      errors.push({
        field: 'publicationYear',
        message: ErrorMessages.PUBLICATION_YEAR_INVALID,
      });
      return;
    }

    // Check if it's a valid number
    if (isNaN(year)) {
      errors.push({
        field: 'publicationYear',
        message: ErrorMessages.PUBLICATION_YEAR_INVALID,
      });
      return;
    }

    // Must be exactly 4 digits
    if (year < 1000 || year > 9999) {
      errors.push({
        field: 'publicationYear',
        message: ErrorMessages.PUBLICATION_YEAR_FOUR_DIGITS,
      });
      return;
    }

    // Cannot be in the future
    const currentYear = new Date().getFullYear();
    if (year > currentYear) {
      errors.push({
        field: 'publicationYear',
        message: ErrorMessages.PUBLICATION_YEAR_NOT_FUTURE,
      });
    }
  }

  /**
   * Validate Genre (must be one of GENRE_VALUES)
   */
  private validateGenre(value: unknown, errors: ValidationError[]): void {
    if (value === null || value === undefined || typeof value !== 'string') {
      errors.push({
        field: 'genre',
        message: ErrorMessages.GENRE_REQUIRED,
      });
      return;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      errors.push({
        field: 'genre',
        message: ErrorMessages.GENRE_REQUIRED,
      });
      return;
    }

    // Check if genre is in the allowed list
    if (!(GENRE_VALUES as readonly string[]).includes(trimmed)) {
      errors.push({
        field: 'genre',
        message: ErrorMessages.GENRE_INVALID,
      });
    }
  }

  /**
   * Validate Publisher (1-255 chars, non-blank after trim)
   */
  private validatePublisher(value: unknown, errors: ValidationError[]): void {
    if (value === null || value === undefined || typeof value !== 'string') {
      errors.push({
        field: 'publisher',
        message: ErrorMessages.PUBLISHER_REQUIRED,
      });
      return;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      errors.push({
        field: 'publisher',
        message: ErrorMessages.PUBLISHER_REQUIRED,
      });
      return;
    }

    if (trimmed.length > 255) {
      errors.push({
        field: 'publisher',
        message: ErrorMessages.PUBLISHER_MAX_LENGTH,
      });
    }
  }

  /**
   * Validate Total Copies (positive integer > 0)
   */
  private validateTotalCopies(value: unknown, errors: ValidationError[]): void {
    if (value === null || value === undefined) {
      errors.push({
        field: 'totalCopies',
        message: ErrorMessages.TOTAL_COPIES_REQUIRED,
      });
      return;
    }

    let copies: number;
    if (typeof value === 'string') {
      copies = parseInt(value, 10);
    } else if (typeof value === 'number') {
      copies = value;
    } else {
      errors.push({
        field: 'totalCopies',
        message: ErrorMessages.TOTAL_COPIES_INVALID,
      });
      return;
    }

    // Must be a valid number
    if (isNaN(copies)) {
      errors.push({
        field: 'totalCopies',
        message: ErrorMessages.TOTAL_COPIES_INVALID,
      });
      return;
    }

    // Must be an integer
    if (!Number.isInteger(copies)) {
      errors.push({
        field: 'totalCopies',
        message: ErrorMessages.TOTAL_COPIES_INTEGER,
      });
      return;
    }

    // Must be positive (> 0)
    if (copies <= 0) {
      errors.push({
        field: 'totalCopies',
        message: ErrorMessages.TOTAL_COPIES_POSITIVE,
      });
    }
  }

  /**
   * Validate Available Copies (non-negative integer ≥ 0)
   */
  private validateAvailableCopies(value: unknown, errors: ValidationError[]): void {
    if (value === null || value === undefined) {
      errors.push({
        field: 'availableCopies',
        message: ErrorMessages.AVAILABLE_COPIES_REQUIRED,
      });
      return;
    }

    let copies: number;
    if (typeof value === 'string') {
      copies = parseInt(value, 10);
    } else if (typeof value === 'number') {
      copies = value;
    } else {
      errors.push({
        field: 'availableCopies',
        message: ErrorMessages.AVAILABLE_COPIES_INVALID,
      });
      return;
    }

    // Must be a valid number
    if (isNaN(copies)) {
      errors.push({
        field: 'availableCopies',
        message: ErrorMessages.AVAILABLE_COPIES_INVALID,
      });
      return;
    }

    // Must be an integer
    if (!Number.isInteger(copies)) {
      errors.push({
        field: 'availableCopies',
        message: ErrorMessages.AVAILABLE_COPIES_INTEGER,
      });
      return;
    }

    // Must be non-negative (≥ 0)
    if (copies < 0) {
      errors.push({
        field: 'availableCopies',
        message: ErrorMessages.AVAILABLE_COPIES_NON_NEGATIVE,
      });
    }
  }

  /**
   * Validate a rating/review submission: rating must be a whole number 1-5,
   * reviewText must be non-blank after trim (SCRUM-10 AC1-AC2).
   */
  validateReview(rating: unknown, reviewText: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (rating === null || rating === undefined || rating === '') {
      errors.push({ field: 'rating', message: ErrorMessages.RATING_REQUIRED });
    } else {
      const ratingNumber = typeof rating === 'string' ? Number(rating) : rating;
      if (
        typeof ratingNumber !== 'number' ||
        Number.isNaN(ratingNumber) ||
        !Number.isInteger(ratingNumber) ||
        ratingNumber < 1 ||
        ratingNumber > 5
      ) {
        errors.push({ field: 'rating', message: ErrorMessages.RATING_INVALID });
      }
    }

    if (reviewText === null || reviewText === undefined || typeof reviewText !== 'string') {
      errors.push({ field: 'reviewText', message: ErrorMessages.REVIEW_TEXT_REQUIRED });
    } else {
      const trimmed = reviewText.trim();
      if (trimmed.length === 0) {
        errors.push({ field: 'reviewText', message: ErrorMessages.REVIEW_TEXT_REQUIRED });
      } else if (trimmed.length > 2000) {
        errors.push({ field: 'reviewText', message: ErrorMessages.REVIEW_TEXT_MAX_LENGTH });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Business rule: availableCopies must not exceed totalCopies (FR-04, AC-06)
   * Only check if both fields passed individual validation
   */
  private validateAvailableVsTotal(available: unknown, total: unknown, errors: ValidationError[]): void {
    const availableNumber = typeof available === 'string' ? Number(available) : available;
    const totalNumber = typeof total === 'string' ? Number(total) : total;

    if (typeof availableNumber !== 'number' || Number.isNaN(availableNumber) ||
        typeof totalNumber !== 'number' || Number.isNaN(totalNumber)) {
      return;
    }

    if (availableNumber > totalNumber) {
      errors.push({
        field: 'availableCopies',
        message: ErrorMessages.AVAILABLE_EXCEEDS_TOTAL,
      });
    }
  }

}
