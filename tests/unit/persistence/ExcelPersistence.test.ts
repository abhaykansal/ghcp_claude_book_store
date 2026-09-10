/**
 * Unit Tests for ExcelPersistence
 * Uses mocked fs and exceljs modules to avoid real file I/O
 * Satisfies AC-001, AC-009, AC-010 (add book, persistence, unique IDs)
 */

import * as fs from 'fs';
import ExcelJS from 'exceljs';
import { ExcelPersistence } from '../../../src/persistence/ExcelPersistence';

jest.mock('fs');
jest.mock('exceljs', () => {
  return {
    __esModule: true,
    default: {
      Workbook: jest.fn(),
    },
  };
});

type Row = (string | number)[];

/**
 * Builds a mock worksheet that records addRow calls and can replay
 * pre-seeded rows via eachRow (mimicking ExcelJS worksheet API).
 */
function createMockWorksheet(seedRows: Row[] = []) {
  const rows: Row[] = [...seedRows];
  return {
    addRow: jest.fn((row: Row) => {
      rows.push(row);
    }),
    eachRow: jest.fn((callback: (row: { getCell: (i: number) => { value: unknown }; cellCount: number }) => void) => {
      rows.forEach((row) => {
        callback({
          getCell: (i: number) => ({ value: row[i - 1] }),
          cellCount: row.length,
        });
      });
    }),
    getRows: () => rows,
  };
}

/**
 * Builds a mock ExcelJS.Workbook instance.
 */
function createMockWorkbook(
  options: {
    seedRows?: Row[];
    readFileImpl?: () => Promise<void>;
    writeFileImpl?: () => Promise<void>;
  } = {}
) {
  const worksheet = createMockWorksheet(options.seedRows || []);
  const workbook = {
    worksheet,
    addWorksheet: jest.fn(() => worksheet),
    getWorksheet: jest.fn(() => worksheet),
    xlsx: {
      readFile: jest.fn(options.readFileImpl || (async () => undefined)),
      writeFile: jest.fn(options.writeFileImpl || (async () => undefined)),
    },
  };
  return workbook;
}

const MockedWorkbookCtor = ExcelJS.Workbook as unknown as jest.Mock;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ExcelPersistence', () => {
  const testFilePath = './test-data/books-test.xlsx';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: data directory already exists
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockReturnValue(undefined as unknown as string);
  });

  // ==========================================================================
  // Constructor / Data Directory Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create data directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      // eslint-disable-next-line no-new
      new ExcelPersistence(testFilePath);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should not create data directory if it already exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      // eslint-disable-next-line no-new
      new ExcelPersistence(testFilePath);
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // addBook Tests
  // ==========================================================================

  describe('addBook', () => {
    it('should append a new row to an existing Excel file', async () => {
      const workbook = createMockWorkbook({
        seedRows: [
          [
            'bookName',
            'authorName',
            'isbn',
            'publicationYear',
            'genre',
            'publisher',
            'totalCopies',
            'availableCopies',
          ],
        ],
      });
      MockedWorkbookCtor.mockImplementation(() => workbook);
      mockedFs.existsSync.mockReturnValue(true);

      const persistence = new ExcelPersistence(testFilePath);
      const book = await persistence.addBook(
        'The Great Gatsby',
        'F. Scott Fitzgerald',
        '9780743273565'
      );

      expect(book.title).toBe('The Great Gatsby');
      expect(book.author).toBe('F. Scott Fitzgerald');
      expect(book.isbn).toBe('9780743273565');
      expect(book.bookId).toBeDefined();
      expect(book.dateAdded).toBeDefined();
      expect(workbook.xlsx.readFile).toHaveBeenCalledWith(testFilePath);
      expect(workbook.worksheet.addRow).toHaveBeenCalledWith([
        book.bookName,
        book.authorName,
        book.isbn,
        book.publicationYear,
        book.genre,
        book.publisher,
        book.totalCopies,
        book.availableCopies,
      ]);
      expect(workbook.xlsx.writeFile).toHaveBeenCalledWith(testFilePath);
    });

    it('should create a new workbook with headers when file does not exist', async () => {
      const workbook = createMockWorkbook();
      MockedWorkbookCtor.mockImplementation(() => workbook);
      mockedFs.existsSync.mockReturnValueOnce(true); // constructor: data dir exists
      mockedFs.existsSync.mockReturnValueOnce(false); // addBook: excel file missing

      const persistence = new ExcelPersistence(testFilePath);
      await persistence.addBook('New Book', 'New Author', '111');

      expect(workbook.addWorksheet).toHaveBeenCalledWith('Books');
      expect(workbook.worksheet.addRow).toHaveBeenCalledWith([
        'bookName',
        'authorName',
        'isbn',
        'publicationYear',
        'genre',
        'publisher',
        'totalCopies',
        'availableCopies',
      ]);
    });

    it('should generate a unique BookID for each added book', async () => {
      const workbook = createMockWorkbook();
      MockedWorkbookCtor.mockImplementation(() => workbook);

      const persistence = new ExcelPersistence(testFilePath);
      const book1 = await persistence.addBook('Book 1', 'Author 1', '111');
      const book2 = await persistence.addBook('Book 2', 'Author 2', '222');

      expect(book1.bookId).not.toBe(book2.bookId);
    });

    it('should include an ISO 8601 dateAdded timestamp', async () => {
      const workbook = createMockWorkbook();
      MockedWorkbookCtor.mockImplementation(() => workbook);

      const persistence = new ExcelPersistence(testFilePath);
      const book = await persistence.addBook('Book', 'Author', '123');

      expect(book.dateAdded).toBeDefined();
      expect(() => new Date(book.dateAdded!).toISOString()).not.toThrow();
      expect(new Date(book.dateAdded!).toISOString()).toBe(book.dateAdded);
    });

    it('should reject when writing to Excel file fails', async () => {
      const workbook = createMockWorkbook({
        writeFileImpl: async () => {
          throw new Error('Disk full');
        },
      });
      MockedWorkbookCtor.mockImplementation(() => workbook);

      const persistence = new ExcelPersistence(testFilePath);

      await expect(persistence.addBook('Book', 'Author', '123')).rejects.toThrow(
        /Failed to add book/
      );
    });

    it('should reject when reading existing Excel file fails', async () => {
      const workbook = createMockWorkbook({
        readFileImpl: async () => {
          throw new Error('Corrupted file');
        },
      });
      MockedWorkbookCtor.mockImplementation(() => workbook);
      mockedFs.existsSync.mockReturnValue(true);

      const persistence = new ExcelPersistence(testFilePath);

      await expect(persistence.addBook('Book', 'Author', '123')).rejects.toThrow(
        /Failed to add book/
      );
    });

    it('should serialize multiple concurrent addBook calls without data loss', async () => {
      const workbook = createMockWorkbook();
      MockedWorkbookCtor.mockImplementation(() => workbook);

      const persistence = new ExcelPersistence(testFilePath);

      const results = await Promise.all([
        persistence.addBook('Book A', 'Author A', '1'),
        persistence.addBook('Book B', 'Author B', '2'),
        persistence.addBook('Book C', 'Author C', '3'),
      ]);

      const ids = results.map((b) => b.bookId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
      expect(workbook.xlsx.writeFile).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // getAllBooks Tests
  // ==========================================================================

  describe('getAllBooks', () => {
    it('should return an empty array when the Excel file does not exist', async () => {
      mockedFs.existsSync.mockReturnValueOnce(true); // constructor
      mockedFs.existsSync.mockReturnValueOnce(false); // getAllBooks check

      const persistence = new ExcelPersistence(testFilePath);
      const books = await persistence.getAllBooks();

      expect(books).toEqual([]);
    });

    it('should parse all data rows into Book objects, skipping the header row', async () => {
      const seedRows: Row[] = [
        ['BookID', 'Title', 'Author', 'ISBN', 'DateAdded'],
        [
          'id-1',
          'The Great Gatsby',
          'F. Scott Fitzgerald',
          '9780743273565',
          '2026-01-01T00:00:00.000Z',
        ],
        [
          'id-2',
          'To Kill a Mockingbird',
          'Harper Lee',
          '9780061120084',
          '2026-01-02T00:00:00.000Z',
        ],
      ];
      const workbook = createMockWorkbook({ seedRows });
      MockedWorkbookCtor.mockImplementation(() => workbook);
      mockedFs.existsSync.mockReturnValue(true);

      const persistence = new ExcelPersistence(testFilePath);
      const books = await persistence.getAllBooks();

      expect(books).toHaveLength(2);
      expect(books[0]).toEqual({
        bookName: 'The Great Gatsby',
        authorName: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        publicationYear: new Date().getFullYear(),
        genre: 'Other',
        publisher: 'Unknown Publisher',
        totalCopies: 1,
        availableCopies: 1,
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        bookId: 'id-1',
        dateAdded: '2026-01-01T00:00:00.000Z',
      });
      expect(books[1].bookId).toBe('id-2');
    });

    it('should return an empty array when the worksheet has only a header row', async () => {
      const workbook = createMockWorkbook({
        seedRows: [['BookID', 'Title', 'Author', 'ISBN', 'DateAdded']],
      });
      MockedWorkbookCtor.mockImplementation(() => workbook);
      mockedFs.existsSync.mockReturnValue(true);

      const persistence = new ExcelPersistence(testFilePath);
      const books = await persistence.getAllBooks();

      expect(books).toEqual([]);
    });

    it('should skip malformed rows missing required fields', async () => {
      const seedRows: Row[] = [
        ['BookID', 'Title', 'Author', 'ISBN', 'DateAdded'],
        ['id-1', '', 'Author', '123', '2026-01-01T00:00:00.000Z'],
      ];
      const workbook = createMockWorkbook({ seedRows });
      MockedWorkbookCtor.mockImplementation(() => workbook);
      mockedFs.existsSync.mockReturnValue(true);

      const persistence = new ExcelPersistence(testFilePath);
      const books = await persistence.getAllBooks();

      expect(books).toEqual([]);
    });

    it('should return an empty array when the worksheet is missing', async () => {
      const workbook = createMockWorkbook();
      (workbook.getWorksheet as jest.Mock).mockReturnValue(undefined);
      MockedWorkbookCtor.mockImplementation(() => workbook);
      mockedFs.existsSync.mockReturnValue(true);

      const persistence = new ExcelPersistence(testFilePath);
      const books = await persistence.getAllBooks();

      expect(books).toEqual([]);
    });

    it('should throw an error when reading the Excel file fails', async () => {
      const workbook = createMockWorkbook({
        readFileImpl: async () => {
          throw new Error('Corrupted file');
        },
      });
      MockedWorkbookCtor.mockImplementation(() => workbook);
      mockedFs.existsSync.mockReturnValue(true);

      const persistence = new ExcelPersistence(testFilePath);

      await expect(persistence.getAllBooks()).rejects.toThrow(/Failed to read books/);
    });
  });

  // ==========================================================================
  // generateBookId Tests
  // ==========================================================================

  describe('generateBookId', () => {
    it('should generate a valid UUID v4', () => {
      const persistence = new ExcelPersistence(testFilePath);
      const id = persistence.generateBookId();

      const uuidV4Pattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidV4Pattern);
    });

    it('should generate unique IDs across multiple calls', () => {
      const persistence = new ExcelPersistence(testFilePath);
      const ids = new Set(Array.from({ length: 20 }, () => persistence.generateBookId()));

      expect(ids.size).toBe(20);
    });
  });
});
