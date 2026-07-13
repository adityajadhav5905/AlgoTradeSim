import rateLimit from 'express-rate-limit';
import { AuthenticationError } from '../../shared/errors/AppError.js';

// NoSQL Injection sanitizer helper function
function sanitizeNoSql(obj) {
  if (!obj || typeof obj !== 'object') return;
  
  for (const key in obj) {
    if (key.startsWith('$')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeNoSql(obj[key]);
    }
  }
}

/**
 * Middleware that scans body, query, and params for keys starting with '$'
 * to prevent NoSQL query operator injection attacks.
 */
export function sanitizeNoSqlInjection(req, res, next) {
  if (req.body) sanitizeNoSql(req.body);
  if (req.query) sanitizeNoSql(req.query);
  if (req.params) sanitizeNoSql(req.params);
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware.
 * Compares authenticated user's role against route permissions.
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(new AuthenticationError('Access denied: insufficient permissions'));
    }
    next();
  };
}

/**
 * Rate limiting middleware for standard API endpoints.
 * Caps requests to 150 per 15 minutes per IP address.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit each IP to 150 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Throttled limiter specifically for sensitive authentication endpoints (login, register).
 * Caps attempts to 10 per 5 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many login or registration attempts, please try again after 5 minutes',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
