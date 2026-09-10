/**
 * Book Entity - Represents a book in the library catalog
 * Eight-field model per SCRUM-9 requirements
 */

export const GENRE_VALUES = [
  'Fiction',
  'Non-Fiction',
  'Science',
  'Technology',
  'History',
  'Biography',
  'Children',
  'Fantasy',
  'Mystery',
  'Romance',
  'Other',
] as const;

export type Genre = typeof GENRE_VALUES[number];

export interface Book {
  bookName?: string;
  authorName?: string;
  isbn?: string;
  publicationYear?: number | string;
  genre?: Genre | string;
  publisher?: string;
  totalCopies?: number | string;
  availableCopies?: number | string;

  // Backward-compatibility aliases used by legacy tests and older service code.
  bookId?: string;
  title: string;
  author: string;
  dateAdded?: string;
}

export interface AddBookRequest {
  bookName?: string;
  authorName?: string;
  isbn?: string;
  publicationYear?: number | string;
  genre?: Genre | string;
  publisher?: string;
  totalCopies?: number | string;
  availableCopies?: number | string;

  // Legacy field names still accepted for older callers/tests.
  title?: string;
  author?: string;
  bookId?: string;
  dateAdded?: string;
}

export interface AddBookResponse {
  success: true;
  message: string;
  bookId?: string;
  book: Book;
}

export interface SearchResponse {
  success: true;
  count: number;
  results: Book[];
}

export interface ErrorResponse {
  success: false;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class ValidationException extends Error {
  public readonly validationErrors: ValidationError[];

  constructor(validationErrors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
    this.validationErrors = validationErrors;
  }
}

export class DuplicateIsbnException extends Error {
  public readonly isbn: string;

  constructor(isbn: string) {
    super(`A book with ISBN ${isbn} already exists`);
    this.name = 'DuplicateIsbnException';
    this.isbn = isbn;
  }
}

export class PersistenceException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PersistenceException';
  }
}

export class SearchException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchException';
  }
}

export class BookNotFoundException extends Error {
  public readonly isbn: string;

  constructor(isbn: string) {
    super(`No book found with ISBN ${isbn}`);
    this.name = 'BookNotFoundException';
    this.isbn = isbn;
  }
}

export interface Review {
  reviewId: string;
  isbn: string;
  rating: number;
  reviewText: string;
  dateAdded: string;
}

export interface AddReviewRequest {
  rating: number | string;
  reviewText: string;
}

export interface AddReviewResponse {
  success: true;
  message: string;
  review: Review;
  averageRating: number;
  reviewCount: number;
}

export interface ReviewsResponse {
  success: true;
  isbn: string;
  averageRating: number;
  reviewCount: number;
  reviews: Review[];
}