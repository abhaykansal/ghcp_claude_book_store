/**
 * Unit Tests for ValidationService
 * Tests all validation rules and error messages
 */

import { ValidationService } from '../../../src/services/ValidationService';
import { ErrorMessages } from '../../../src/constants/ErrorMessages';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  // ========================================================================
  // validateTitle Tests
  // ========================================================================

  describe('validateTitle', () => {
    it('should validate a valid title', () => {
      const errors = validationService.validateTitle('The Great Gatsby');
      expect(errors).toHaveLength(0);
    });

    it('should reject empty title', () => {
      const errors = validationService.validateTitle('');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('title');
      expect(errors[0].message).toBe(ErrorMessages.TITLE_REQUIRED);
    });

    it('should reject whitespace-only title', () => {
      const errors = validationService.validateTitle('   ');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(ErrorMessages.TITLE_WHITESPACE_ONLY);
    });

    it('should reject title exceeding max length', () => {
      const longTitle = 'a'.repeat(256);
      const errors = validationService.validateTitle(longTitle);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(ErrorMessages.TITLE_MAX_LENGTH);
    });

    it('should accept title at max length', () => {
      const maxTitle = 'a'.repeat(255);
      const errors = validationService.validateTitle(maxTitle);
      expect(errors).toHaveLength(0);
    });

    it('should accept title with special characters', () => {
      const errors = validationService.validateTitle("O'Brien's: A Novel & Tale");
      expect(errors).toHaveLength(0);
    });

    it('should accept title with unicode characters', () => {
      const errors = validationService.validateTitle('Café: Ñoño & Co.');
      expect(errors).toHaveLength(0);
    });

    it('should handle non-string input', () => {
      const errors = validationService.validateTitle(null as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(ErrorMessages.TITLE_REQUIRED);
    });
  });

  // ========================================================================
  // validateAuthor Tests
  // ========================================================================

  describe('validateAuthor', () => {
    it('should validate a valid author', () => {
      const errors = validationService.validateAuthor('F. Scott Fitzgerald');
      expect(errors).toHaveLength(0);
    });

    it('should reject empty author', () => {
      const errors = validationService.validateAuthor('');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('author');
      expect(errors[0].message).toBe(ErrorMessages.AUTHOR_REQUIRED);
    });

    it('should reject whitespace-only author', () => {
      const errors = validationService.validateAuthor('   ');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(ErrorMessages.AUTHOR_WHITESPACE_ONLY);
    });

    it('should reject author exceeding max length', () => {
      const longAuthor = 'a'.repeat(256);
      const errors = validationService.validateAuthor(longAuthor);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(ErrorMessages.AUTHOR_MAX_LENGTH);
    });

    it('should accept author at max length', () => {
      const maxAuthor = 'a'.repeat(255);
      const errors = validationService.validateAuthor(maxAuthor);
      expect(errors).toHaveLength(0);
    });

    it('should accept author with special characters', () => {
      const errors = validationService.validateAuthor("O'Brien, Patrick J.");
      expect(errors).toHaveLength(0);
    });
  });

  // ========================================================================
  // validateISBN Tests
  // ========================================================================

  describe('validateISBN', () => {
    it('should validate a valid ISBN', () => {
      const errors = validationService.validateISBN('9780743273565');
      expect(errors).toHaveLength(0);
    });

    it('should validate ISBN-10 format', () => {
      const errors = validationService.validateISBN('0743273564');
      expect(errors).toHaveLength(0);
    });

    it('should reject empty ISBN', () => {
      const errors = validationService.validateISBN('');
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('isbn');
      expect(errors[0].message).toBe(ErrorMessages.ISBN_REQUIRED);
    });

    it('should reject whitespace-only ISBN', () => {
      const errors = validationService.validateISBN('   ');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(ErrorMessages.ISBN_WHITESPACE_ONLY);
    });

    it('should handle non-string input', () => {
      const errors = validationService.validateISBN(null as any);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(ErrorMessages.ISBN_REQUIRED);
    });
  });

  // ========================================================================
  // validateBook Tests
  // ========================================================================

  describe('validateBook', () => {
    it('should validate a complete valid book', () => {
      const result = validationService.validateBook(
        'The Great Gatsby',
        'F. Scott Fitzgerald',
        '9780743273565'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return all validation errors together', () => {
      const result = validationService.validateBook('', '', '');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map((e) => e.field).sort()).toEqual(['author', 'isbn', 'title']);
    });

    it('should validate title and author, reject ISBN', () => {
      const result = validationService.validateBook('Valid Title', 'Valid Author', '   ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('isbn');
    });

    it('should reject title exceeding max length', () => {
      const result = validationService.validateBook(
        'a'.repeat(256),
        'Valid Author',
        '9780743273565'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title')).toBe(true);
    });

    it('should handle special characters in all fields', () => {
      const result = validationService.validateBook(
        "O'Brien's: A Novel & Tale",
        'Harper Lee, Ph.D.',
        '978-0-7432-7356-5'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle unicode characters in all fields', () => {
      const result = validationService.validateBook(
        'Café: A Novel',
        'José García',
        '978-0-7432-7356-5'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should trim whitespace from valid inputs but not validate', () => {
      // Note: trimming happens in BookService, not ValidationService
      const result = validationService.validateBook(
        '  Valid Title  ',
        '  Valid Author  ',
        '  9780743273565  '
      );
      expect(result.isValid).toBe(true);
    });

    it('should handle very long but valid inputs', () => {
      const maxLengthString = 'a'.repeat(255);
      const result = validationService.validateBook(
        maxLengthString,
        maxLengthString,
        '9780743273565'
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject all three fields with multiple errors each', () => {
      const result = validationService.validateBook('a'.repeat(256), '   ', '');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
