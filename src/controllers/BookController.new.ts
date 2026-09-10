/**
 * BookController - HTTP request/response handling for book operations
 */

import { Request, Response, Router } from 'express';
import { IBookService } from '../services/BookService';
import {
  ValidationException,
  DuplicateIsbnException,
  PersistenceException,
  SearchException,
} from '../services/BookService';
import {
  AddBookRequest,
  ErrorResponse,
  GENRE_VALUES,
} from '../models/Book';
import { ErrorMessages } from '../constants/ErrorMessages';
import { Logger } from '../logger/Logger';

export class BookController {
  private bookService: IBookService;
  private router: Router;
  private logger: Logger;

  constructor(bookService: IBookService) {
    this.bookService = bookService;
    this.router = Router();
    this.logger = new Logger('BookController', 'info');
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupRoutes(): void {
    this.router.post('/books', (req: Request, res: Response) => {
      this.addBook(req, res);
    });

    this.router.get('/books/search', (req: Request, res: Response) => {
      this.searchBooks(req, res);
    });

    this.router.get('/books/genres', (req: Request, res: Response) => {
      this.getGenres(req, res);
    });
  }

  private async addBook(req: Request, res: Response): Promise<void> {
    try {
      const bookData: Partial<AddBookRequest> = req.body;

      this.logger.info('POST /api/books', {
        bookName: bookData.bookName,
        isbn: bookData.isbn,
      });

      const response = await this.bookService.addBook(bookData);

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof ValidationException) {
        this.logger.warn('Validation error', {
          errorCount: error.validationErrors.length,
        });

        const errorResponse: ErrorResponse = {
          success: false,
          errors: error.validationErrors,
        };

        res.status(400).json(errorResponse);
        return;
      }

      if (error instanceof DuplicateIsbnException) {
        this.logger.warn('Duplicate ISBN', { isbn: error.isbn });

        const errorResponse: ErrorResponse = {
          success: false,
          message: ErrorMessages.ISBN_DUPLICATE,
        };

        res.status(400).json(errorResponse);
        return;
      }

      if (error instanceof PersistenceException) {
        this.logger.error('Persistence error', { message: error.message });

        const errorResponse: ErrorResponse = {
          success: false,
          message: error.message || ErrorMessages.UNABLE_TO_SAVE,
        };

        res.status(500).json(errorResponse);
        return;
      }

      this.logger.error('Unexpected error in addBook', error);

      const errorResponse: ErrorResponse = {
        success: false,
        message: ErrorMessages.SERVER_ERROR,
      };

      res.status(500).json(errorResponse);
    }
  }

  private async searchBooks(req: Request, res: Response): Promise<void> {
    try {
      const bookName = (req.query.bookName as string) || '';

      this.logger.info('GET /api/books/search', {
        bookName: bookName.length > 0 ? bookName : '[all books]',
      });

      const response = await this.bookService.searchBooks(bookName);

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof SearchException) {
        this.logger.error('Search error', { message: error.message });

        const errorResponse: ErrorResponse = {
          success: false,
          message: ErrorMessages.UNABLE_TO_SEARCH,
        };

        res.status(500).json(errorResponse);
        return;
      }

      this.logger.error('Unexpected error in searchBooks', error);

      const errorResponse: ErrorResponse = {
        success: false,
        message: ErrorMessages.SERVER_ERROR,
      };

      res.status(500).json(errorResponse);
    }
  }

  private getGenres(_req: Request, res: Response): void {
    try {
      this.logger.info('GET /api/books/genres');

      res.status(200).json({
        genres: GENRE_VALUES,
      });
    } catch (error) {
      this.logger.error('Unexpected error in getGenres', error);

      const errorResponse: ErrorResponse = {
        success: false,
        message: ErrorMessages.SERVER_ERROR,
      };

      res.status(500).json(errorResponse);
    }
  }
}