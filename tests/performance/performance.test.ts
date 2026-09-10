/**
 * Performance Validation Tests — Task T5.9
 * Verifies the <200ms p95 search requirement using the real
 * ExcelPersistence + SearchEngine implementation (real file I/O).
 * See PERFORMANCE_VALIDATION.md for the full benchmark report (T2.1).
 */

import * as fs from 'fs';
import * as path from 'path';
import { ExcelPersistence } from '../../src/persistence/ExcelPersistence';
import { SearchEngine } from '../../src/services/SearchEngine';

const PERF_FILE = path.join(__dirname, 'perf-test-books.xlsx');
const P95_THRESHOLD_MS = 200;

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

describe('Performance Validation (real Excel I/O)', () => {
  afterEach(() => {
    if (fs.existsSync(PERF_FILE)) {
      fs.unlinkSync(PERF_FILE);
    }
  });

  it('should satisfy <200ms p95 search latency for a 200-book catalog', async () => {
    const persistence = new ExcelPersistence(PERF_FILE);
    const searchEngine = new SearchEngine();
    const bookCount = 200;
    const requestCount = 20;

    for (let i = 0; i < bookCount; i++) {
      await persistence.addBook(
        `Performance Test Book ${i}`,
        `Performance Author ${i % 20}`,
        `978-PERF-${i}`
      );
    }

    const durations: number[] = [];
    for (let i = 0; i < requestCount; i++) {
      const start = performance.now();
      const books = await persistence.getAllBooks();
      searchEngine.searchByTitle('Performance', books);
      durations.push(performance.now() - start);
    }

    durations.sort((a, b) => a - b);
    const p95 = percentile(durations, 95);

    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  }, 30000);

  it('should perform in-memory search filtering well under 10ms regardless of Excel I/O', () => {
    const searchEngine = new SearchEngine();
    const books = Array.from({ length: 1000 }, (_, i) => ({
      bookId: `id-${i}`,
      title: `Book Title ${i}`,
      author: `Author ${i % 30}`,
      isbn: `978-${i}`,
      dateAdded: new Date().toISOString(),
    }));

    const start = performance.now();
    searchEngine.searchByTitle('Book Title 5', books);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });
});
