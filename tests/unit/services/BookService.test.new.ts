/**
 * Unit Tests for BookService
 * Tests orchestration of validation, persistence, and search
 * Per SCRUM-9 Task T-14
 *
 * Mocks: ValidationEngine, SearchEngine, ExcelPersistence
 */

import {
  BookService,
  IBookService,
  ValidationException,
  DuplicateIsbnException,
  PersistenceException,
  SearchException,
} from '../../../src/services/BookService';
import { IValidationEngine } from '../../../src/services/ValidationEngine';
import { ISearchEngine } from '../../../src/services/SearchEngine';
import { Book, ValidationError } from '../../../src/models/Book';

describe('BookService (Unit, Mocked Dependencies)', () => {
  let bookService: IBookService;
  let mockValidationEngine: jest.Mocked<IValidationEngine>;
  let mockSearchEngine: jest.Mocked<ISearchEngine>;
  let mockPersistence: any;

  beforeEach(() => {
    // Mock ValidationEngine
    mockValidationEngine = {
      validateBook: jest.fn(),
    };

    // Mock SearchEngine
    mockSearchEngine = {
      searchByBookName: jest.fn(),
    };

    // Mock Persistence (IPersistence interface)
    mockPersistence = {
      addBook: jest.fn(),
      getAllBooks: jest.fn(),
    };

    // Create service with mocked dependencies
    bookService = new BookService(mockValidationEngine, mockSearchEngine, mockPersistence);
  });

  // Valid test book (8 fields)
  const validBook = {
    bookName: 'Clean Code',
    authorName: 'Robert C. Martin',
    isbn: '9780132350884',
    publicationYear: 2008,
    genre: 'Technology' as any,
    publisher: 'Prentice Hall',
    totalCopies: 5,
    availableCopies: 3,
  };

  // ========================================================================
  // POST addBook Tests
  // ========================================================================

  describe('addBook()', () => {
    it('should successfully add a valid book', async () => {
      // Setup mocks
      mockValidationEngine.validateBook.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockPersistence.addBook.mockResolvedValue(validBook);

      // Execute
      const response = await bookService.addBook(validBook);

      // Assert
      expect(response.success).toBe(true);
      expect(response.book).toEqual(validBook);
      expect(response.message).toBe('Book added successfully');
      expect(mockValidationEngine.validateBook).toHaveBeenCalledWith(validBook);
      expect(mockPersistence.addBook).toHaveBeenCalled();
    });

    it('should throw ValidationException when validation fails', async () => {
      // Setup mocks with validation error
      const validationErrors: ValidationError[] = [
        { field: 'bookName', message: 'Book Name is required' },
        { field: 'isbn', message: 'ISBN must be a valid ISBN-10 or ISBN-13' },
      ];
      mockValidationEngine.validateBook.mockReturnValue({
        isValid: false,
        errors: validationErrors,
      });

      // Execute & Assert
      await expect(bookService.addBook(validBook)).rejects.toThrow(ValidationException);
      expect(mockPersistence.addBook).not.toHaveBeenCalled(); // Persistence never called
    });

    it('should propagate DuplicateIsbnException unchanged', async () => {
      // Setup mocks
      mockValidationEngine.validateBook.mockReturnValue({
        isValid: true,
        errors: [],
      });
      const duplicateError = new DuplicateIsbnException('9780132350884');
      mockPersistence.addBook.mockRejectedValue(duplicateError);

      // Execute & Assert
      await expect(bookService.addBook(validBook)).rejects.toThrow(DuplicateIsbnException);
      await expect(bookService.addBook(validBook)).rejects.toEqual(duplicateError);
    });

    it('should propagate PersistenceException unchanged', async () => {
      // Setup mocks
      mockValidationEngine.validateBook.mockReturnValue({
        isValid: true,
        errors: [],
      });
      const persistenceError = new PersistenceException('Unable to save');
      mockPersistence.addBook.mockRejectedValue(persistenceError);

      // Execute & Assert
      await expect(bookService.addBook(validBook)).rejects.toThrow(PersistenceException);
      await expect(bookService.addBook(validBook)).rejects.toEqual(persistenceError);
    });

    it('should wrap unexpected errors as PersistenceException', async () => {
      // Setup mocks
      mockValidationEngine.validateBook.mockReturnValue({
        isValid: true,
        errors: [],
      });
      const unexpectedError = new Error('Some unexpected error');
      mockPersistence.addBook.mockRejectedValue(unexpectedError);

      // Execute & Assert
      await expect(bookService.addBook(validBook)).rejects.toThrow(PersistenceException);
    });

    it('should trim whitespace from string fields before persisting', async () => {
      // Setup mocks
      mockValidationEngine.validateBook.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockPersistence.addBook.mockResolvedValue(validBook);

      // Execute with whitespace
      const bookWithWhitespace = {
        ...validBook,
        bookName: '  Clean Code  ',
        authorName: '  Robert C. Martin  ',
        publisher: '  Prentice Hall  ',
      };
      await bookService.addBook(bookWithWhitespace);

      // Assert that persistence was called with trimmed values
      expect(mockPersistence.addBook).toHaveBeenCalled();
      const persistenceCall = mockPersistence.addBook.mock.calls[0][0];
      expect(persistenceCall.bookName).toBe('Clean Code');
      expect(persistenceCall.authorName).toBe('Robert C. Martin');
      expect(persistenceCall.publisher).toBe('Prentice Hall');
    });

    it('should accept all 8 required fields', async () => {
      // Setup mocks
      mockValidationEngine.validateBook.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockPersistence.addBook.mockResolvedValue(validBook);

      // Execute with all 8 fields
      const response = await bookService.addBook(validBook);

      // Assert
      expect(response.success).toBe(true);
      expect(mockValidationEngine.validateBook).toHaveBeenCalledWith(validBook);

      // Verify all 8 fields are present in what was passed to persistence
      const persistenceCall = mockPersistence.addBook.mock.calls[0][0];
      expect(persistenceCall).toHaveProperty('bookName');
      expect(persistenceCall).toHaveProperty('authorName');
      expect(persistenceCall).toHaveProperty('isbn');
      expect(persistenceCall).toHaveProperty('publicationYear');
      expect(persistenceCall).toHaveProperty('genre');
      expect(persistenceCall).toHaveProperty('publisher');
      expect(persistenceCall).toHaveProperty('totalCopies');
      expect(persistenceCall).toHaveProperty('availableCopies');
    });
  });

  // ========================================================================
  // GET searchBooks Tests
  // ========================================================================

  describe('searchBooks()', () => {
    const testBooks: Book[] = [
      validBook,
      {
        ...validBook,
        bookName: 'Clean Architecture',
        isbn: '9780134494272',
      },
      {
        ...validBook,
        bookName: 'The Great Gatsby',
        isbn: '9780743273565',
        authorName: 'F. Scott Fitzgerald',
      },
    ];

    it('should return search results when books match', async () => {
      // Setup mocks
      mockPersistence.getAllBooks.mockResolvedValue(testBooks);
      mockSearchEngine.searchByBookName.mockReturnValue([testBooks[0]]);

      // Execute
      const response = await bookService.searchBooks('Clean');

      // Assert
      expect(response.success).toBe(true);
      expect(response.count).toBe(1);
      expect(response.results).toEqual([testBooks[0]]);
      expect(mockSearchEngine.searchByBookName).toHaveBeenCalledWith('Clean', testBooks);
    });

    it('should return empty results when no books match', async () => {
      // Setup mocks
      mockPersistence.getAllBooks.mockResolvedValue(testBooks);
      mockSearchEngine.searchByBookName.mockReturnValue([]);

      // Execute
      const response = await bookService.searchBooks('NonExistent');

      // Assert
      expect(response.success).toBe(true);
      expect(response.count).toBe(0);
      expect(response.results).toEqual([]);
    });

    it('should return all books when search term is empty', async () => {
      // Setup mocks
      mockPersistence.getAllBooks.mockResolvedValue(testBooks);
      mockSearchEngine.searchByBookName.mockReturnValue(testBooks); // Empty search returns all

      // Execute
      const response = await bookService.searchBooks('');

      // Assert
      expect(response.success).toBe(true);
      expect(response.count).toBe(testBooks.length);
      expect(response.results).toEqual(testBooks);
      expect(mockSearchEngine.searchByBookName).toHaveBeenCalledWith('', testBooks);
    });

    it('should trim search term before passing to SearchEngine', async () => {
      // Setup mocks
      mockPersistence.getAllBooks.mockResolvedValue(testBooks);
      mockSearchEngine.searchByBookName.mockReturnValue([testBooks[0]]);

      // Execute with whitespace
      await bookService.searchBooks('  Clean  ');

      // Assert that search engine received trimmed term
      expect(mockSearchEngine.searchByBookName).toHaveBeenCalledWith('Clean', testBooks);
    });

    it('should throw SearchException when getAllBooks fails', async () => {
      // Setup mocks
      mockPersistence.getAllBooks.mockRejectedValue(new Error('Database error'));

      // Execute & Assert
      await expect(bookService.searchBooks('Clean')).rejects.toThrow(SearchException);
    });

    it('should handle undefined search term as empty search', async () => {
      // Setup mocks
      mockPersistence.getAllBooks.mockResolvedValue(testBooks);
      mockSearchEngine.searchByBookName.mockReturnValue(testBooks);

      // Execute
      const response = await bookService.searchBooks(undefined as any);

      // Assert
      expect(response.success).toBe(true);
      expect(response.count).toBe(testBooks.length);
      expect(mockSearchEngine.searchByBookName).toHaveBeenCalledWith('', testBooks);
    });

    it('should handle null search term as empty search', async () => {
      // Setup mocks
      mockPersistence.getAllBooks.mockResolvedValue(testBooks);
      mockSearchEngine.searchByBookName.mockReturnValue(testBooks);

      // Execute
      const response = await bookService.searchBooks(null as any);

      // Assert
      expect(response.success).toBe(true);
      expect(response.count).toBe(testBooks.length);
      expect(mockSearchEngine.searchByBookName).toHaveBeenCalledWith('', testBooks);
    });

    it('should return multiple results when multiple books match', async () => {
      // Setup mocks
      mockPersistence.getAllBooks.mockResolvedValue(testBooks);
      mockSearchEngine.searchByBookName.mockReturnValue([testBooks[0], testBooks[1]]);

      // Execute
      const response = await bookService.searchBooks('Clean');

      // Assert
      expect(response.success).toBe(true);
      expect(response.count).toBe(2);
      expect(response.results.length).toBe(2);
    });
  });

  // ========================================================================
  // Exception Propagation Tests (Critical for AC-04)
  // ========================================================================

  describe('Exception Propagation (AC-04 Duplicate ISBN)', () => {
    it('should NOT wrap DuplicateIsbnException (must propagate unchanged)', async () => {
      // Setup: ValidationEngine approves, Persistence throws DuplicateIsbnException
      mockValidationEngine.validateBook.mockReturnValue({
        isValid: true,
        errors: [],
      });
      const duplicateError = new DuplicateIsbnException('9780132350884');
      mockPersistence.addBook.mockRejectedValue(duplicateError);

      // Execute & Assert
      try {
        await bookService.addBook(validBook);
        fail('Should have thrown DuplicateIsbnException');
      } catch (error) {
        // Verify it's the exact same exception type, not wrapped
        expect(error).toBeInstanceOf(DuplicateIsbnException);
        expect(error).toBe(duplicateError);
        if (error instanceof DuplicateIsbnException) {
          expect(error.isbn).toBe('9780132350884');
        }
      }
    });

    it('should extract isbn property from DuplicateIsbnException', async () => {
      // Setup
      mockValidationEngine.validateBook.mockReturnValue({
        isValid: true,
        errors: [],
      });
      const duplicateError = new DuplicateIsbnException('9780132350884');
      mockPersistence.addBook.mockRejectedValue(duplicateError);

      // Execute & Assert
      try {
        await bookService.addBook(validBook);
        fail('Should have thrown');
      } catch (error) {
        if (error instanceof DuplicateIsbnException) {
          expect(error.isbn).toBe('9780132350884');
        } else {
          fail('Wrong exception type');
        }
      }
    });
  });
});
