/**
 * SearchEngine: Book search by name only
 * Keeps compatibility with the legacy title/author/isbn search API when needed.
 */

import { Book } from '../models/Book';

export interface ISearchEngine {
  searchByBookName(term: string, books: Book[]): Book[];
  searchByTitle?(searchTerm: string, books: Book[]): Book[];
  searchByAuthor?(searchTerm: string, books: Book[]): Book[];
  searchByISBN?(isbn: string, books: Book[]): Book[];
}

export class SearchEngine implements ISearchEngine {
  searchByBookName(term: string, books: Book[]): Book[] {
    if (!books || !Array.isArray(books)) {
      return [];
    }

    const trimmedTerm = (term || '').trim();

    if (trimmedTerm.length === 0) {
      return [];
    }

    const lowerTerm = trimmedTerm.toLowerCase();
    return books
      .filter((book) => {
        const bookName = (book.bookName ?? book.title ?? '').toString().toLowerCase();
        return bookName.includes(lowerTerm);
      })
      .sort((a, b) => {
        const left = (a.bookName ?? a.title ?? '').toString();
        const right = (b.bookName ?? b.title ?? '').toString();
        return left.localeCompare(right);
      });
  }

  searchByTitle(searchTerm: string, books: Book[]): Book[] {
    return this.searchByBookName(searchTerm, books);
  }

  searchByAuthor(searchTerm: string, books: Book[]): Book[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    return books
      .filter((book) => {
        const authorName = (book.authorName ?? book.author ?? '').toString().toLowerCase();
        return authorName.includes(lowerSearchTerm);
      })
      .sort((a, b) => {
        const authorCompare = ((a.authorName ?? a.author ?? '') as string).localeCompare((b.authorName ?? b.author ?? '') as string);
        if (authorCompare !== 0) {
          return authorCompare;
        }
        return ((a.bookName ?? a.title ?? '') as string).localeCompare((b.bookName ?? b.title ?? '') as string);
      });
  }

  searchByISBN(isbn: string, books: Book[]): Book[] {
    if (!isbn || isbn.trim() === '') {
      return [];
    }

    const trimmedISBN = isbn.trim();
    return books.filter((book) => {
      const storedISBN = (book.isbn ?? '').toString();
      return storedISBN === trimmedISBN;
    });
  }
}
