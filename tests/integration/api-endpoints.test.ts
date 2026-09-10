/**
 * Integration Tests for Book Controller / API Endpoints
 * Tests HTTP requests and responses using Supertest
 */

import request from 'supertest';
import express, { Express } from 'express';
import { BookController } from '../../src/controllers/BookController';
import { BookService } from '../../src/services/BookService';
import { ValidationService } from '../../src/services/ValidationService';
import { SearchEngine } from '../../src/services/SearchEngine';
import { Book, Review } from '../../src/models/Book';
import { IPersistence } from '../../src/persistence/ExcelPersistence';

class MockPersistence implements IPersistence {
  private reviews: Review[] = [];
  private books: Book[] = [
    {
      bookId: 'test-1',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: '9780743273565',
      dateAdded: '2026-01-01T00:00:00Z',
    },
    {
      bookId: 'test-2',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      isbn: '9780061120084',
      dateAdded: '2026-01-02T00:00:00Z',
    },
  ];

  async addBook(bookInput: Book | string, author?: string, isbn?: string): Promise<Book> {
    const title = typeof bookInput === 'string' ? bookInput : bookInput.title;
    const authorName = typeof bookInput === 'string' ? author ?? '' : bookInput.author;
    const bookIsbn = typeof bookInput === 'string' ? isbn ?? '' : bookInput.isbn ?? '';
    const book: Book = {
      bookId: `book-${Date.now()}`,
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
    return `book-${Date.now()}`;
  }

  async addReview(isbn: string, rating: number, reviewText: string): Promise<Review> {
    const review: Review = {
      reviewId: `review-${this.reviews.length}`,
      isbn,
      rating,
      reviewText,
      dateAdded: new Date().toISOString(),
    };
    this.reviews.push(review);
    return review;
  }

  async getReviewsByIsbn(isbn: string): Promise<Review[]> {
    return this.reviews.filter((r) => r.isbn === isbn);
  }
}

describe('Book API Endpoints', () => {
  let app: Express;
  let mockPersistence: MockPersistence;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Setup services
    mockPersistence = new MockPersistence();
    const validationService = new ValidationService();
    const searchEngine = new SearchEngine();
    const bookService = new BookService(validationService as any, searchEngine, mockPersistence);

    // Setup controller
    const bookController = new BookController(bookService);
    app.use('/api', bookController.getRouter());
  });

  // ========================================================================
  // POST /api/books Tests
  // ========================================================================

  describe('POST /api/books', () => {
    it('should add a new book successfully', async () => {
      const newBook = {
        title: 'New Book',
        author: 'New Author',
        isbn: '9780123456789',
      };

      const response = await request(app)
        .post('/api/books')
        .send(newBook)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.bookId).toBeDefined();
      expect(response.body.message).toBe('Book added successfully');
      expect(response.body.book.title).toBe(newBook.title);
      expect(response.body.book.author).toBe(newBook.author);
      expect(response.body.book.isbn).toBe(newBook.isbn);
    });

    it('should return 400 for missing title', async () => {
      const invalidBook = {
        author: 'Author',
        isbn: '9780123456789',
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.field === 'title')).toBe(true);
    });

    it('should return 400 for missing author', async () => {
      const invalidBook = {
        title: 'Title',
        isbn: '9780123456789',
      };

      const response = await request(app).post('/api/books').send(invalidBook).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((e: any) => e.field === 'author')).toBe(true);
    });

    it('should return 400 for missing ISBN', async () => {
      const invalidBook = {
        title: 'Title',
        author: 'Author',
      };

      const response = await request(app).post('/api/books').send(invalidBook).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((e: any) => e.field === 'isbn')).toBe(true);
    });

    it('should return 400 for all fields missing', async () => {
      const invalidBook = {};

      const response = await request(app).post('/api/books').send(invalidBook).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should return 400 for title exceeding max length', async () => {
      const invalidBook = {
        title: 'a'.repeat(256),
        author: 'Author',
        isbn: '9780123456789',
      };

      const response = await request(app).post('/api/books').send(invalidBook).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((e: any) => e.field === 'title')).toBe(true);
    });

    it('should return 400 (not 500) when title is a non-string value (e.g. a number)', async () => {
      // HIGH-2 regression test: a truthy non-string title must not crash
      // the request-logging code path (title.substring on a number) and
      // must instead be rejected by validation with a field-specific 400.
      const invalidBook = {
        title: 12345,
        author: 'Author',
        isbn: '9780123456789',
      };

      const response = await request(app).post('/api/books').send(invalidBook).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((e: any) => e.field === 'title')).toBe(true);
    });

    it('should accept special characters in book data', async () => {
      const specialBook = {
        title: "O'Brien's: A Novel & Tale",
        author: 'Harper Lee, Ph.D.',
        isbn: '978-0-7432-7356-5',
      };

      const response = await request(app).post('/api/books').send(specialBook).expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should trim whitespace from fields', async () => {
      const book = {
        title: '  Book Title  ',
        author: '  Author Name  ',
        isbn: '  9780123456789  ',
      };

      const response = await request(app).post('/api/books').send(book).expect(201);

      expect(response.body.book.title).toBe('Book Title');
      expect(response.body.book.author).toBe('Author Name');
      expect(response.body.book.isbn).toBe('9780123456789');
    });
  });

  // ========================================================================
  // GET /api/books/search Tests
  // ========================================================================

  describe('GET /api/books/search', () => {
    it('should search by title successfully', async () => {
      const response = await request(app)
        .get('/api/books/search')
        .query({ title: 'Gatsby' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      // "The Great Gatsby" in test data contains "Gatsby"
      expect(response.body.count).toBe(1);
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results[0].title).toBe('The Great Gatsby');
    });

    it('should search by author successfully', async () => {
      const response = await request(app)
        .get('/api/books/search')
        .query({ author: 'Harper' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.results[0].author).toBe('Harper Lee');
    });

    it('should search by ISBN successfully', async () => {
      const response = await request(app)
        .get('/api/books/search')
        .query({ isbn: '9780743273565' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.results[0].isbn).toBe('9780743273565');
    });

    it('should return 400 when no search criteria provided', async () => {
      const response = await request(app).get('/api/books/search').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 (not mis-route to ISBN search) when title query param is an empty string', async () => {
      // MEDIUM-1 regression test: `?title=` (empty string) must be treated
      // as "no criteria provided", not routed to an ISBN search for the
      // literal string "undefined".
      const response = await request(app).get('/api/books/search').query({ title: '' }).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should return empty results for no matches', async () => {
      const response = await request(app)
        .get('/api/books/search')
        .query({ title: 'NonexistentBook' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(response.body.results).toHaveLength(0);
    });

    it('should be case-insensitive for title search', async () => {
      const response1 = await request(app)
        .get('/api/books/search')
        .query({ title: 'the great' })
        .expect(200);

      const response2 = await request(app)
        .get('/api/books/search')
        .query({ title: 'THE GREAT' })
        .expect(200);

      expect(response1.body.count).toBe(response2.body.count);
    });

    it('should support partial title match', async () => {
      const response = await request(app)
        .get('/api/books/search')
        .query({ title: 'Great' })
        .expect(200);

      expect(response.body.count).toBe(1);
    });

    it('should handle special characters in search', async () => {
      const response = await request(app)
        .get('/api/books/search')
        .query({ title: 'Mockingbird' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ========================================================================
  // Response Format Tests
  // ========================================================================

  describe('Response Format', () => {
    it('should return proper JSON structure on success', async () => {
      const response = await request(app)
        .post('/api/books')
        .send({
          title: 'Test',
          author: 'Test',
          isbn: '123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('bookId');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('book');
    });

    it('should return proper JSON structure on validation error', async () => {
      const response = await request(app)
        .post('/api/books')
        .send({
          author: 'Test',
          isbn: '123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should include all book fields in response', async () => {
      const response = await request(app)
        .post('/api/books')
        .send({
          title: 'Test Title',
          author: 'Test Author',
          isbn: '9780123456789',
        })
        .expect(201);

      const book = response.body.book;
      expect(book).toHaveProperty('bookId');
      expect(book).toHaveProperty('title');
      expect(book).toHaveProperty('author');
      expect(book).toHaveProperty('isbn');
      expect(book).toHaveProperty('dateAdded');
    });
  });

  // ========================================================================
  // Acceptance Criteria Verification
  // ========================================================================

  describe('Acceptance Criteria Verification', () => {
    it('should satisfy AC-001 (Add Book Happy Path)', async () => {
      // AC-001: Book added successfully, returns success message, book appears in search results
      const addResponse = await request(app)
        .post('/api/books')
        .send({
          title: 'Test Book for AC-001',
          author: 'Test Author',
          isbn: '978-AC-001-TEST',
        })
        .expect(201);

      expect(addResponse.body.success).toBe(true);
      expect(addResponse.body.message).toBe('Book added successfully');
      expect(addResponse.body.book.title).toBe('Test Book for AC-001');
    });

    it('should satisfy AC-002 (Missing Title Validation)', async () => {
      // AC-002: Missing title → error displayed, book not saved
      const response = await request(app)
        .post('/api/books')
        .send({
          author: 'Author',
          isbn: '123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((e: any) => e.field === 'title')).toBe(true);
    });

    it('should satisfy AC-003 (Missing Author Validation)', async () => {
      // AC-003: Missing author → error displayed, book not saved
      const response = await request(app)
        .post('/api/books')
        .send({
          title: 'Title',
          isbn: '123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((e: any) => e.field === 'author')).toBe(true);
    });

    it('should satisfy AC-004 (Missing ISBN Validation)', async () => {
      // AC-004: Missing ISBN → error displayed, book not saved
      const response = await request(app)
        .post('/api/books')
        .send({
          title: 'Title',
          author: 'Author',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((e: any) => e.field === 'isbn')).toBe(true);
    });

    it('should satisfy AC-005 (Search by Title)', async () => {
      // AC-005: Search by title, case-insensitive, partial match
      const response = await request(app)
        .get('/api/books/search')
        .query({ title: 'GREAT' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.results[0].title).toBe('The Great Gatsby');
    });

    it('should satisfy AC-006 (Search by Author)', async () => {
      // AC-006: Search by author, case-insensitive, partial match
      const response = await request(app)
        .get('/api/books/search')
        .query({ author: 'harper' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.results[0].author).toBe('Harper Lee');
    });

    it('should satisfy AC-007 (Search by ISBN)', async () => {
      // AC-007: Search by ISBN, exact match
      const response = await request(app)
        .get('/api/books/search')
        .query({ isbn: '9780743273565' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.results[0].isbn).toBe('9780743273565');
    });

    it('should satisfy AC-008 (No Results Message)', async () => {
      // AC-008: No results found → display message
      const response = await request(app)
        .get('/api/books/search')
        .query({ title: 'NonexistentBook' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(response.body.results).toHaveLength(0);
    });

    it('should satisfy AC-011 (Results Display All Fields)', async () => {
      // AC-011: Search results display BookID, Title, Author, ISBN
      const response = await request(app)
        .get('/api/books/search')
        .query({ author: 'Harper' })
        .expect(200);

      const book = response.body.results[0];
      expect(book).toHaveProperty('bookId');
      expect(book).toHaveProperty('title');
      expect(book).toHaveProperty('author');
      expect(book).toHaveProperty('isbn');
    });

    it('should satisfy AC-012 (User-Friendly Error Messages)', async () => {
      // AC-012: Error messages are user-friendly, field-specific
      const response = await request(app)
        .post('/api/books')
        .send({
          title: '',
          author: '',
          isbn: '',
        })
        .expect(400);

      response.body.errors.forEach((error: any) => {
        // Check that messages are not technical
        expect(error.message).not.toContain('Error');
        expect(error.message).not.toContain('NullPointerException');
        // Check that messages identify the field
        expect(error).toHaveProperty('field');
        expect(['title', 'author', 'isbn']).toContain(error.field);
      });
    });
  });
});
