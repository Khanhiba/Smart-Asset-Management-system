import { ZodError } from 'zod';

export function notFound(req, res) {
  res.status(404).json({ message: 'The requested API route was not found.', code: 'ROUTE_NOT_FOUND', requestId: req.requestId });
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (error instanceof ZodError) return res.status(422).json({ message: 'Please correct the highlighted fields.', code: 'VALIDATION_ERROR', errors: error.flatten().fieldErrors, requestId: req.requestId });
  if (error.name === 'ValidationError') return res.status(422).json({ message: error.message, code: 'VALIDATION_ERROR', requestId: req.requestId });
  if (error.name === 'CastError') return res.status(400).json({ message: 'The supplied record identifier is invalid.', code: 'INVALID_ID', requestId: req.requestId });
  if (error.code === 11000) return res.status(409).json({ message: 'A record with that unique value already exists.', code: 'DUPLICATE_RECORD', requestId: req.requestId });
  const status = error.statusCode || 500;
  if (status >= 500) console.error(JSON.stringify({ level: 'error', event: 'request_failed', requestId: req.requestId, method: req.method, path: req.originalUrl, message: error.message, stack: process.env.NODE_ENV === 'production' ? undefined : error.stack }));
  res.status(status).json({ message: status >= 500 ? 'Something went wrong on our side. Please try again shortly.' : error.message, code: error.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'), ...(error.details && { details: error.details }), requestId: req.requestId });
}
