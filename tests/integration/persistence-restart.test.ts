/**
 * Integration Test: ExcelPersistence restart safety (AC-009)
 *
 * AC-009 requires that added books "persist after restart". The existing
 * unit tests for ExcelPersistence mock `fs` and `exceljs`, which only
 * proves in-memory queue/promise behavior — not that data survives past
 * the lifetime of a single ExcelPersistence instance.
 *
 * This test uses REAL file I/O (no mocks): it creates one
 * ExcelPersistence instance, writes a book, discards that instance
 * entirely, then creates a SECOND, independent ExcelPersistence instance
 * pointed at the same file path and confirms the book is retrievable.
 * This proves persistence survives an application/instance restart.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ExcelPersistence } from '../../src/persistence/ExcelPersistence';

describe('ExcelPersistence - restart safety (AC-009, real file I/O)', () => {
  const testFilePath = path.join(__dirname, '../../test-data/restart-safety-test.xlsx');

  beforeEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.rmSync(testFilePath);
    }
  });

  afterAll(() => {
    if (fs.existsSync(testFilePath)) {
      fs.rmSync(testFilePath);
    }
    const dir = path.dirname(testFilePath);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  });

  it('should retrieve a book written by a discarded instance from a brand-new ExcelPersistence instance pointed at the same file', async () => {
    // Step 1: First instance writes a book and is then discarded
    // (simulating the process ending / the application restarting).
    let firstInstance: ExcelPersistence | undefined = new ExcelPersistence(testFilePath);
    const written = await firstInstance.addBook(
      'Restart Safety Book',
      'Restart Safety Author',
      '9781234567897'
    );
    firstInstance = undefined; // discard reference; no shared in-memory state

    // Step 2: A brand-new, independent instance is created for the same
    // file path (simulating the app restarting and re-opening storage).
    const secondInstance = new ExcelPersistence(testFilePath);
    const booksAfterRestart = await secondInstance.getAllBooks();

    const found = booksAfterRestart.find((b) => b.isbn === written.isbn);
    expect(found).toBeDefined();
    expect(found?.title).toBe('Restart Safety Book');
    expect(found?.author).toBe('Restart Safety Author');
    expect(found?.isbn).toBe('9781234567897');
  });

  it('should accumulate books written across multiple independent instance restarts', async () => {
    const instanceA = new ExcelPersistence(testFilePath);
    await instanceA.addBook('Book One', 'Author One', '111');

    const instanceB = new ExcelPersistence(testFilePath);
    await instanceB.addBook('Book Two', 'Author Two', '222');

    const instanceC = new ExcelPersistence(testFilePath);
    const allBooks = await instanceC.getAllBooks();

    expect(allBooks).toHaveLength(2);
    expect(allBooks.map((b) => b.title).sort()).toEqual(['Book One', 'Book Two']);
  });
});
