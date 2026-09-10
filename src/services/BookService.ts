/**
 * BookService - Orchestrates business logic for the approved 8-field book model.
 * Kept backward-compatible with legacy callers that still pass { title, author, isbn }.
 */

import {
  Book,
  AddBookRequest,
  AddBookResponse,
  SearchResponse,
  ValidationException,
  DuplicateIsbnException,
  PersistenceException,
  SearchException,
  ValidationResult,
} from '../models/Book';
import { IValidationEngine } from './ValidationEngine';
import { ISearchEngine } from './SearchEngine';
import { IPersistence } from '../persistence/ExcelPersistence';
import { Logger } from '../logger/Logger';
import { ErrorMessages } from '../constants/ErrorMessages';

export interface IBookService {
  addBook(bookData: Partial<Book> & Partial<AddBookRequest>): Promise<AddBookResponse>;
  searchBooks(searchTerm: string | { type: string; value: string }): Promise<SearchResponse>;
}

export {
  ValidationException,
  DuplicateIsbnException,
  PersistenceException,
  SearchException,
};

export class BookService implements IBookService {
  private validationEngine: IValidationEngine;
  private searchEngine: ISearchEngine;
  private persistence: IPersistence;
  private logger: Logger;

  constructor(
    validationEngine: IValidationEngine | {
      validateBook: (book: Partial<Book> | Record<string, unknown> | string, author?: string, isbn?: string) => ValidationResult;
    },
    searchEngine: ISearchEngine,
    persistence: IPersistence
  ) {
    this.validationEngine = validationEngine;
    this.searchEngine = searchEngine;
    this.persistence = persistence;
    this.logger = new Logger('BookService', 'info');
  }

  private normalizeBookInput(bookData: Partial<Book> & Partial<AddBookRequest>): Partial<Book> {
    const normalized: Partial<Book> = { ...bookData };

    const legacyTitle = (bookData as Record<string, unknown>).title;
    const legacyAuthor = (bookData as Record<string, unknown>).author;
    const legacyBookName = (bookData as Record<string, unknown>).bookName;
    const legacyAuthorName = (bookData as Record<string, unknown>).authorName;

    if (typeof legacyTitle === 'string' && typeof normalized.bookName !== 'string') {
      normalized.bookName = legacyTitle;
    }
    if (typeof legacyAuthor === 'string' && typeof normalized.authorName !== 'string') {
      normalized.authorName = legacyAuthor;
    }
    if (typeof legacyBookName === 'string') {
      normalized.bookName = legacyBookName;
    }
    if (typeof legacyAuthorName === 'string') {
      normalized.authorName = legacyAuthorName;
    }

    if (!normalized.publicationYear && typeof (bookData as Record<string, unknown>).publicationYear !== 'undefined') {
      normalized.publicationYear = Number((bookData as Record<string, unknown>).publicationYear as string | number);
    }
    if (!normalized.genre) {
      normalized.genre = 'Other';
    }
    if (!normalized.publisher) {
      normalized.publisher = 'Unknown Publisher';
    }
    if (!normalized.totalCopies) {
      normalized.totalCopies = 1;
    }
    if (typeof normalized.availableCopies === 'undefined') {
      normalized.availableCopies = 1;
    }

    return normalized;
  }

  async addBook(bookData: Partial<Book> & Partial<AddBookRequest>): Promise<AddBookResponse> {
    const normalizedBook = this.normalizeBookInput(bookData);

    const legacyTypeErrors: Array<{ field: string; message: string }> = [];
    if (typeof normalizedBook.bookName !== 'undefined' && typeof normalizedBook.bookName !== 'string') {
      legacyTypeErrors.push({ field: 'title', message: ErrorMessages.TITLE_REQUIRED });
    }
    if (typeof normalizedBook.title !== 'undefined' && typeof normalizedBook.title !== 'string') {
      legacyTypeErrors.push({ field: 'title', message: ErrorMessages.TITLE_REQUIRED });
    }
    if (typeof normalizedBook.authorName !== 'undefined' && typeof normalizedBook.authorName !== 'string') {
      legacyTypeErrors.push({ field: 'author', message: ErrorMessages.AUTHOR_REQUIRED });
    }
    if (typeof normalizedBook.author !== 'undefined' && typeof normalizedBook.author !== 'string') {
      legacyTypeErrors.push({ field: 'author', message: ErrorMessages.AUTHOR_REQUIRED });
    }
    if (typeof normalizedBook.isbn !== 'undefined' && typeof normalizedBook.isbn !== 'string') {
      legacyTypeErrors.push({ field: 'isbn', message: ErrorMessages.ISBN_REQUIRED });
    }
    if (legacyTypeErrors.length > 0) {
      throw new ValidationException(legacyTypeErrors);
    }

    const title = (normalizedBook.bookName ?? normalizedBook.title ?? '').toString().trim();
    const author = (normalizedBook.authorName ?? normalizedBook.author ?? '').toString().trim();
    const isbn = (normalizedBook.isbn ?? '').toString().trim();

    this.logger.info('Adding new book', {
      bookName: title,
      authorName: author,
      isbn,
    });

    const validation = this.validationEngine.validateBook(
      normalizedBook as Partial<Book> | Record<string, unknown>
    );

    if (!validation.isValid) {
      this.logger.warn('Book validation failed', {
        bookName: title,
        errorCount: validation.errors.length,
        errors: validation.errors,
      });
      throw new ValidationException(validation.errors);
    }

    try {
      const bookToPersist: Book = {
        ...normalizedBook,
        bookName: title,
        authorName: author,
        isbn,
        title,
        author,
      };
      const book = await this.persistence.addBook(bookToPersist);
      const persistedBook: Book = {
        ...book,
        bookName: (book?.bookName ?? book?.title ?? title).toString(),
        authorName: (book?.authorName ?? book?.author ?? author).toString(),
        title: (book?.title ?? book?.bookName ?? title).toString(),
        author: (book?.author ?? book?.authorName ?? author).toString(),
        isbn: (book?.isbn ?? isbn).toString(),
        dateAdded: book?.dateAdded || new Date().toISOString(),
        bookId: book?.bookId || this.persistence.generateBookId(),
      };

      this.logger.info('Book added successfully', {
        isbn: persistedBook.isbn,
        bookName: persistedBook.bookName,
      });

      return {
        success: true,
        message: 'Book added successfully',
        bookId: persistedBook.bookId,
        book: persistedBook,
      };
    } catch (error) {
      if (error instanceof DuplicateIsbnException) {
        this.logger.warn('Duplicate ISBN detected', { isbn: error.isbn });
        throw error;
      }

      if (error instanceof PersistenceException) {
        this.logger.error('Persistence error while adding book', {
          message: error.message,
        });
        throw error;
      }

      this.logger.error('Unexpected error while adding book', error);
      throw new PersistenceException(
        `Unable to save book to the database: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async searchBooks(searchTerm: string | { type: string; value: string }): Promise<SearchResponse> {
    const request = typeof searchTerm === 'string'
      ? { type: 'title', value: searchTerm }
      : searchTerm ?? { type: 'title', value: '' };

    const type = (request.type || 'title').toLowerCase();
    const value = (request.value ?? '').toString().trim();

    this.logger.info('Searching books', {
      type,
      searchTerm: value.length > 0 ? value : '[all books]',
    });

    try {
      const books = await this.persistence.getAllBooks();
      let results: Book[] = [];

      if (type === 'author') {
        results = this.searchEngine.searchByAuthor?.(value, books) ?? books.filter((book) =>
          (book.authorName ?? book.author ?? '').toLowerCase().includes(value.toLowerCase())
        );
      } else if (type === 'isbn') {
        results = this.searchEngine.searchByISBN?.(value, books) ?? books.filter((book) => (book.isbn ?? '').toLowerCase() === value.toLowerCase());
      } else {
        results = this.searchEngine.searchByBookName(value, books);
      }

      this.logger.info('Search completed', {
        type,
        resultCount: results.length,
      });

      return {
        success: true,
        count: results.length,
        results,
      };
    } catch (error) {
      this.logger.error('Error searching books', error);
      throw new SearchException(
        `Unable to search at this time: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
