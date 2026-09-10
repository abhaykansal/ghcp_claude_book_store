/**
 * Unit Tests for BookController
 * Uses a mocked IBookService to isolate HTTP-layer behavior
 * Satisfies AC-001 through AC-012 (HTTP contract verification)
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
import { AddBookResponse, SearchResponse } from '../../../src/models/Book';

function buildApp(bookService: IBookService): Express {
  const app = express();
  app.use(express.json());
  const controller = new BookController(bookService);
  app.use('/api', controller.getRouter());
  return app;
}

describe('BookController (unit, mocked BookService)', () => {
  // ==========================================================================
  // POST /api/books
  // ==========================================================================

  describe('POST /api/books', () => {
    it('should return 201 with book data when addBook succeeds', async () => {
      const mockResponse: AddBookResponse = {
        success: true,
        bookId: 'book-1',
        message: 'Book added successfully',
        book: {
          bookId: 'book-1',
          title: 'Title',
          author: 'Author',
          isbn: '123',
          dateAdded: '2026-01-01T00:00:00.000Z',
        },
      };
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn().mockResolvedValue(mockResponse),
        searchBooks: jest.fn(),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .post('/api/books')
        .send({ title: 'Title', author: 'Author', isbn: '123' })
        .expect(201);

      expect(response.body).toEqual(mockResponse);
      expect(mockService.addBook).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Title',
        author: 'Author',
        isbn: '123',
        bookName: 'Title',
        authorName: 'Author',
      }));
    });

    it('should return 400 with field errors when ValidationException is thrown', async () => {
      const validationErrors = [{ field: 'title', message: 'Title is required' }];
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn().mockRejectedValue(new ValidationException(validationErrors)),
        searchBooks: jest.fn(),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .post('/api/books')
        .send({ title: '', author: 'Author', isbn: '123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(validationErrors);
    });

    it('should return 400 with the duplicate ISBN message when DuplicateIsbnException is thrown', async () => {
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn().mockRejectedValue(new DuplicateIsbnException('9780743273565')),
        searchBooks: jest.fn(),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .post('/api/books')
        .send({ bookName: 'The Great Gatsby', authorName: 'F. Scott Fitzgerald', isbn: '9780743273565' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'A book with this ISBN already exists',
      });
    });

    it('should return 500 with UNABLE_TO_SAVE message when PersistenceException is thrown', async () => {
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn().mockRejectedValue(new PersistenceException('DB down')),
        searchBooks: jest.fn(),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .post('/api/books')
        .send({ title: 'Title', author: 'Author', isbn: '123' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unable to save book to database');
    });

    it('should return 500 with generic SERVER_ERROR message for unexpected errors', async () => {
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn().mockRejectedValue(new Error('Unexpected boom')),
        searchBooks: jest.fn(),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .post('/api/books')
        .send({ title: 'Title', author: 'Author', isbn: '123' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('An unexpected error occurred');
    });

    it('should not crash with a 500 when title is a non-string (number) value; request logging must be type-safe', async () => {
      // HIGH-2 regression test: previously `title.substring(0, 50)` was
      // called before any type validation, so a truthy non-string title
      // (e.g. a number) threw a TypeError that was swallowed by the
      // outer catch and surfaced as a generic 500. The request must
      // reach the service layer instead of crashing in the logger call.
      const mockResponse: AddBookResponse = {
        success: true,
        bookId: 'book-1',
        message: 'Book added successfully',
        book: {
          bookId: 'book-1',
          title: '12345',
          author: 'Author',
          isbn: '123',
          dateAdded: '2026-01-01T00:00:00.000Z',
        },
      };
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn().mockResolvedValue(mockResponse),
        searchBooks: jest.fn(),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .post('/api/books')
        .send({ title: 12345, author: 'Author', isbn: '123' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockService.addBook).toHaveBeenCalledWith(expect.objectContaining({
        title: 12345,
        author: 'Author',
        isbn: '123',
        authorName: 'Author',
      }));
    });
  });

  // ==========================================================================
  // GET /api/books/search
  // ==========================================================================

  describe('GET /api/books/search', () => {
    it('should return 200 with results when searchBooks succeeds via title', async () => {
      const mockResponse: SearchResponse = {
        success: true,
        count: 1,
        results: [
          {
            bookId: 'book-1',
            title: 'Title',
            author: 'Author',
            isbn: '123',
            dateAdded: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn(),
        searchBooks: jest.fn().mockResolvedValue(mockResponse),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .get('/api/books/search')
        .query({ title: 'Title' })
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockService.searchBooks).toHaveBeenCalledWith({
        type: 'title',
        value: 'Title',
      });
    });

    it('should route search by author when only author query param is provided', async () => {
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn(),
        searchBooks: jest.fn().mockResolvedValue({ success: true, count: 0, results: [] }),
      };
      const app = buildApp(mockService);

      await request(app).get('/api/books/search').query({ author: 'Author' }).expect(200);

      expect(mockService.searchBooks).toHaveBeenCalledWith({
        type: 'author',
        value: 'Author',
      });
    });

    it('should route search by isbn when only isbn query param is provided', async () => {
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn(),
        searchBooks: jest.fn().mockResolvedValue({ success: true, count: 0, results: [] }),
      };
      const app = buildApp(mockService);

      await request(app).get('/api/books/search').query({ isbn: '123' }).expect(200);

      expect(mockService.searchBooks).toHaveBeenCalledWith({
        type: 'isbn',
        value: '123',
      });
    });

    it('should return 400 when no search criteria is provided', async () => {
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn(),
        searchBooks: jest.fn(),
      };
      const app = buildApp(mockService);

      const response = await request(app).get('/api/books/search').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        'Please provide a search criterion (title, author, or isbn)'
      );
      expect(mockService.searchBooks).not.toHaveBeenCalled();
    });

    it('should return 400 when title query param is an empty string (not routed to ISBN search)', async () => {
      // MEDIUM-1 regression test: `?title=` (empty string) must be
      // treated as "no criteria provided" and must NOT be mis-routed to
      // an ISBN search for the literal string "undefined".
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn(),
        searchBooks: jest.fn(),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .get('/api/books/search')
        .query({ title: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        'Please provide a search criterion (title, author, or isbn)'
      );
      expect(mockService.searchBooks).not.toHaveBeenCalled();
    });

    it('should return 500 with UNABLE_TO_SEARCH message when SearchException is thrown', async () => {
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn(),
        searchBooks: jest.fn().mockRejectedValue(new SearchException('Search backend down')),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .get('/api/books/search')
        .query({ title: 'Title' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unable to search at this time');
    });

    it('should return 500 with generic SERVER_ERROR message for unexpected search errors', async () => {
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn(),
        searchBooks: jest.fn().mockRejectedValue(new Error('Unexpected boom')),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .get('/api/books/search')
        .query({ title: 'Title' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('An unexpected error occurred');
    });

    it('should return empty results array when no books match', async () => {
      const mockService: IBookService = {
        addReview: jest.fn(),
        getReviewsForBook: jest.fn(),
        addBook: jest.fn(),
        searchBooks: jest.fn().mockResolvedValue({ success: true, count: 0, results: [] }),
      };
      const app = buildApp(mockService);

      const response = await request(app)
        .get('/api/books/search')
        .query({ title: 'NoMatch' })
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.results).toEqual([]);
    });
  });
});
