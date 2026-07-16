import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AppError, asyncRoute } from '../utils/appError.js';

export const authenticate = asyncRoute(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) throw new AppError('Authentication required.', 401);
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { throw new AppError('Your session is invalid or expired.', 401); }
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw new AppError('This account is unavailable.', 401);
  req.user = user;
  next();
});

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return next(new AppError('You do not have permission for this action.', 403));
    next();
  };
}
