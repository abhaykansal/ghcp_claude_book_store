/**
 * SearchEngine: Book search by name only
 */

import { Book } from '../models/Book';

export interface ISearchEngine {
  searchByBookName(term: string, books: Book[]): Book[];
}

export class SearchEngine implements ISearchEngine {
  searchByBookName(term: string, books: Book[]): Book[] {
    if (!books || !Array.isArray(books)) {
      return [];
    }

    const trimmedTerm = (term || '').trim();

    if (trimmedTerm.length === 0) {
      return books;
    }

    const lowerTerm = trimmedTerm.toLowerCase();

    return books.filter((book) => (book.bookName ?? book.title ?? '').toLowerCase().includes(lowerTerm));
  }
}