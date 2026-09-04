/**
 * Centralized error message constants for the application
 */

export const ErrorMessages = {
  BOOK_NAME_REQUIRED: 'Book name is required',
  BOOK_NAME_MAX_LENGTH: 'Book name must be 255 characters or less',

  AUTHOR_NAME_REQUIRED: 'Author name is required',
  AUTHOR_NAME_MAX_LENGTH: 'Author name must be 255 characters or less',

  ISBN_REQUIRED: 'ISBN is required',
  ISBN_INVALID_FORMAT: 'ISBN must be a valid ISBN-10 or ISBN-13',
  ISBN_DUPLICATE: 'A book with this ISBN already exists',

  PUBLICATION_YEAR_REQUIRED: 'Publication year is required',
  PUBLICATION_YEAR_INVALID: 'Publication year must be a number',
  PUBLICATION_YEAR_FOUR_DIGITS: 'Publication year must be a 4-digit year',
  PUBLICATION_YEAR_NOT_FUTURE: 'Publication year cannot be in the future',

  GENRE_REQUIRED: 'Genre is required',
  GENRE_INVALID: 'Genre must be one of the allowed values',

  PUBLISHER_REQUIRED: 'Publisher is required',
  PUBLISHER_MAX_LENGTH: 'Publisher must be 255 characters or less',

  TOTAL_COPIES_REQUIRED: 'Total copies is required',
  TOTAL_COPIES_INVALID: 'Total copies must be a number',
  TOTAL_COPIES_INTEGER: 'Total copies must be a whole number',
  TOTAL_COPIES_POSITIVE: 'Total copies must be greater than 0',

  AVAILABLE_COPIES_REQUIRED: 'Available copies is required',
  AVAILABLE_COPIES_INVALID: 'Available copies must be a number',
  AVAILABLE_COPIES_INTEGER: 'Available copies must be a whole number',
  AVAILABLE_COPIES_NON_NEGATIVE: 'Available copies cannot be negative',
  AVAILABLE_EXCEEDS_TOTAL: 'Available copies cannot exceed total copies',

  UNABLE_TO_SAVE: 'Unable to save book to database',
  UNABLE_TO_READ: 'Unable to read books from database',

  NO_SEARCH_CRITERIA: 'Please provide a search criterion (title, author, or isbn)',
  UNABLE_TO_SEARCH: 'Unable to search at this time',

  SERVER_ERROR: 'An unexpected error occurred',

  // Legacy compatibility aliases used by the older ValidationService tests.
  TITLE_REQUIRED: 'Book name is required',
  TITLE_WHITESPACE_ONLY: 'Book name is required',
  TITLE_MAX_LENGTH: 'Book name must be 255 characters or less',
  AUTHOR_REQUIRED: 'Author name is required',
  AUTHOR_WHITESPACE_ONLY: 'Author name is required',
  AUTHOR_MAX_LENGTH: 'Author name must be 255 characters or less',
  ISBN_WHITESPACE_ONLY: 'ISBN is required',
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;