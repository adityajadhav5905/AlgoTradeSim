import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../../shared/errors/AppError.js';

/**
 * Middleware that extracts and validates JWT Access Token in the Authorization header.
 * Maps decoded user claims (userId, name, role) directly to `req.user`.
 */
export function authenticateJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthenticationError('Authentication token required'));
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'supersecretjwtkey';

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // Contains { userId, name, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Authentication token expired'));
    }
    return next(new AuthenticationError('Invalid authentication token'));
  }
}
