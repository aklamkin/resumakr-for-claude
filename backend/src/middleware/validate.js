import { ZodError } from 'zod';
import { log } from '../utils/logger.js';

/**
 * Validation middleware factory
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Where to get data from: 'body', 'query', or 'params'
 * @returns {Function} Express middleware function
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      let data;
      switch (source) {
        case 'body':
          data = req.body;
          break;
        case 'query':
          data = req.query;
          break;
        case 'params':
          data = req.params;
          break;
        default:
          data = req.body;
      }

      // Parse and validate data
      const validated = schema.parse(data);

      // Replace original data with validated/transformed data
      switch (source) {
        case 'body':
          req.body = validated;
          break;
        case 'query':
          req.query = validated;
          break;
        case 'params':
          req.params = validated;
          break;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code
        }));

        log.warn('Validation failed', {
          path: req.path,
          method: req.method,
          source,
          errors: details,
          requestId: req.requestId
        });

        return res.status(400).json({
          error: 'Validation failed',
          details
        });
      }

      // If it's not a Zod error, pass to error handler
      next(error);
    }
  };
}

/**
 * Validate multiple sources at once
 * @param {Object} schemas - Object with keys 'body', 'query', 'params' and their schemas
 * @returns {Function} Express middleware function
 */
export function validateMultiple(schemas) {
  return (req, res, next) => {
    const allErrors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      try {
        let data;
        switch (source) {
          case 'body':
            data = req.body;
            break;
          case 'query':
            data = req.query;
            break;
          case 'params':
            data = req.params;
            break;
          default:
            continue;
        }

        const validated = schema.parse(data);

        switch (source) {
          case 'body':
            req.body = validated;
            break;
          case 'query':
            req.query = validated;
            break;
          case 'params':
            req.params = validated;
            break;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          allErrors.push(...error.errors.map(e => ({
            field: `${source}.${e.path.join('.')}`,
            message: e.message,
            code: e.code
          })));
        } else {
          return next(error);
        }
      }
    }

    if (allErrors.length > 0) {
      log.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors: allErrors,
        requestId: req.requestId
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: allErrors
      });
    }

    next();
  };
}

export default validate;
