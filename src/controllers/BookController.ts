/**
 * BookController - HTTP request/response handling for book operations.
 * Uses the approved 8-field model while still accepting legacy query/input keys.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { IBookService } from '../services/BookService';
import {
  ValidationException,
  DuplicateIsbnException,
  PersistenceException,
  SearchException,
  BookNotFoundException,
} from '../services/BookService';
import { ErrorMessages } from '../constants/ErrorMessages';
import { Logger } from '../logger/Logger';

export class BookController {
  private router: Router;
  private bookService: IBookService;
  private logger: Logger;

  constructor(bookService: IBookService) {
    this.router = Router();
    this.bookService = bookService;
    this.logger = new Logger('BookController', 'info');
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.post('/books', this.addBook.bind(this));
    this.router.get('/books/search', this.searchBooks.bind(this));
    this.router.get('/books/genres', this.getGenres.bind(this));
    this.router.post('/books/:isbn/reviews', this.addReview.bind(this));
    this.router.get('/books/:isbn/reviews', this.getReviews.bind(this));
  }

  private async searchBooks(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { bookName, title, authorName, author, isbn } = req.query;

      const isProvided = (value: unknown): boolean =>
        value !== undefined && String(value).trim() !== '';

      let searchRequest: { type: 'title' | 'author' | 'isbn'; value: string } | null = null;

      if (isProvided(bookName) || isProvided(title)) {
        searchRequest = {
          type: 'title',
          value: String(isProvided(bookName) ? bookName : title),
        };
      } else if (isProvided(authorName) || isProvided(author)) {
        searchRequest = {
          type: 'author',
          value: String(isProvided(authorName) ? authorName : author),
        };
      } else if (isProvided(isbn)) {
        searchRequest = {
          type: 'isbn',
          value: String(isbn),
        };
      }

      if (!searchRequest || !searchRequest.value.trim()) {
        this.logger.warn('Search request missing criteria');
        res.status(400).json({
          success: false,
          message: ErrorMessages.NO_SEARCH_CRITERIA,
        });
        return;
      }

      this.logger.info('Search request', { searchType: searchRequest.type, value: searchRequest.value });
      const response = await this.bookService.searchBooks(searchRequest);
      res.status(200).json(response);
    } catch (error) {
      this.logger.error('Error in search endpoint', error);
      if (error instanceof SearchException) {
        res.status(500).json({
          success: false,
          message: ErrorMessages.UNABLE_TO_SEARCH,
        });
      } else {
        res.status(500).json({
          success: false,
          message: ErrorMessages.SERVER_ERROR,
        });
      }
    }
  }

  private async addBook(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const payload = req.body;
      const safeBookName = typeof payload?.bookName === 'string' ? payload.bookName.substring(0, 50) : undefined;
      const safeTitle = typeof payload?.title === 'string' ? payload.title.substring(0, 50) : undefined;
      this.logger.info('Add book request', {
        bookName: safeBookName ?? safeTitle,
      });

      const requestBody = {
        ...payload,
        bookName: typeof payload?.bookName === 'string' ? payload.bookName : typeof payload?.title === 'string' ? payload.title : undefined,
        authorName: typeof payload?.authorName === 'string' ? payload.authorName : typeof payload?.author === 'string' ? payload.author : undefined,
      };

      const response = await this.bookService.addBook(requestBody);
      res.status(201).json(response);
    } catch (error) {
      this.logger.error('Error in add book endpoint', error);

      if (error instanceof ValidationException) {
        res.status(400).json({
          success: false,
          errors: error.validationErrors,
        });
      } else if (error instanceof DuplicateIsbnException) {
        res.status(400).json({
          success: false,
          message: ErrorMessages.ISBN_DUPLICATE,
        });
      } else if (error instanceof PersistenceException) {
        res.status(500).json({
          success: false,
          message: ErrorMessages.UNABLE_TO_SAVE,
        });
      } else {
        res.status(500).json({
          success: false,
          message: ErrorMessages.SERVER_ERROR,
        });
      }
    }
  }

  private async addReview(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { isbn } = req.params;
      const { rating, reviewText } = req.body ?? {};

      this.logger.info('Add review request', { isbn });

      const response = await this.bookService.addReview(isbn, rating, reviewText);
      res.status(201).json(response);
    } catch (error) {
      this.logger.error('Error in add review endpoint', error);

      if (error instanceof ValidationException) {
        res.status(400).json({
          success: false,
          errors: error.validationErrors,
        });
      } else if (error instanceof BookNotFoundException) {
        res.status(404).json({
          success: false,
          message: ErrorMessages.BOOK_NOT_FOUND,
        });
      } else if (error instanceof PersistenceException) {
        res.status(500).json({
          success: false,
          message: ErrorMessages.UNABLE_TO_SAVE_REVIEW,
        });
      } else {
        res.status(500).json({
          success: false,
          message: ErrorMessages.SERVER_ERROR,
        });
      }
    }
  }

  private async getReviews(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { isbn } = req.params;

      this.logger.info('Get reviews request', { isbn });

      const response = await this.bookService.getReviewsForBook(isbn);
      res.status(200).json(response);
    } catch (error) {
      this.logger.error('Error in get reviews endpoint', error);

      if (error instanceof BookNotFoundException) {
        res.status(404).json({
          success: false,
          message: ErrorMessages.BOOK_NOT_FOUND,
        });
      } else if (error instanceof PersistenceException) {
        res.status(500).json({
          success: false,
          message: ErrorMessages.UNABLE_TO_READ_REVIEWS,
        });
      } else {
        res.status(500).json({
          success: false,
          message: ErrorMessages.SERVER_ERROR,
        });
      }
    }
  }

  private getGenres(_req: Request, res: Response): void {
    res.status(200).json({
      genres: ['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Biography', 'Children', 'Fantasy', 'Mystery', 'Romance', 'Other'],
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
