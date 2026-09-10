/**
 * Unit Tests for BookController
 * Tests HTTP-layer contract using Supertest with a mocked BookService
 * Per SCRUM-9 Task T-17
 *
 * Covers all three endpoints:
 * - POST /api/books (add book)
 * - GET /api/books/search (search by book name)
 * - GET /api/books/genres (genres endpoint)
 */

import request from 'supertest';
import express, { Express } from 'express';
import { BookController } from '../../../src/controllers/BookController';
import {
  IBookService,
  ValidationException,
  DuplicateIsbnException,
  PersistenceException,
  SearchException,
} from '../../../src/services/BookService';
import { AddBookResponse, SearchResponse, GENRE_VALUES, Book } from '../../../src/models/Book';

/**
 * Helper to build Express app with BookController
 */
function buildApp(bookService: IBookService): Express {
  const app = express();
  app.use(express.json());
  const controller = new BookController(bookService);
  app.use('/api', controller.getRouter());
  return app;
}

describe('BookController (Unit, Mocked BookService)', () => {
  let mockBookService: jest.Mocked<IBookService>;
  let app: Express;

  beforeEach(() => {
    mockBookService = {
      addBook: jest.fn(),
      searchBooks: jest.fn(),
    };
    app = buildApp(mockBookService);
  });

  const validBook: Book = {
    bookName: 'Clean Code',
    authorName: 'Robert C. Martin',
    isbn: '9780132350884',
    publicationYear: 2008,
    genre: 'Technology',
    publisher: 'Prentice Hall',
    totalCopies: 5,
    availableCopies: 3,
  };

  // ========================================================================
  // POST /api/books Tests
  // ========================================================================

  describe('POST /api/books', () => {
    it('should return 201 Created with book data on success', async () => {
      const mockResponse: AddBookResponse = {
        success: true,
        message: 'Book added successfully',
        book: validBook,
      };
      mockBookService.addBook.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/books')
        .send({
          bookName: 'Clean Code',
          authorName: 'Robert C. Martin',
          isbn: '9780132350884',
          publicationYear: 2008,
          genre: 'Technology',
          publisher: 'Prentice Hall',
          totalCopies: 5,
          availableCopies: 3,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.book).toEqual(validBook);
    });

    it('should return 400 when validation fails (missing mandatory fields)', async () => {
      const validationError = new ValidationException([
        { field: 'bookName', message: 'Book Name is required' },
      ]);
      mockBookService.addBook.mockRejectedValue(validationError);

      const response = await request(app)
        .post('/api/books')
        .send({
          // Missing bookName and other required fields
          isbn: '9780132350884',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when multiple validation errors occur', async () => {
      const validationError = new ValidationException([
        { field: 'bookName', message: 'Book Name is required' },
        { field: 'isbn', message: 'ISBN must be a valid ISBN-10 or ISBN-13' },
        { field: 'totalCopies', message: 'Total Copies must be greater than 0' },
      ]);
      mockBookService.addBook.mockRejectedValue(validationError);

      const response = await request(app)
        .post('/api/books')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveLength(3);
    });

    it('should return 400 when ISBN is a duplicate (AC-04)', async () => {
      const duplicateError = new DuplicateIsbnException('9780132350884');
      mockBookService.addBook.mockRejectedValue(duplicateError);

      const response = await request(app)
        .post('/api/books')
        .send(validBook);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('A book with this ISBN already exists');
    });

    it('should return 500 when persistence fails', async () => {
      const persistenceError = new PersistenceException('Unable to save book to database');
      mockBookService.addBook.mockRejectedValue(persistenceError);

      const response = await request(app)
        .post('/api/books')
        .send(validBook);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unable to save book to database');
    });

    it('should return 500 with file-lock specific message when file is in use (M-2)', async () => {
      const fileLockError = new PersistenceException(
        'The book data file could not be accessed — it may be open in another program. Please close it and try again.'
      );
      mockBookService.addBook.mockRejectedValue(fileLockError);

      const response = await request(app)
        .post('/api/books')
        .send(validBook);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('book data file');
      expect(response.body.message).toContain('open in another program');
    });

    it('should return 500 when unexpected error occurs (without stack trace per §9)', async () => {
      const unexpectedError = new Error('Something went wrong');
      mockBookService.addBook.mockRejectedValue(unexpectedError);

      const response = await request(app)
        .post('/api/books')
        .send(validBook);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('An unexpected error occurred');
      // Verify no stack trace is exposed
      expect(JSON.stringify(response.body)).not.toContain('at ');
    });

    it('should accept all 8 required fields in request body', async () => {
      const mockResponse: AddBookResponse = {
        success: true,
        message: 'Book added successfully',
        book: validBook,
      };
      mockBookService.addBook.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/books')
        .send({
          bookName: 'Clean Code',
          authorName: 'Robert C. Martin',
          isbn: '9780132350884',
          publicationYear: 2008,
          genre: 'Technology',
          publisher: 'Prentice Hall',
          totalCopies: 5,
          availableCopies: 3,
        });

      expect(response.status).toBe(201);
      expect(mockBookService.addBook).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // GET /api/books/search Tests
  // ========================================================================

  describe('GET /api/books/search', () => {
    const testBooks: Book[] = [
      validBook,
      {
        ...validBook,
        bookName: 'Clean Architecture',
        isbn: '9780134494272',
      },
    ];

    it('should return 200 with search results when books match', async () => {
      const mockResponse: SearchResponse = {
        success: true,
        count: 1,
        results: [validBook],
      };
      mockBookService.searchBooks.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/books/search')
        .query({ bookName: 'Clean Code' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.results).toHaveLength(1);
    });

    it('should return 200 with empty results when no books match (FR-09)', async () => {
      const mockResponse: SearchResponse = {
        success: true,
        count: 0,
        results: [],
      };
      mockBookService.searchBooks.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/books/search')
        .query({ bookName: 'NonExistent' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(response.body.results).toEqual([]);
    });

    it('should return 200 with ALL books when search term is empty (Q-SEARCH-1)', async () => {
      // CRITICAL: Empty search must NOT return 400 error
      const mockResponse: SearchResponse = {
        success: true,
        count: 2,
        results: testBooks,
      };
      mockBookService.searchBooks.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/books/search')
        .query({ bookName: '' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.results).toHaveLength(2);
    });

    it('should return 200 with ALL books when bookName parameter is omitted (Q-SEARCH-1)', async () => {
      // CRITICAL: Omitted search parameter should return all books, not 400
      const mockResponse: SearchResponse = {
        success: true,
        count: 2,
        results: testBooks,
      };
      mockBookService.searchBooks.mockResolvedValue(mockResponse);

      const response = await request(app).get('/api/books/search');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
    });

    it('should return 200 with matching books for partial search', async () => {
      const mockResponse: SearchResponse = {
        success: true,
        count: 2,
        results: [validBook, testBooks[1]],
      };
      mockBookService.searchBooks.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/books/search')
        .query({ bookName: 'Clean' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
    });

    it('should return all 8 book fields in search results (AC-12)', async () => {
      const mockResponse: SearchResponse = {
        success: true,
        count: 1,
        results: [validBook],
      };
      mockBookService.searchBooks.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/books/search')
        .query({ bookName: 'Clean' });

      expect(response.status).toBe(200);
      const book = response.body.results[0];
      expect(book).toHaveProperty('bookName');
      expect(book).toHaveProperty('authorName');
      expect(book).toHaveProperty('isbn');
      expect(book).toHaveProperty('publicationYear');
      expect(book).toHaveProperty('genre');
      expect(book).toHaveProperty('publisher');
      expect(book).toHaveProperty('totalCopies');
      expect(book).toHaveProperty('availableCopies');
    });

    it('should return 500 when search fails', async () => {
      const searchError = new SearchException('Database error');
      mockBookService.searchBooks.mockRejectedValue(searchError);

      const response = await request(app)
        .get('/api/books/search')
        .query({ bookName: 'Clean' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    // CRITICAL NEGATIVE TEST: Empty search must NOT return 400
    it('should NOT return 400 for empty search (negative test for old NO_SEARCH_CRITERIA error)', async () => {
      // This explicitly tests that the old behavior (400 on empty search) is gone
      const mockResponse: SearchResponse = {
        success: true,
        count: 2,
        results: testBooks,
      };
      mockBookService.searchBooks.mockResolvedValue(mockResponse);

      const response = await request(app).get('/api/books/search');

      expect(response.status).not.toBe(400);
      expect(response.status).toBe(200); // Must be 200, returning all books
    });
  });

  // ========================================================================
  // GET /api/books/genres Tests (T-02, M-1 Resolution)
  // ========================================================================

  describe('GET /api/books/genres', () => {
    it('should return 200 with list of all 11 genres', async () => {
      const response = await request(app).get('/api/books/genres');

      expect(response.status).toBe(200);
      expect(response.body.genres).toBeDefined();
      expect(Array.isArray(response.body.genres)).toBe(true);
      expect(response.body.genres).toHaveLength(11);
    });

    it('should return exact genres from GENRE_VALUES in order', async () => {
      const response = await request(app).get('/api/books/genres');

      expect(response.status).toBe(200);
      expect(response.body.genres).toEqual(GENRE_VALUES);
    });

    it('should include all 11 expected genre values', async () => {
      const response = await request(app).get('/api/books/genres');

      const genres = response.body.genres;
      expect(genres).toContain('Fiction');
      expect(genres).toContain('Non-Fiction');
      expect(genres).toContain('Science');
      expect(genres).toContain('Technology');
      expect(genres).toContain('History');
      expect(genres).toContain('Biography');
      expect(genres).toContain('Children');
      expect(genres).toContain('Fantasy');
      expect(genres).toContain('Mystery');
      expect(genres).toContain('Romance');
      expect(genres).toContain('Other');
    });

    it('should return genres in exact order (no sorting/modification)', async () => {
      const response = await request(app).get('/api/books/genres');

      // Verify order matches GENRE_VALUES exactly
      for (let i = 0; i < GENRE_VALUES.length; i++) {
        expect(response.body.genres[i]).toBe(GENRE_VALUES[i]);
      }
    });

    it('should be the single source of truth for genre values (T-02 implementation)', async () => {
      // This endpoint is the single source of truth; frontend dropdown should consume from here
      const response = await request(app).get('/api/books/genres');

      expect(response.status).toBe(200);
      // No genres should be hard-coded in HTML/JS; they should all come from this endpoint
      expect(response.body.genres).toEqual(GENRE_VALUES);
    });

    it('should return 200 even if no query parameters provided', async () => {
      const response = await request(app).get('/api/books/genres');

      expect(response.status).toBe(200);
      expect(response.body.genres).toBeDefined();
    });

    it('should ignore any query parameters', async () => {
      const response = await request(app)
        .get('/api/books/genres')
        .query({ foo: 'bar', baz: 'qux' });

      expect(response.status).toBe(200);
      expect(response.body.genres).toEqual(GENRE_VALUES);
    });
  });

  // ========================================================================
  // HTTP Content-Type Tests
  // ========================================================================

  describe('HTTP Headers & Content-Type', () => {
    it('should return application/json content-type for all endpoints', async () => {
      const mockResponse: AddBookResponse = {
        success: true,
        message: 'Book added successfully',
        book: validBook,
      };
      mockBookService.addBook.mockResolvedValue(mockResponse);

      const postResponse = await request(app)
        .post('/api/books')
        .send(validBook);

      expect(postResponse.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
