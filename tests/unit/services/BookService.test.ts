/**
 * Unit Tests for BookService
 * Tests orchestration of validation, persistence, and search
 */

import {
  BookService,
  ValidationException,
  PersistenceException,
  SearchException,
} from '../../../src/services/BookService';
import { ValidationService } from '../../../src/services/ValidationService';
import { SearchEngine } from '../../../src/services/SearchEngine';
import { Book, AddBookRequest } from '../../../src/models/Book';
import { IPersistence } from '../../../src/persistence/ExcelPersistence';

class MockPersistence implements IPersistence {
  private books: Book[] = [];

  async addBook(bookInput: Book | string, author?: string, isbn?: string): Promise<Book> {
    const title = typeof bookInput === 'string' ? bookInput : bookInput.title;
    const authorName = typeof bookInput === 'string' ? author ?? '' : bookInput.author;
    const bookIsbn = typeof bookInput === 'string' ? isbn ?? '' : bookInput.isbn ?? '';
    const book: Book = {
      bookId: `test-${this.books.length}`,
      title,
      author: authorName,
      isbn: bookIsbn,
      dateAdded: new Date().toISOString(),
      bookName: typeof bookInput === 'string' ? title : bookInput.bookName,
      authorName: typeof bookInput === 'string' ? authorName : bookInput.authorName,
      publicationYear: typeof bookInput === 'string' ? new Date().getFullYear() : bookInput.publicationYear,
      genre: typeof bookInput === 'string' ? 'Other' : bookInput.genre,
      publisher: typeof bookInput === 'string' ? 'Unknown Publisher' : bookInput.publisher,
      totalCopies: typeof bookInput === 'string' ? 1 : bookInput.totalCopies,
      availableCopies: typeof bookInput === 'string' ? 1 : bookInput.availableCopies,
    };
    this.books.push(book);
    return book;
  }

  async getAllBooks(): Promise<Book[]> {
    return this.books;
  }

  generateBookId(): string {
    return `test-${Math.random()}`;
  }

  reset(): void {
    this.books = [];
  }
}

describe('BookService', () => {
  let bookService: BookService;
  let mockPersistence: MockPersistence;
  let validationService: ValidationService;
  let searchEngine: SearchEngine;

  beforeEach(() => {
    mockPersistence = new MockPersistence();
    validationService = new ValidationService();
    searchEngine = new SearchEngine();
    bookService = new BookService(validationService, searchEngine, mockPersistence);
  });

  // ========================================================================
  // addBook Tests
  // ========================================================================

  describe('addBook', () => {
    it('should add a valid book successfully', async () => {
      const request: AddBookRequest = {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
      };

      const response = await bookService.addBook(request);

      expect(response.success).toBe(true);
      expect(response.bookId).toBeDefined();
      expect(response.message).toBe('Book added successfully');
      expect(response.book.title).toBe('The Great Gatsby');
      expect(response.book.author).toBe('F. Scott Fitzgerald');
      expect(response.book.isbn).toBe('9780743273565');
    });

    it('should trim whitespace from fields', async () => {
      const request: AddBookRequest = {
        title: '  The Great Gatsby  ',
        author: '  F. Scott Fitzgerald  ',
        isbn: '  9780743273565  ',
      };

      const response = await bookService.addBook(request);

      expect(response.book.title).toBe('The Great Gatsby');
      expect(response.book.author).toBe('F. Scott Fitzgerald');
      expect(response.book.isbn).toBe('9780743273565');
    });

    it('should throw ValidationException for empty title', async () => {
      const request: AddBookRequest = {
        title: '',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
      };

      await expect(bookService.addBook(request)).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException for empty author', async () => {
      const request: AddBookRequest = {
        title: 'The Great Gatsby',
        author: '',
        isbn: '9780743273565',
      };

      await expect(bookService.addBook(request)).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException for empty ISBN', async () => {
      const request: AddBookRequest = {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '',
      };

      await expect(bookService.addBook(request)).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException with multiple errors', async () => {
      const request: AddBookRequest = {
        title: '',
        author: '',
        isbn: '',
      };

      try {
        await bookService.addBook(request);
        fail('Should have thrown ValidationException');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        if (error instanceof ValidationException) {
          expect(error.validationErrors.length).toBeGreaterThanOrEqual(3);
        }
      }
    });

    it('should generate unique book IDs', async () => {
      const request1: AddBookRequest = {
        title: 'Book 1',
        author: 'Author 1',
        isbn: '1',
      };
      const request2: AddBookRequest = {
        title: 'Book 2',
        author: 'Author 2',
        isbn: '2',
      };

      const response1 = await bookService.addBook(request1);
      const response2 = await bookService.addBook(request2);

      expect(response1.bookId).not.toBe(response2.bookId);
    });

    it('should include dateAdded timestamp', async () => {
      const request: AddBookRequest = {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
      };

      const response = await bookService.addBook(request);

      expect(response.book.dateAdded).toBeDefined();
      expect(new Date(response.book.dateAdded!).getTime()).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // searchBooks Tests
  // ========================================================================

  describe('searchBooks', () => {
    beforeEach(async () => {
      // Add test books
      await bookService.addBook({
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
      });
      await bookService.addBook({
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '9780061120084',
      });
      await bookService.addBook({
        title: "Gatsby's Dream",
        author: 'Unknown Author',
        isbn: '9780743273566',
      });
    });

    it('should search by title and return results', async () => {
      const response = await bookService.searchBooks({
        type: 'title',
        value: 'Gatsby',
      });

      expect(response.success).toBe(true);
      expect(response.count).toBe(2);
      expect(response.results.length).toBe(2);
      expect(response.results.some((b) => b.title.includes('Gatsby'))).toBe(true);
    });

    it('should search by author and return results', async () => {
      const response = await bookService.searchBooks({
        type: 'author',
        value: 'Harper',
      });

      expect(response.success).toBe(true);
      expect(response.count).toBe(1);
      expect(response.results[0].author).toBe('Harper Lee');
    });

    it('should search by ISBN and return results', async () => {
      const response = await bookService.searchBooks({
        type: 'isbn',
        value: '9780743273565',
      });

      expect(response.success).toBe(true);
      expect(response.count).toBe(1);
      expect(response.results[0].isbn).toBe('9780743273565');
    });

    it('should return empty results for no matches', async () => {
      const response = await bookService.searchBooks({
        type: 'title',
        value: 'NonexistentBook',
      });

      expect(response.success).toBe(true);
      expect(response.count).toBe(0);
      expect(response.results).toHaveLength(0);
    });

    it('should return sorted results', async () => {
      const response = await bookService.searchBooks({
        type: 'title',
        value: 'Gatsby',
      });

      expect(response.results.length).toBeGreaterThan(0);
      // Results should be sorted (SearchEngine handles this)
      if (response.results.length > 1) {
        for (let i = 0; i < response.results.length - 1; i++) {
          expect(
            response.results[i].title.localeCompare(response.results[i + 1].title)
          ).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should return empty results for an unrecognized criteria type', async () => {
      const response = await bookService.searchBooks({
        type: 'publisher',
        value: 'anything',
      });

      expect(response.success).toBe(true);
      expect(response.count).toBe(0);
      expect(response.results).toEqual([]);
    });

    it('should throw SearchException when persistence.getAllBooks() fails', async () => {
      const failingPersistence: IPersistence = {
        async addBook(): Promise<Book> {
          throw new Error('not used');
        },
        async getAllBooks(): Promise<Book[]> {
          throw new Error('Storage unavailable');
        },
        generateBookId(): string {
          return 'test';
        },
      };
      const failingBookService = new BookService(
        validationService,
        searchEngine,
        failingPersistence
      );

      await expect(
        failingBookService.searchBooks({ type: 'title', value: 'Gatsby' })
      ).rejects.toThrow(SearchException);
    });
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  describe('Error Handling', () => {
    it('should catch and re-throw validation errors', async () => {
      const request: AddBookRequest = {
        title: 'a'.repeat(256),
        author: 'Valid Author',
        isbn: '9780743273565',
      };

      try {
        await bookService.addBook(request);
        fail('Should have thrown ValidationException');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
      }
    });

    it('should handle persistence errors gracefully', async () => {
      const failingPersistence: IPersistence = {
        async addBook(): Promise<Book> {
          throw new Error('Database connection failed');
        },
        async getAllBooks(): Promise<Book[]> {
          return [];
        },
        generateBookId(): string {
          return 'test';
        },
      };

      const failingBookService = new BookService(
        validationService,
        searchEngine,
        failingPersistence
      );

      const request: AddBookRequest = {
        title: 'Valid Title',
        author: 'Valid Author',
        isbn: '9780743273565',
      };

      try {
        await failingBookService.addBook(request);
        fail('Should have thrown PersistenceException');
      } catch (error) {
        expect(error).toBeInstanceOf(PersistenceException);
      }
    });
  });
});
