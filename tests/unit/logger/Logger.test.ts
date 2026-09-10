/**
 * Unit Tests for Logger
 * Verifies log level filtering and message formatting
 */

import { Logger } from '../../../src/logger/Logger';

describe('Logger', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('log level filtering', () => {
    it('should log debug messages when log level is debug', () => {
      const logger = new Logger('TestComponent', 'debug');
      logger.debug('debug message', { key: 'value' });

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain('[DEBUG]');
      expect(logSpy.mock.calls[0][0]).toContain('debug message');
    });

    it('should not log debug messages when log level is info', () => {
      const logger = new Logger('TestComponent', 'info');
      logger.debug('debug message');

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when log level is info', () => {
      const logger = new Logger('TestComponent', 'info');
      logger.info('info message');

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain('[INFO]');
    });

    it('should not log info messages when log level is warn', () => {
      const logger = new Logger('TestComponent', 'warn');
      logger.info('info message');

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log warn messages using console.warn', () => {
      const logger = new Logger('TestComponent', 'info');
      logger.warn('warn message');

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('[WARN]');
    });

    it('should not log warn messages when log level is error', () => {
      const logger = new Logger('TestComponent', 'error');
      logger.warn('warn message');

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should always log error messages regardless of configured level', () => {
      const logger = new Logger('TestComponent', 'error');
      logger.error('error message');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('[ERROR]');
    });
  });

  describe('error formatting', () => {
    it('should include error message and stack trace when passed an Error instance', () => {
      const logger = new Logger('TestComponent', 'info');
      const err = new Error('Something failed');
      logger.error('operation failed', err);

      const loggedOutput = errorSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('Something failed');
      expect(loggedOutput).toContain(err.stack ?? '');
    });

    it('should JSON-serialize non-Error error values', () => {
      const logger = new Logger('TestComponent', 'info');
      logger.error('operation failed', { code: 'E123', detail: 'bad input' });

      const loggedOutput = errorSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('E123');
      expect(loggedOutput).toContain('bad input');
    });

    it('should handle error logging with no error argument provided', () => {
      const logger = new Logger('TestComponent', 'info');
      logger.error('operation failed');

      const loggedOutput = errorSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('operation failed');
    });
  });

  describe('message formatting', () => {
    it('should include component name and timestamp in formatted message', () => {
      const logger = new Logger('MyComponent', 'info');
      logger.info('hello');

      const loggedOutput = logSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('[MyComponent]');
      expect(loggedOutput).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    });

    it('should append serialized data when provided', () => {
      const logger = new Logger('MyComponent', 'info');
      logger.info('hello', { count: 5 });

      const loggedOutput = logSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('"count":5');
    });

    it('should default to info log level when not specified', () => {
      const logger = new Logger('MyComponent');
      logger.debug('should not appear');
      logger.info('should appear');

      expect(logSpy).toHaveBeenCalledTimes(1);
    });
  });
});
