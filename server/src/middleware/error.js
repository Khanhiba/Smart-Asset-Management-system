import { ZodError } from 'zod';

export function notFound(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} was not found.` });
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(error);
  if (error instanceof ZodError) return res.status(422).json({ message: 'Please correct the highlighted fields.', errors: error.flatten().fieldErrors });
  if (error.name === 'ValidationError') return res.status(422).json({ message: error.message });
  if (error.code === 11000) return res.status(409).json({ message: 'A record with that unique value already exists.' });
  const status = error.statusCode || 500;
  res.status(status).json({ message: status >= 500 ? 'Something went wrong on our side.' : error.message, ...(error.details && { details: error.details }) });
}
