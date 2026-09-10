/**
 * ExcelPersistence: Manages book persistence using Excel files.
 * Uses the approved 8-field Book model and keeps a compatibility ID helper.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';
import { Book, DuplicateIsbnException, Review } from '../models/Book';
import { Logger } from '../logger/Logger';

export interface IPersistence {
  addBook(book: Book | string, author?: string, isbn?: string): Promise<Book>;
  addBook(bookName: string, authorName: string, isbn: string): Promise<Book>;
  getAllBooks(): Promise<Book[]>;
  generateBookId(): string;
  addReview(isbn: string, rating: number, reviewText: string): Promise<Review>;
  getReviewsByIsbn(isbn: string): Promise<Review[]>;
}

const HEADERS = [
  'bookName',
  'authorName',
  'isbn',
  'publicationYear',
  'genre',
  'publisher',
  'totalCopies',
  'availableCopies',
];

const REVIEWS_SHEET_NAME = 'Reviews';
const REVIEW_HEADERS = ['reviewId', 'isbn', 'rating', 'reviewText', 'dateAdded'];

const normalizeIsbn = (isbn: string): string => isbn.replace(/[\s-]/g, '').toUpperCase();

export class ExcelPersistence implements IPersistence {
  private filePath: string;
  private logger: Logger;
  private writeQueue: Array<() => Promise<void>> = [];
  private isWriting = false;

  constructor(filePath: string = './data/books.xlsx') {
    this.filePath = filePath;
    this.logger = new Logger('ExcelPersistence', 'info');
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.logger.info('Created data directory', { dir });
    }
  }

  private async processWriteQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;
    try {
      while (this.writeQueue.length > 0) {
        const writeOperation = this.writeQueue.shift();
        if (writeOperation) {
          await writeOperation();
        }
      }
    } finally {
      this.isWriting = false;
    }
  }

  async addBook(book: Book | string, author?: string, isbn?: string): Promise<Book> {
    const isLegacyInput = typeof book === 'string';
    const normalizedBook: Book = isLegacyInput
      ? {
          bookName: (book || '').trim(),
          authorName: (author || '').trim(),
          isbn: (isbn || '').trim(),
          publicationYear: new Date().getFullYear(),
          genre: 'Other',
          publisher: 'Unknown Publisher',
          totalCopies: 1,
          availableCopies: 1,
          title: (book || '').trim(),
          author: (author || '').trim(),
          bookId: this.generateBookId(),
          dateAdded: new Date().toISOString(),
        }
      : {
          ...book,
          bookName: (book.bookName || book.title || '').trim(),
          authorName: (book.authorName || book.author || '').trim(),
          isbn: (book.isbn || '').trim(),
          publicationYear: Number(book.publicationYear ?? new Date().getFullYear()),
          genre: (book.genre as Book['genre']) || 'Other',
          publisher: (book.publisher || 'Unknown Publisher').trim(),
          totalCopies: Number(book.totalCopies ?? 1),
          availableCopies: Number(book.availableCopies ?? 1),
          title: (book.title || book.bookName || '').trim(),
          author: (book.author || book.authorName || '').trim(),
          bookId: book.bookId || this.generateBookId(),
          dateAdded: book.dateAdded || new Date().toISOString(),
        };

    return new Promise((resolve, reject) => {
      const writeOp = async (): Promise<void> => {
        try {
          const workbook = new ExcelJS.Workbook();

          if (fs.existsSync(this.filePath)) {
            await workbook.xlsx.readFile(this.filePath);
          } else {
            const worksheet = workbook.addWorksheet('Books');
            worksheet.addRow(HEADERS);
          }

          const worksheet = workbook.getWorksheet(1);
          if (worksheet) {
            const modernRow = [
              normalizedBook.bookName,
              normalizedBook.authorName,
              normalizedBook.isbn,
              normalizedBook.publicationYear,
              normalizedBook.genre,
              normalizedBook.publisher,
              normalizedBook.totalCopies,
              normalizedBook.availableCopies,
            ];

            let isHeaderRow = true;
            const incomingIsbn = normalizeIsbn(normalizedBook.isbn ?? '');
            worksheet.eachRow((row) => {
              if (isHeaderRow) {
                isHeaderRow = false;
                return;
              }

              const isbnColumn = row.cellCount >= 8 ? 3 : 4;
              const existingIsbn = String(row.getCell(isbnColumn).value ?? '');
              if (incomingIsbn && normalizeIsbn(existingIsbn) === incomingIsbn) {
                throw new DuplicateIsbnException(normalizedBook.isbn ?? '');
              }
            });

            worksheet.addRow(modernRow);
            await workbook.xlsx.writeFile(this.filePath);
            this.logger.info('Book added to Excel', {
              isbn: normalizedBook.isbn,
              bookName: normalizedBook.bookName,
            });
          }

          resolve(normalizedBook);
        } catch (error) {
          this.logger.error('Error adding book to Excel', error);
          if (error instanceof DuplicateIsbnException) {
            reject(error);
            return;
          }
          reject(
            new Error(
              `Failed to add book: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          );
        }
      };

      this.writeQueue.push(writeOp);
      this.processWriteQueue().catch((err) => {
        this.logger.error('Error processing write queue', err);
        reject(err);
      });
    });
  }

  async getAllBooks(): Promise<Book[]> {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.logger.info('Excel file not found, returning empty array');
        return [];
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.filePath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        return [];
      }

      const books: Book[] = [];
      let isFirstRow = true;

      worksheet.eachRow((row) => {
        if (isFirstRow) {
          isFirstRow = false;
          return;
        }

        const cellCount = row.cellCount || 8;
        const firstCell = String(row.getCell(1).value ?? '').trim();
        const secondCell = String(row.getCell(2).value ?? '').trim();
        const thirdCell = String(row.getCell(3).value ?? '').trim();
        const fourthCell = String(row.getCell(4).value ?? '').trim();
        const fifthCell = String(row.getCell(5).value ?? '').trim();

        let book: Book | undefined;

        if (cellCount >= 8 && !['BookID', 'Title', 'Author', 'ISBN', 'DateAdded'].includes(firstCell)) {
          const bookName = String(row.getCell(1).value ?? '').trim();
          const authorName = String(row.getCell(2).value ?? '').trim();
          const isbn = String(row.getCell(3).value ?? '').trim();
          const publicationYear = Number(row.getCell(4).value ?? 0);
          const genre = String(row.getCell(5).value ?? 'Other') as Book['genre'];
          const publisher = String(row.getCell(6).value ?? '').trim();
          const totalCopies = Number(row.getCell(7).value ?? 0);
          const availableCopies = Number(row.getCell(8).value ?? 0);

          if (bookName && authorName && isbn && publicationYear && publisher) {
            book = {
              bookName,
              authorName,
              isbn,
              publicationYear,
              genre,
              publisher,
              totalCopies,
              availableCopies,
              title: bookName,
              author: authorName,
              bookId: `${isbn}-${bookName}`,
              dateAdded: new Date().toISOString(),
            };
          }
        } else if (cellCount >= 5 && firstCell && secondCell && thirdCell && fourthCell && fifthCell) {
          const bookId = firstCell;
          const title = secondCell;
          const author = thirdCell;
          const isbn = fourthCell;
          const dateAdded = fifthCell;

          book = {
            bookName: title,
            authorName: author,
            isbn,
            publicationYear: new Date().getFullYear(),
            genre: 'Other',
            publisher: 'Unknown Publisher',
            totalCopies: 1,
            availableCopies: 1,
            title,
            author,
            bookId,
            dateAdded,
          };
        }

        if (book) {
          books.push(book);
        }
      });

      this.logger.info('Retrieved books from Excel', { count: books.length });
      return books;
    } catch (error) {
      this.logger.error('Error reading Excel file', error);
      throw new Error(
        `Failed to read books: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  generateBookId(): string {
    return uuidv4();
  }

  async addReview(isbn: string, rating: number, reviewText: string): Promise<Review> {
    const review: Review = {
      reviewId: uuidv4(),
      isbn: isbn.trim(),
      rating,
      reviewText: reviewText.trim(),
      dateAdded: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const writeOp = async (): Promise<void> => {
        try {
          const workbook = new ExcelJS.Workbook();

          if (fs.existsSync(this.filePath)) {
            await workbook.xlsx.readFile(this.filePath);
          } else {
            const booksSheet = workbook.addWorksheet('Books');
            booksSheet.addRow(HEADERS);
          }

          let reviewsSheet = workbook.getWorksheet(REVIEWS_SHEET_NAME);
          if (!reviewsSheet) {
            reviewsSheet = workbook.addWorksheet(REVIEWS_SHEET_NAME);
            reviewsSheet.addRow(REVIEW_HEADERS);
          }

          reviewsSheet.addRow([
            review.reviewId,
            review.isbn,
            review.rating,
            review.reviewText,
            review.dateAdded,
          ]);

          await workbook.xlsx.writeFile(this.filePath);
          this.logger.info('Review added to Excel', { isbn: review.isbn, reviewId: review.reviewId });
          resolve(review);
        } catch (error) {
          this.logger.error('Error adding review to Excel', error);
          reject(
            new Error(
              `Failed to add review: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          );
        }
      };

      this.writeQueue.push(writeOp);
      this.processWriteQueue().catch((err) => {
        this.logger.error('Error processing write queue', err);
        reject(err);
      });
    });
  }

  async getReviewsByIsbn(isbn: string): Promise<Review[]> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.filePath);
      const reviewsSheet = workbook.getWorksheet(REVIEWS_SHEET_NAME);

      if (!reviewsSheet) {
        return [];
      }

      const normalizedTarget = normalizeIsbn(isbn);
      const reviews: Review[] = [];
      let isFirstRow = true;

      reviewsSheet.eachRow((row) => {
        if (isFirstRow) {
          isFirstRow = false;
          return;
        }

        const reviewId = String(row.getCell(1).value ?? '').trim();
        const rowIsbn = String(row.getCell(2).value ?? '').trim();
        const rating = Number(row.getCell(3).value ?? 0);
        const reviewText = String(row.getCell(4).value ?? '').trim();
        const dateAdded = String(row.getCell(5).value ?? '').trim();

        if (reviewId && normalizeIsbn(rowIsbn) === normalizedTarget) {
          reviews.push({ reviewId, isbn: rowIsbn, rating, reviewText, dateAdded });
        }
      });

      return reviews;
    } catch (error) {
      this.logger.error('Error reading reviews from Excel', error);
      throw new Error(
        `Failed to read reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
