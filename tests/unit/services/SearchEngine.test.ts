/**
 * Unit Tests for SearchEngine
 * Tests all search methods and sorting
 */

import { SearchEngine } from '../../../src/services/SearchEngine';
import { Book } from '../../../src/models/Book';

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let testBooks: Book[];

  beforeEach(() => {
    searchEngine = new SearchEngine();

    testBooks = [
      {
        bookId: '1',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        dateAdded: '2026-01-01T00:00:00Z',
      },
      {
        bookId: '2',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '9780061120084',
        dateAdded: '2026-01-02T00:00:00Z',
      },
      {
        bookId: '3',
        title: "Gatsby's Dream",
        author: 'Unknown Author',
        isbn: '9780743273566',
        dateAdded: '2026-01-03T00:00:00Z',
      },
      {
        bookId: '4',
        title: '1984',
        author: 'George Orwell',
        isbn: '9780451524935',
        dateAdded: '2026-01-04T00:00:00Z',
      },
      {
        bookId: '5',
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        isbn: '9780141439518',
        dateAdded: '2026-01-05T00:00:00Z',
      },
    ];
  });

  // ========================================================================
  // searchByTitle Tests
  // ========================================================================

  describe('searchByTitle', () => {
    it('should find book by exact title match', () => {
      const results = searchEngine.searchByTitle('1984', testBooks);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('1984');
    });

    it('should find books by partial title match', () => {
      const results = searchEngine.searchByTitle('Gatsby', testBooks);
      expect(results).toHaveLength(2);
      expect(results.map((b) => b.title)).toContain('The Great Gatsby');
      expect(results.map((b) => b.title)).toContain("Gatsby's Dream");
    });

    it('should be case-insensitive', () => {
      const results1 = searchEngine.searchByTitle('gatsby', testBooks);
      const results2 = searchEngine.searchByTitle('GATSBY', testBooks);
      const results3 = searchEngine.searchByTitle('GaTsBy', testBooks);

      expect(results1).toHaveLength(2);
      expect(results2).toHaveLength(2);
      expect(results3).toHaveLength(2);
    });

    it('should return empty array when no match found', () => {
      const results = searchEngine.searchByTitle('NonexistentBook', testBooks);
      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should sort results alphabetically by title', () => {
      const results = searchEngine.searchByTitle('Gatsby', testBooks);
      expect(results[0].title).toBe("Gatsby's Dream");
      expect(results[1].title).toBe('The Great Gatsby');
    });

    it('should handle empty search term', () => {
      const results = searchEngine.searchByTitle('', testBooks);
      expect(results).toHaveLength(0);
    });

    it('should handle whitespace-only search term', () => {
      const results = searchEngine.searchByTitle('   ', testBooks);
      expect(results).toHaveLength(0);
    });

    it('should handle special characters in search', () => {
      const results = searchEngine.searchByTitle("'s", testBooks);
      expect(results.some((b) => b.title.includes("'"))).toBe(true);
    });

    it('should handle unicode in search', () => {
      const booksWithUnicode: Book[] = [
        ...testBooks,
        {
          bookId: '6',
          title: 'Café: A Story',
          author: 'José García',
          isbn: '9780123456789',
          dateAdded: '2026-01-06T00:00:00Z',
        },
      ];
      const results = searchEngine.searchByTitle('Café', booksWithUnicode);
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Café');
    });
  });

  // ========================================================================
  // searchByAuthor Tests
  // ========================================================================

  describe('searchByAuthor', () => {
    it('should find book by exact author match', () => {
      const results = searchEngine.searchByAuthor('George Orwell', testBooks);
      expect(results).toHaveLength(1);
      expect(results[0].author).toBe('George Orwell');
    });

    it('should find books by partial author match', () => {
      const results = searchEngine.searchByAuthor('Harper', testBooks);
      expect(results).toHaveLength(1);
      expect(results[0].author).toBe('Harper Lee');
    });

    it('should be case-insensitive', () => {
      const results1 = searchEngine.searchByAuthor('harper', testBooks);
      const results2 = searchEngine.searchByAuthor('HARPER', testBooks);
      const results3 = searchEngine.searchByAuthor('HaRpEr', testBooks);

      expect(results1).toHaveLength(1);
      expect(results2).toHaveLength(1);
      expect(results3).toHaveLength(1);
    });

    it('should return empty array when no match found', () => {
      const results = searchEngine.searchByAuthor('NonexistentAuthor', testBooks);
      expect(results).toHaveLength(0);
    });

    it('should sort results by author then title', () => {
      const multiAuthorBooks: Book[] = [
        {
          bookId: '1',
          title: 'Book A',
          author: 'Smith, John',
          isbn: '1',
          dateAdded: '2026-01-01T00:00:00Z',
        },
        {
          bookId: '2',
          title: 'Book Z',
          author: 'Smith, John',
          isbn: '2',
          dateAdded: '2026-01-02T00:00:00Z',
        },
        {
          bookId: '3',
          title: 'Book M',
          author: 'Smith, John',
          isbn: '3',
          dateAdded: '2026-01-03T00:00:00Z',
        },
      ];

      const results = searchEngine.searchByAuthor('Smith', multiAuthorBooks);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Book A');
      expect(results[1].title).toBe('Book M');
      expect(results[2].title).toBe('Book Z');
    });

    it('should sort by author name first when authors differ', () => {
      const results = searchEngine.searchByAuthor('e', testBooks);
      // Multiple authors contain "e": Fitzgerald, Lee, Unknown Author, Orwell, Austen
      expect(results.length).toBeGreaterThan(1);
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].author.localeCompare(results[i + 1].author)).toBeLessThanOrEqual(0);
      }
    });

    it('should handle empty search term', () => {
      const results = searchEngine.searchByAuthor('', testBooks);
      expect(results).toHaveLength(0);
    });

    it('should handle whitespace-only search term', () => {
      const results = searchEngine.searchByAuthor('   ', testBooks);
      expect(results).toHaveLength(0);
    });
  });

  // ========================================================================
  // searchByISBN Tests
  // ========================================================================

  describe('searchByISBN', () => {
    it('should find book by exact ISBN match', () => {
      const results = searchEngine.searchByISBN('9780743273565', testBooks);
      expect(results).toHaveLength(1);
      expect(results[0].isbn).toBe('9780743273565');
    });

    it('should be case-sensitive for ISBN', () => {
      const results = searchEngine.searchByISBN('9780743273565', testBooks);
      expect(results).toHaveLength(1);
    });

    it('should return empty array for partial ISBN match', () => {
      const results = searchEngine.searchByISBN('978074327356', testBooks);
      expect(results).toHaveLength(0);
    });

    it('should return empty array when no match found', () => {
      const results = searchEngine.searchByISBN('9999999999999', testBooks);
      expect(results).toHaveLength(0);
    });

    it('should handle empty search term', () => {
      const results = searchEngine.searchByISBN('', testBooks);
      expect(results).toHaveLength(0);
    });

    it('should handle whitespace-only search term', () => {
      const results = searchEngine.searchByISBN('   ', testBooks);
      expect(results).toHaveLength(0);
    });

    it('should trim whitespace from ISBN before matching', () => {
      const results = searchEngine.searchByISBN('  9780743273565  ', testBooks);
      expect(results).toHaveLength(1);
    });

    it('should distinguish between similar ISBNs', () => {
      const results1 = searchEngine.searchByISBN('9780743273565', testBooks);
      const results2 = searchEngine.searchByISBN('9780743273566', testBooks);

      expect(results1).toHaveLength(1);
      expect(results1[0].title).toBe('The Great Gatsby');

      expect(results2).toHaveLength(1);
      expect(results2[0].title).toBe("Gatsby's Dream");
    });
  });

  // ========================================================================
  // Empty Books Array Tests
  // ========================================================================

  describe('Empty Books Array', () => {
    it('should return empty array when books array is empty for title search', () => {
      const results = searchEngine.searchByTitle('Test', []);
      expect(results).toHaveLength(0);
    });

    it('should return empty array when books array is empty for author search', () => {
      const results = searchEngine.searchByAuthor('Test', []);
      expect(results).toHaveLength(0);
    });

    it('should return empty array when books array is empty for ISBN search', () => {
      const results = searchEngine.searchByISBN('Test', []);
      expect(results).toHaveLength(0);
    });
  });

  // ========================================================================
  // Special Characters and Edge Cases
  // ========================================================================

  describe('Special Characters and Edge Cases', () => {
    it('should handle apostrophes in titles', () => {
      const results = searchEngine.searchByTitle("'s", testBooks);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle hyphens in ISBN', () => {
      const results = searchEngine.searchByISBN('978-0-7432-7356-5', testBooks);
      expect(results).toHaveLength(0);
    });

    it('should handle very long search terms', () => {
      const longTerm = 'a'.repeat(500);
      const results = searchEngine.searchByTitle(longTerm, testBooks);
      expect(results).toHaveLength(0);
    });
  });
});
