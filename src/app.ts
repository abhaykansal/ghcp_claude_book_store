/**
 * Express Application Setup
 * Initializes and configures the Express server
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { BookController } from './controllers/BookController';
import { BookService } from './services/BookService';
import { ValidationEngine } from './services/ValidationEngine';
import { SearchEngine } from './services/SearchEngine';
import { ExcelPersistence } from './persistence/ExcelPersistence';
import { Logger } from './logger/Logger';

const app: Express = express();
const port = process.env.PORT || 3000;
const logger = new Logger('App', 'info');

/**
 * Middleware setup
 */
// Parse JSON request bodies
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));

// CORS headers (allow cross-origin requests from local browser)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

/**
 * Initialize services with dependency injection
 */
const validationEngine = new ValidationEngine();
const searchEngine = new SearchEngine();
const excelPersistence = new ExcelPersistence(process.env.EXCEL_FILE_PATH || './data/books.xlsx');
const bookService = new BookService(validationEngine, searchEngine, excelPersistence);

/**
 * Initialize controllers
 */
const bookController = new BookController(bookService);

/**
 * API Routes
 */
app.use('/api', bookController.getRouter());

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Serve index.html for root path
 */
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * Serve search.html
 */
app.get('/search', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/search.html'));
});

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

/**
 * Global error handler
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
  });
});

/**
 * Start server
 */
const server = app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});

export default app;
export { server };
