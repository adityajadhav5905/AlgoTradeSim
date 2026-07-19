/**
 * JWT AUTHORIZATION MIDDLEWARE (auth.js)
 * 
 * For Beginners:
 * Middleware functions are functions that have access to the request object (req),
 * the response object (res), and the next middleware function in the application’s
 * request-response cycle (usually denoted by a variable named next).
 * 
 * What does this auth middleware do?
 * 1. Checks if the incoming request has an 'Authorization' header containing a Bearer token.
 * 2. Decodes and verifies the token using the signed JWT secret.
 * 3. Extracts user details (userId, name, phoneNumber) and attaches them to `req.user`.
 * 4. Calls `next()` to proceed to the actual API controller.
 * 5. If verification fails (invalid/expired token or missing header), it blocks access and returns a 401 status.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_for_algotrade_simulator_123';

export const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. Authorization token missing or invalid.' });
    }

    // Extract raw token string from "Bearer <token>"
    const token = authHeader.split(' ')[1];
    
    // Verify signature of the cryptographically signed JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach the user context bundle to the request object
    req.user = decoded;
    
    // Call next() to hand execution over to the next route controller handler
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Access denied. Invalid or expired session token.', details: err.message });
  }
};
