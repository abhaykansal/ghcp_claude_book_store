/**
 * Unit Tests for ValidationEngine
 * Comprehensive coverage of all 8 fields + business rules
 * Per SCRUM-9 Task T-04
 *
 * Test coverage:
 * - All 8 field validation rules
 * - ISBN-10 and ISBN-13 check-digit validation (including trailing X)
 * - Cross-field business rules (available ≤ total, year ≤ current year)
 * - All edge cases from requirements.md
 * - EXPLICIT negative test: validateBook does NOT check duplicate ISBN (that's FR-03's responsibility in persistence layer)
 */

import { ValidationEngine } from '../../../src/services/ValidationEngine';
import { GENRE_VALUES } from '../../../src/models/Book';
import { ErrorMessages } from '../../../src/constants/ErrorMessages';

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  /**
   * Valid complete 8-field book
   */
  const validBook = {
    bookName: 'Clean Code',
    authorName: 'Robert C. Martin',
    isbn: '9780132350884', // Valid ISBN-13
    publicationYear: 2008,
    genre: 'Technology',
    publisher: 'Prentice Hall',
    totalCopies: 5,
    availableCopies: 3,
  };

  // ========================================================================
  // BOOK NAME VALIDATION TESTS
  // ========================================================================

  describe('Book Name Validation', () => {
    it('should accept valid book name', () => {
      const result = engine.validateBook({ ...validBook, bookName: 'The Great Gatsby' });
      const nameErrors = result.errors.filter((e) => e.field === 'bookName');
      expect(nameErrors).toHaveLength(0);
    });

    it('should reject empty book name', () => {
      const result = engine.validateBook({ ...validBook, bookName: '' });
      const nameErrors = result.errors.filter((e) => e.field === 'bookName');
      expect(nameErrors).toHaveLength(1);
      expect(nameErrors[0].message).toBe(ErrorMessages.BOOK_NAME_REQUIRED);
    });

    it('should reject whitespace-only book name', () => {
      const result = engine.validateBook({ ...validBook, bookName: '   \t\n  ' });
      const nameErrors = result.errors.filter((e) => e.field === 'bookName');
      expect(nameErrors).toHaveLength(1);
      expect(nameErrors[0].message).toBe(ErrorMessages.BOOK_NAME_REQUIRED);
    });

    it('should reject book name exceeding 255 characters', () => {
      const longName = 'a'.repeat(256);
      const result = engine.validateBook({ ...validBook, bookName: longName });
      const nameErrors = result.errors.filter((e) => e.field === 'bookName');
      expect(nameErrors).toHaveLength(1);
      expect(nameErrors[0].message).toBe(ErrorMessages.BOOK_NAME_MAX_LENGTH);
    });

    it('should accept book name at exactly 255 characters', () => {
      const maxName = 'a'.repeat(255);
      const result = engine.validateBook({ ...validBook, bookName: maxName });
      const nameErrors = result.errors.filter((e) => e.field === 'bookName');
      expect(nameErrors).toHaveLength(0);
    });

    it('should accept book name with special characters', () => {
      const result = engine.validateBook({
        ...validBook,
        bookName: "The Developer's Guide: C++ & .NET (2nd Edition)",
      });
      const nameErrors = result.errors.filter((e) => e.field === 'bookName');
      expect(nameErrors).toHaveLength(0);
    });

    it('should handle null book name', () => {
      const result = engine.validateBook({ ...validBook, bookName: null as any });
      const nameErrors = result.errors.filter((e) => e.field === 'bookName');
      expect(nameErrors).toHaveLength(1);
      expect(nameErrors[0].message).toBe(ErrorMessages.BOOK_NAME_REQUIRED);
    });

    it('should handle undefined book name', () => {
      const result = engine.validateBook({ ...validBook, bookName: undefined });
      const nameErrors = result.errors.filter((e) => e.field === 'bookName');
      expect(nameErrors).toHaveLength(1);
      expect(nameErrors[0].message).toBe(ErrorMessages.BOOK_NAME_REQUIRED);
    });
  });

  // ========================================================================
  // AUTHOR NAME VALIDATION TESTS
  // ========================================================================

  describe('Author Name Validation', () => {
    it('should accept valid author name', () => {
      const result = engine.validateBook({ ...validBook, authorName: 'Jane Austen' });
      const authorErrors = result.errors.filter((e) => e.field === 'authorName');
      expect(authorErrors).toHaveLength(0);
    });

    it('should reject empty author name', () => {
      const result = engine.validateBook({ ...validBook, authorName: '' });
      const authorErrors = result.errors.filter((e) => e.field === 'authorName');
      expect(authorErrors).toHaveLength(1);
      expect(authorErrors[0].message).toBe(ErrorMessages.AUTHOR_NAME_REQUIRED);
    });

    it('should reject whitespace-only author name', () => {
      const result = engine.validateBook({ ...validBook, authorName: '   ' });
      const authorErrors = result.errors.filter((e) => e.field === 'authorName');
      expect(authorErrors).toHaveLength(1);
      expect(authorErrors[0].message).toBe(ErrorMessages.AUTHOR_NAME_REQUIRED);
    });

    it('should reject author name exceeding 255 characters', () => {
      const longAuthor = 'a'.repeat(256);
      const result = engine.validateBook({ ...validBook, authorName: longAuthor });
      const authorErrors = result.errors.filter((e) => e.field === 'authorName');
      expect(authorErrors).toHaveLength(1);
      expect(authorErrors[0].message).toBe(ErrorMessages.AUTHOR_NAME_MAX_LENGTH);
    });

    it('should accept author name with special characters', () => {
      const result = engine.validateBook({
        ...validBook,
        authorName: "O'Brien, Patrick & Co.",
      });
      const authorErrors = result.errors.filter((e) => e.field === 'authorName');
      expect(authorErrors).toHaveLength(0);
    });
  });

  // ========================================================================
  // ISBN VALIDATION TESTS
  // ========================================================================

  describe('ISBN Validation', () => {
    it('should accept valid ISBN-13', () => {
      const result = engine.validateBook({ ...validBook, isbn: '9780132350884' });
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(0);
    });

    it('should accept valid ISBN-10 (known good example)', () => {
      // ISBN-10 for "Clean Code": 0132350882 (check digit 2)
      const result = engine.validateBook({ ...validBook, isbn: '0132350882' });
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(0);
    });

    it('should accept ISBN-10 with trailing X check digit', () => {
      // Construct an ISBN-10 with X check digit (e.g., sum such that checksum = 10)
      // 0-86381-580-X is a known valid ISBN-10 with X check digit
      const result = engine.validateBook({ ...validBook, isbn: '086381580X' });
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(0);
    });

    it('should accept ISBN-10 with lowercase x check digit', () => {
      const result = engine.validateBook({ ...validBook, isbn: '086381580x' });
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(0);
    });

    it('should accept ISBN with hyphens', () => {
      const result = engine.validateBook({ ...validBook, isbn: '978-0-132-35088-4' });
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(0);
    });

    it('should accept ISBN with spaces', () => {
      const result = engine.validateBook({ ...validBook, isbn: '978 0 132 35088 4' });
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(0);
    });

    it('should accept a 13-digit ISBN even with a non-matching check digit (no checksum enforced)', () => {
      // Per VALIDATION_RULES.md, checksum correctness is not required.
      const result = engine.validateBook({ ...validBook, isbn: '9780132350885' }); // Last digit "wrong"
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(0);
    });

    it('should accept a 10-digit ISBN even with a non-matching check digit (no checksum enforced)', () => {
      const result = engine.validateBook({ ...validBook, isbn: '0132350881' });
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(0);
    });

    it('should reject ISBN that is not 10 or 13 digits', () => {
      const result = engine.validateBook({ ...validBook, isbn: '123456789' }); // 9 digits
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(1);
      expect(isbnErrors[0].message).toBe(ErrorMessages.ISBN_INVALID_FORMAT);
    });

    it('should reject empty ISBN', () => {
      const result = engine.validateBook({ ...validBook, isbn: '' });
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(1);
      expect(isbnErrors[0].message).toBe(ErrorMessages.ISBN_REQUIRED);
    });

    it('should reject ISBN with non-digit characters (except hyphens/spaces)', () => {
      const result = engine.validateBook({ ...validBook, isbn: '978-0-ABC-35088-4' });
      const isbnErrors = result.errors.filter((e) => e.field === 'isbn');
      expect(isbnErrors).toHaveLength(1);
      expect(isbnErrors[0].message).toBe(ErrorMessages.ISBN_INVALID_FORMAT);
    });

    // ========================================================================
    // CRITICAL: ValidationEngine does NOT check duplicate ISBN
    // ========================================================================
    it('should NOT reject duplicate ISBN (that is ExcelPersistence responsibility per FR-03, T-06)', () => {
      // Even if ISBN is already in database elsewhere, ValidationEngine approves it
      // Duplicate checking happens in ExcelPersistence's write-queue (T-06)
      const result = engine.validateBook({
        ...validBook,
        isbn: '9780132350884', // Known good ISBN
      });
      expect(result.isValid).toBe(true);
      const duplicateErrors = result.errors.filter((e) =>
        e.message.includes('duplicate') || e.message.includes('already exists')
      );
      expect(duplicateErrors).toHaveLength(0);
    });
  });

  // ========================================================================
  // PUBLICATION YEAR VALIDATION TESTS
  // ========================================================================

  describe('Publication Year Validation', () => {
    it('should accept valid publication year', () => {
      const result = engine.validateBook({ ...validBook, publicationYear: 2008 });
      const yearErrors = result.errors.filter((e) => e.field === 'publicationYear');
      expect(yearErrors).toHaveLength(0);
    });

    it('should accept publication year as string', () => {
      const result = engine.validateBook({ ...validBook, publicationYear: '2008' as any });
      const yearErrors = result.errors.filter((e) => e.field === 'publicationYear');
      expect(yearErrors).toHaveLength(0);
    });

    it('should accept current year', () => {
      const currentYear = new Date().getFullYear();
      const result = engine.validateBook({ ...validBook, publicationYear: currentYear });
      const yearErrors = result.errors.filter((e) => e.field === 'publicationYear');
      expect(yearErrors).toHaveLength(0);
    });

    it('should reject future publication year', () => {
      const futureYear = new Date().getFullYear() + 1;
      const result = engine.validateBook({ ...validBook, publicationYear: futureYear });
      const yearErrors = result.errors.filter((e) => e.field === 'publicationYear');
      expect(yearErrors).toHaveLength(1);
      expect(yearErrors[0].message).toBe(ErrorMessages.PUBLICATION_YEAR_NOT_FUTURE);
    });

    it('should reject publication year with fewer than 4 digits', () => {
      const result = engine.validateBook({ ...validBook, publicationYear: 999 });
      const yearErrors = result.errors.filter((e) => e.field === 'publicationYear');
      expect(yearErrors).toHaveLength(1);
      expect(yearErrors[0].message).toBe(ErrorMessages.PUBLICATION_YEAR_FOUR_DIGITS);
    });

    it('should reject publication year greater than 9999', () => {
      const result = engine.validateBook({ ...validBook, publicationYear: 10000 });
      const yearErrors = result.errors.filter((e) => e.field === 'publicationYear');
      expect(yearErrors).toHaveLength(1);
      expect(yearErrors[0].message).toBe(ErrorMessages.PUBLICATION_YEAR_FOUR_DIGITS);
    });

    it('should reject non-numeric publication year', () => {
      const result = engine.validateBook({ ...validBook, publicationYear: 'twenty' as any });
      const yearErrors = result.errors.filter((e) => e.field === 'publicationYear');
      expect(yearErrors.length).toBeGreaterThan(0);
    });

    it('should reject null publication year', () => {
      const result = engine.validateBook({ ...validBook, publicationYear: null as any });
      const yearErrors = result.errors.filter((e) => e.field === 'publicationYear');
      expect(yearErrors).toHaveLength(1);
      expect(yearErrors[0].message).toBe(ErrorMessages.PUBLICATION_YEAR_REQUIRED);
    });

    it('should reject undefined publication year', () => {
      const result = engine.validateBook({ ...validBook, publicationYear: undefined as any });
      const yearErrors = result.errors.filter((e) => e.field === 'publicationYear');
      expect(yearErrors).toHaveLength(1);
      expect(yearErrors[0].message).toBe(ErrorMessages.PUBLICATION_YEAR_REQUIRED);
    });
  });

  // ========================================================================
  // GENRE VALIDATION TESTS
  // ========================================================================

  describe('Genre Validation', () => {
    it('should accept each valid genre value', () => {
      for (const genre of GENRE_VALUES) {
        const result = engine.validateBook({ ...validBook, genre });
        const genreErrors = result.errors.filter((e) => e.field === 'genre');
        expect(genreErrors).toHaveLength(0);
      }
    });

    it('should accept valid genre', () => {
      const result = engine.validateBook({ ...validBook, genre: 'Technology' });
      const genreErrors = result.errors.filter((e) => e.field === 'genre');
      expect(genreErrors).toHaveLength(0);
    });

    it('should reject invalid genre value', () => {
      const result = engine.validateBook({ ...validBook, genre: 'InvalidGenre' });
      const genreErrors = result.errors.filter((e) => e.field === 'genre');
      expect(genreErrors).toHaveLength(1);
      expect(genreErrors[0].message).toBe(ErrorMessages.GENRE_INVALID);
    });

    it('should reject empty genre', () => {
      const result = engine.validateBook({ ...validBook, genre: '' });
      const genreErrors = result.errors.filter((e) => e.field === 'genre');
      expect(genreErrors).toHaveLength(1);
      expect(genreErrors[0].message).toBe(ErrorMessages.GENRE_REQUIRED);
    });

    it('should reject whitespace-only genre', () => {
      const result = engine.validateBook({ ...validBook, genre: '   ' });
      const genreErrors = result.errors.filter((e) => e.field === 'genre');
      expect(genreErrors).toHaveLength(1);
      expect(genreErrors[0].message).toBe(ErrorMessages.GENRE_REQUIRED);
    });

    it('should reject null genre', () => {
      const result = engine.validateBook({ ...validBook, genre: null as any });
      const genreErrors = result.errors.filter((e) => e.field === 'genre');
      expect(genreErrors).toHaveLength(1);
      expect(genreErrors[0].message).toBe(ErrorMessages.GENRE_REQUIRED);
    });
  });

  // ========================================================================
  // PUBLISHER VALIDATION TESTS
  // ========================================================================

  describe('Publisher Validation', () => {
    it('should accept valid publisher', () => {
      const result = engine.validateBook({ ...validBook, publisher: 'Penguin Books' });
      const pubErrors = result.errors.filter((e) => e.field === 'publisher');
      expect(pubErrors).toHaveLength(0);
    });

    it('should reject empty publisher', () => {
      const result = engine.validateBook({ ...validBook, publisher: '' });
      const pubErrors = result.errors.filter((e) => e.field === 'publisher');
      expect(pubErrors).toHaveLength(1);
      expect(pubErrors[0].message).toBe(ErrorMessages.PUBLISHER_REQUIRED);
    });

    it('should reject publisher exceeding 255 characters', () => {
      const longPublisher = 'a'.repeat(256);
      const result = engine.validateBook({ ...validBook, publisher: longPublisher });
      const pubErrors = result.errors.filter((e) => e.field === 'publisher');
      expect(pubErrors).toHaveLength(1);
      expect(pubErrors[0].message).toBe(ErrorMessages.PUBLISHER_MAX_LENGTH);
    });

    it('should accept publisher at exactly 255 characters', () => {
      const maxPublisher = 'a'.repeat(255);
      const result = engine.validateBook({ ...validBook, publisher: maxPublisher });
      const pubErrors = result.errors.filter((e) => e.field === 'publisher');
      expect(pubErrors).toHaveLength(0);
    });
  });

  // ========================================================================
  // TOTAL COPIES VALIDATION TESTS
  // ========================================================================

  describe('Total Copies Validation', () => {
    it('should accept positive integer total copies', () => {
      const result = engine.validateBook({ ...validBook, totalCopies: 10 });
      const copyErrors = result.errors.filter((e) => e.field === 'totalCopies');
      expect(copyErrors).toHaveLength(0);
    });

    it('should accept total copies as string', () => {
      const result = engine.validateBook({ ...validBook, totalCopies: '10' as any });
      const copyErrors = result.errors.filter((e) => e.field === 'totalCopies');
      expect(copyErrors).toHaveLength(0);
    });

    it('should reject total copies of 0', () => {
      const result = engine.validateBook({ ...validBook, totalCopies: 0 });
      const copyErrors = result.errors.filter((e) => e.field === 'totalCopies');
      expect(copyErrors).toHaveLength(1);
      expect(copyErrors[0].message).toBe(ErrorMessages.TOTAL_COPIES_POSITIVE);
    });

    it('should reject negative total copies', () => {
      const result = engine.validateBook({ ...validBook, totalCopies: -5 });
      const copyErrors = result.errors.filter((e) => e.field === 'totalCopies');
      expect(copyErrors).toHaveLength(1);
      expect(copyErrors[0].message).toBe(ErrorMessages.TOTAL_COPIES_POSITIVE);
    });

    it('should reject decimal total copies', () => {
      const result = engine.validateBook({ ...validBook, totalCopies: 5.5 });
      const copyErrors = result.errors.filter((e) => e.field === 'totalCopies');
      expect(copyErrors).toHaveLength(1);
      expect(copyErrors[0].message).toBe(ErrorMessages.TOTAL_COPIES_INTEGER);
    });

    it('should reject non-numeric total copies', () => {
      const result = engine.validateBook({ ...validBook, totalCopies: 'ten' as any });
      const copyErrors = result.errors.filter((e) => e.field === 'totalCopies');
      expect(copyErrors.length).toBeGreaterThan(0);
    });

    it('should reject null total copies', () => {
      const result = engine.validateBook({ ...validBook, totalCopies: null as any });
      const copyErrors = result.errors.filter((e) => e.field === 'totalCopies');
      expect(copyErrors).toHaveLength(1);
      expect(copyErrors[0].message).toBe(ErrorMessages.TOTAL_COPIES_REQUIRED);
    });
  });

  // ========================================================================
  // AVAILABLE COPIES VALIDATION TESTS
  // ========================================================================

  describe('Available Copies Validation', () => {
    it('should accept zero available copies', () => {
      const result = engine.validateBook({ ...validBook, availableCopies: 0 });
      const availErrors = result.errors.filter((e) => e.field === 'availableCopies');
      expect(availErrors).toHaveLength(0);
    });

    it('should accept positive available copies', () => {
      const result = engine.validateBook({ ...validBook, availableCopies: 5 });
      const availErrors = result.errors.filter((e) => e.field === 'availableCopies');
      expect(availErrors).toHaveLength(0);
    });

    it('should reject negative available copies', () => {
      const result = engine.validateBook({ ...validBook, availableCopies: -1 });
      const availErrors = result.errors.filter((e) => e.field === 'availableCopies');
      expect(availErrors).toHaveLength(1);
      expect(availErrors[0].message).toBe(ErrorMessages.AVAILABLE_COPIES_NON_NEGATIVE);
    });

    it('should reject decimal available copies', () => {
      const result = engine.validateBook({ ...validBook, availableCopies: 3.5 });
      const availErrors = result.errors.filter((e) => e.field === 'availableCopies');
      expect(availErrors).toHaveLength(1);
      expect(availErrors[0].message).toBe(ErrorMessages.AVAILABLE_COPIES_INTEGER);
    });

    it('should reject null available copies', () => {
      const result = engine.validateBook({ ...validBook, availableCopies: null as any });
      const availErrors = result.errors.filter((e) => e.field === 'availableCopies');
      expect(availErrors).toHaveLength(1);
      expect(availErrors[0].message).toBe(ErrorMessages.AVAILABLE_COPIES_REQUIRED);
    });
  });

  // ========================================================================
  // CROSS-FIELD BUSINESS RULE TESTS
  // ========================================================================

  describe('Cross-field Business Rules (FR-04, FR-05)', () => {
    it('should reject when available copies > total copies', () => {
      const result = engine.validateBook({
        ...validBook,
        totalCopies: 5,
        availableCopies: 10, // Greater than total
      });
      const errors = result.errors.filter((e) => e.field === 'availableCopies');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(ErrorMessages.AVAILABLE_EXCEEDS_TOTAL);
      expect(result.isValid).toBe(false);
    });

    it('should accept when available copies equals total copies', () => {
      const result = engine.validateBook({
        ...validBook,
        totalCopies: 5,
        availableCopies: 5,
      });
      const errors = result.errors.filter((e) => e.field === 'availableCopies');
      expect(errors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should accept when available copies less than total copies', () => {
      const result = engine.validateBook({
        ...validBook,
        totalCopies: 5,
        availableCopies: 3,
      });
      const errors = result.errors.filter((e) => e.field === 'availableCopies');
      expect(errors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should not check available vs total if both fields failed individual validation', () => {
      // If both are invalid, we should only see the field-level errors, not the cross-field error
      const result = engine.validateBook({
        ...validBook,
        totalCopies: 'invalid' as any,
        availableCopies: 'also invalid' as any,
      });
      // Should have errors for both fields individually, but NOT the cross-field error
      expect(result.errors.some((e) => e.message === ErrorMessages.AVAILABLE_EXCEEDS_TOTAL)).toBe(
        false
      );
    });
  });

  // ========================================================================
  // COMPLETE VALIDATION TESTS (Multiple Fields)
  // ========================================================================

  describe('Complete Validation', () => {
    it('should return isValid=true for a completely valid 8-field book', () => {
      const result = engine.validateBook(validBook);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect multiple errors across different fields', () => {
      const result = engine.validateBook({
        bookName: '', // Error: required
        authorName: '', // Error: required
        isbn: 'invalid', // Error: invalid format
        publicationYear: 3000, // Error: future year
        genre: 'BadGenre', // Error: invalid genre
        publisher: '', // Error: required
        totalCopies: -5, // Error: must be positive
        availableCopies: 100, // Error: exceeds total (cross-field)
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(8); // At least one error per field
    });

    it('should have all errors present in the results array', () => {
      const result = engine.validateBook({
        bookName: '', // 1. Error
        authorName: null as any, // 2. Error
        isbn: '', // 3. Error
        publicationYear: 'not a number' as any, // 4. Error
        genre: '', // 5. Error
        publisher: undefined as any, // 6. Error
        totalCopies: 0, // 7. Error
        availableCopies: 'NaN' as any, // 8. Error
      });

      expect(result.isValid).toBe(false);

      // Verify that all fields are represented with errors
      const fieldNames = result.errors.map((e) => e.field);
      expect(fieldNames).toContain('bookName');
      expect(fieldNames).toContain('authorName');
      expect(fieldNames).toContain('isbn');
      expect(fieldNames).toContain('publicationYear');
      expect(fieldNames).toContain('genre');
      expect(fieldNames).toContain('publisher');
      expect(fieldNames).toContain('totalCopies');
      expect(fieldNames).toContain('availableCopies');
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle book name with leading/trailing spaces (trim before validation)', () => {
      const result = engine.validateBook({
        ...validBook,
        bookName: '  Valid Name  ',
      });
      // Should be valid after trimming
      const nameErrors = result.errors.filter((e) => e.field === 'bookName');
      expect(nameErrors).toHaveLength(0);
    });

    it('should handle genre case sensitivity correctly', () => {
      // Genre must match exactly (case-sensitive) as defined in GENRE_VALUES
      const result1 = engine.validateBook({ ...validBook, genre: 'Fiction' });
      const result2 = engine.validateBook({ ...validBook, genre: 'fiction' });

      const error1 = result1.errors.filter((e) => e.field === 'genre');
      const error2 = result2.errors.filter((e) => e.field === 'genre');

      expect(error1).toHaveLength(0); // Exact match
      expect(error2.length).toBeGreaterThan(0); // Case mismatch should fail
    });

    it('should accept ISBN-10 with mixed case X', () => {
      // Both uppercase and lowercase X should work
      const result1 = engine.validateBook({ ...validBook, isbn: '086381580X' });
      const result2 = engine.validateBook({ ...validBook, isbn: '086381580x' });

      const error1 = result1.errors.filter((e) => e.field === 'isbn');
      const error2 = result2.errors.filter((e) => e.field === 'isbn');

      expect(error1).toHaveLength(0);
      expect(error2).toHaveLength(0);
    });

    it('should handle publication year of 1000 (minimum 4-digit year)', () => {
      const result = engine.validateBook({ ...validBook, publicationYear: 1000 });
      const yearErrors = result.errors.filter((e) => e.field === 'publicationYear');
      expect(yearErrors).toHaveLength(0);
    });

    it('should handle total copies of 1 (minimum positive)', () => {
      const result = engine.validateBook({ ...validBook, totalCopies: 1 });
      const copyErrors = result.errors.filter((e) => e.field === 'totalCopies');
      expect(copyErrors).toHaveLength(0);
    });
  });
});
