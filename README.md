# Library Book Management System

## Overview

This is a complete implementation of SCRUM-9: Library Book Management System. It provides core functionality for managing a library's book catalog, including adding books, validating data, storing information persistently, and searching for books by various criteria.

## Features

- **Add Books**: Users can add new books to the library catalog with Title, Author, and ISBN
- **Validate Data**: All input data is validated server-side before storage
- **Search Books**: Users can search books by Title (partial, case-insensitive), Author (partial, case-insensitive), or ISBN (exact match)
- **Persistent Storage**: Books are stored in Excel format (append-only model)
- **REST API**: Complete REST API with JSON request/response contracts
- **Browser UI**: User-friendly HTML/CSS/JavaScript interface

## Prerequisites

- Node.js LTS (v18 or higher)
- npm (v9 or higher)

## Installation

```bash
# Clone or navigate to the project directory
cd claude_ai_book_store

# Install dependencies
npm install
```

## Configuration

Create a `.env` file (optional) with the following variables:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
EXCEL_FILE_PATH=./data/books.xlsx
```

## Running the Application

### Development Mode (with hot reload)

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Production Mode

```bash
npm run build
npm start
```

## Using the Application

### Web Interface

1. **Add Book**: Navigate to `http://localhost:3000/`
   - Enter Book Title, Author, and ISBN
   - Click "Add Book"
   - Receive confirmation with assigned Book ID

2. **Search Books**: Navigate to `http://localhost:3000/search`
   - Enter search criteria (Title, Author, or ISBN)
   - Click "Search"
   - View matching books in results table

### REST API

#### Add Book

```bash
POST /api/books
Content-Type: application/json

{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "isbn": "9780743273565"
}

Response (201 Created):
{
  "success": true,
  "bookId": "uuid-string",
  "message": "Book added successfully",
  "book": {
    "bookId": "uuid-string",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "isbn": "9780743273565",
    "dateAdded": "2026-08-27T10:30:00Z"
  }
}
```

#### Search Books

```bash
GET /api/books/search?title=Gatsby
GET /api/books/search?author=Fitzgerald
GET /api/books/search?isbn=9780743273565

Response (200 OK):
{
  "success": true,
  "count": 1,
  "results": [
    {
      "bookId": "uuid-string",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "isbn": "9780743273565",
      "dateAdded": "2026-08-27T10:30:00Z"
    }
  ]
}
```

## Testing

### Run All Tests

```bash
npm test
```

This will run:
- Unit tests for all services (ValidationService, SearchEngine, BookService)
- Unit tests for ExcelPersistence (mocked fs/exceljs)
- Unit tests for BookController (mocked BookService) and Logger
- Integration tests for API endpoints
- Performance validation tests (<200ms p95 search, real Excel I/O)
- Generate coverage report

### Run Tests in Watch Mode

```bash
npm test:watch
```

### Test Coverage

The project aims for 85%+ code coverage across all components:
- ValidationService: 100%
- SearchEngine: 100%
- BookService: 85%+
- BookController: 80%+
- ExcelPersistence: 80%+ (with mocks)

## Code Quality

### Lint Code

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

### Build Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Project Structure

```
claude_ai_book_store/
├── src/
│   ├── app.ts                 # Express app setup
│   ├── controllers/
│   │   └── BookController.ts  # HTTP endpoint handlers
│   ├── services/
│   │   ├── ValidationService.ts
│   │   ├── SearchEngine.ts
│   │   └── BookService.ts
│   ├── persistence/
│   │   └── ExcelPersistence.ts
│   ├── models/
│   │   └── Book.ts            # TypeScript interfaces
│   ├── constants/
│   │   └── ErrorMessages.ts
│   └── logger/
│       └── Logger.ts
├── public/
│   ├── index.html             # Add Book form page
│   ├── search.html            # Search Books page
│   ├── app.js                 # Client-side JavaScript
│   └── styles.css             # Styling
├── tests/
│   ├── unit/
│   │   ├── services/          # Service unit tests
│   │   ├── persistence/       # ExcelPersistence unit tests (mocked fs/exceljs)
│   │   ├── controllers/       # BookController unit tests (mocked BookService)
│   │   └── logger/            # Logger unit tests
│   ├── integration/
│   │   └── api-endpoints.test.ts
│   └── performance/
│       └── performance.test.ts
├── data/
│   └── books.xlsx             # Book storage (created at runtime)
├── dist/                      # Compiled JavaScript (created by npm run build)
├── coverage/                  # Test coverage report (created by npm test)
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
└── README.md
```

## Data Storage

Books are stored in an Excel file at `./data/books.xlsx`. The file is created automatically on first write.

**Columns:**
- BookID: Unique identifier (UUID v4)
- Title: Book title (max 255 chars)
- Author: Author name (max 255 chars)
- ISBN: ISBN identifier
- DateAdded: ISO 8601 timestamp

**Append-Only Model:** Books are appended to the file; existing records are never modified or deleted.

## Validation Rules

**Title:**
- Required (cannot be empty)
- Cannot be only whitespace
- Maximum 255 characters

**Author:**
- Required (cannot be empty)
- Cannot be only whitespace
- Maximum 255 characters

**ISBN:**
- Required (cannot be empty)
- Cannot be only whitespace

## Performance

- Search response time: <200ms (p95) with typical datasets (100-1000 books)
- Add book operation: <500ms
- Linear search algorithm for small datasets

## Acceptance Criteria

All 12 acceptance criteria are implemented and tested:

- AC-001: ✓ Add Book — Happy Path
- AC-002: ✓ Add Book — Missing Required Field (Title)
- AC-003: ✓ Add Book — Missing Required Field (Author)
- AC-004: ✓ Add Book — Missing Required Field (ISBN)
- AC-005: ✓ Search Books by Title
- AC-006: ✓ Search Books by Author
- AC-007: ✓ Search Books by ISBN
- AC-008: ✓ Search — No Results Found
- AC-009: ✓ Add Book — Data Persists After Restart
- AC-010: ✓ Add Book — Unique Identifier Assigned
- AC-011: ✓ Search Results Display All Required Fields
- AC-012: ✓ Validation Error Messages Are User-Friendly

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, specify a different port:

```bash
PORT=3001 npm run dev
```

### Dependencies Installation Issues

Clear npm cache and reinstall:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Excel File Permissions

Ensure the `data/` directory is writable. On Windows, check folder permissions. On Linux/Mac, use:

```bash
chmod 755 data/
```

## Development

### Adding a New Feature

1. Create test files in `tests/unit/` or `tests/integration/`
2. Implement the feature to satisfy tests
3. Ensure tests pass: `npm test`
4. Ensure linting passes: `npm run lint`
5. Format code: `npm run format`

### Database Migration

In the future, to migrate from Excel to a database:
1. Create a new `IPersistence` implementation (e.g., `DatabasePersistence`)
2. Update `src/app.ts` to use new implementation
3. All other components remain unchanged

## Support

For issues or questions, refer to the acceptance criteria tests in `tests/integration/api-endpoints.test.ts` for implementation examples.

## License

MIT

## Document Information

- **Story:** SCRUM-9 — Library Book Management System
- **Status:** COMPLETE
- **Last Updated:** 2026-08-27
- **Version:** 1.0.0
