/**
 * ValidationService: Validates book data before persistence
 * Implements business rules for data quality
 */

import { ValidationResult, ValidationError, Book } from '../models/Book';
import { ErrorMessages } from '../constants/ErrorMessages';

const MAX_FIELD_LENGTH = 255;

export interface IValidationService {
  validateBook(book: Partial<Book> | Record<string, unknown>): ValidationResult;
  validateBook(title: string, author: string, isbn: string): ValidationResult;
  validateTitle(title: string): ValidationError[];
  validateAuthor(author: string): ValidationError[];
  validateISBN(isbn: string): ValidationError[];
}

export class ValidationService implements IValidationService {
  /**
   * Validate complete book data supplied as either a full book object or the legacy title/author/isbn tuple.
   * Returns all errors found (not just the first one).
   */
  validateBook(book: Partial<Book> | Record<string, unknown>): ValidationResult;
  validateBook(title: string, author: string, isbn: string): ValidationResult;
  validateBook(
    arg1: string | Partial<Book> | Record<string, unknown>,
    arg2?: string,
    arg3?: string
  ): ValidationResult {
    const bookRecord = typeof arg1 === 'string'
      ? { title: arg1, author: arg2 ?? '', isbn: arg3 ?? '' }
      : arg1;

    const title = (bookRecord.title ?? (bookRecord as Record<string, unknown>).bookName ?? '').toString();
    const author = (bookRecord.author ?? (bookRecord as Record<string, unknown>).authorName ?? '').toString();
    const isbn = (bookRecord.isbn ?? '').toString();

    const errors: ValidationError[] = [];

    // Validate each field and collect all errors
    errors.push(...this.validateTitle(title));
    errors.push(...this.validateAuthor(author));
    errors.push(...this.validateISBN(isbn));

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate title field
   */
  validateTitle(title: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if empty or missing
    if (typeof title !== 'string' || title === '') {
      errors.push({
        field: 'title',
        message: ErrorMessages.TITLE_REQUIRED,
      });
      return errors;
    }

    // Check if only whitespace
    if (title.trim() === '') {
      errors.push({
        field: 'title',
        message: ErrorMessages.TITLE_WHITESPACE_ONLY,
      });
      return errors;
    }

    // Check length
    if (title.length > MAX_FIELD_LENGTH) {
      errors.push({
        field: 'title',
        message: ErrorMessages.TITLE_MAX_LENGTH,
      });
    }

    return errors;
  }

  /**
   * Validate author field
   */
  validateAuthor(author: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if empty or missing
    if (typeof author !== 'string' || author === '') {
      errors.push({
        field: 'author',
        message: ErrorMessages.AUTHOR_REQUIRED,
      });
      return errors;
    }

    // Check if only whitespace
    if (author.trim() === '') {
      errors.push({
        field: 'author',
        message: ErrorMessages.AUTHOR_WHITESPACE_ONLY,
      });
      return errors;
    }

    // Check length
    if (author.length > MAX_FIELD_LENGTH) {
      errors.push({
        field: 'author',
        message: ErrorMessages.AUTHOR_MAX_LENGTH,
      });
    }

    return errors;
  }

  /**
   * Validate ISBN field
   */
  validateISBN(isbn: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if empty or missing
    if (typeof isbn !== 'string' || isbn === '') {
      errors.push({
        field: 'isbn',
        message: ErrorMessages.ISBN_REQUIRED,
      });
      return errors;
    }

    // Check if only whitespace
    if (isbn.trim() === '') {
      errors.push({
        field: 'isbn',
        message: ErrorMessages.ISBN_WHITESPACE_ONLY,
      });
    }

    return errors;
  }
}
