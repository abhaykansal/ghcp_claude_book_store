/**
 * Integration Tests for the real Express application (src/app.ts)
 *
 * Verifies HIGH-1 fix: the global error-handling middleware must be
 * registered with the Express-required 4-parameter signature
 * (err, req, res, next) so it actually fires when an error propagates
 * to it, instead of silently being treated as normal middleware.
 *
 * This boots the ACTUAL app (not an extracted/mocked handler function)
 * and drives it with a real unhandled error: malformed JSON in a
 * request body. express.json() throws a SyntaxError which Express
 * routes directly to the next error-handling middleware, bypassing
 * all normal middleware (CORS, routes, the 404 handler). If the error
 * handler were still declared with only 3 params, Express would not
 * recognize it as an error handler and the request would hang/return
 * the default Express HTML error page instead of our JSON shape.
 */

import path from 'path';
import * as fs from 'fs';
import request from 'supertest';

// The app module reads PORT and EXCEL_FILE_PATH from process.env at
// import time (module-level side effects), so these must be set BEFORE
// the module is loaded. Using require() (after setting env vars) avoids
// ES module import hoisting, which would otherwise load src/app.ts
// before this file's env assignments run.
const TEST_EXCEL_PATH = path.join(__dirname, '../../test-data/app-error-handler-test.xlsx');

process.env.PORT = '0'; // let the OS assign an ephemeral free port
process.env.EXCEL_FILE_PATH = TEST_EXCEL_PATH;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const appModule = require('../../src/app');
const app = appModule.default;
const server = appModule.server;

describe('App (real Express instance) - global error handler', () => {
  afterAll((done) => {
    server.close(() => {
      if (fs.existsSync(TEST_EXCEL_PATH)) {
        fs.rmSync(TEST_EXCEL_PATH);
      }
      done();
    });
  });

  it('should invoke the error-handling middleware and return the documented JSON error shape when body parsing throws an unhandled error', async () => {
    const response = await request(app)
      .post('/api/books')
      .set('Content-Type', 'application/json')
      .send('{ this is not valid JSON ')
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      message: 'An unexpected error occurred',
    });
  });

  it('should still serve normal, non-error requests correctly (sanity check that the app booted)', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body.status).toBe('ok');
  });

  it('should return the standard 404 JSON shape for unknown routes (unaffected by the error handler fix)', async () => {
    const response = await request(app).get('/api/does-not-exist').expect(404);

    expect(response.body).toEqual({
      success: false,
      message: 'Endpoint not found',
    });
  });
});
