/**
 * USER ROUTER INTERACTION INTERFACES (userRoutes.js)
 * 
 * For Beginners:
 * Express Router acts as a mini-routing map for our user API.
 * 
 * HTTP Methods Used:
 * - POST: Used when creating a user (`/create`) or executing an action (`/reset`).
 * - PUT: Used when updating/modifying an existing record (`/update`).
 * - GET: Used when retrieving statistics data (`/stats/:userId`).
 * 
 * Concepts Explained:
 * 1. Router Params (`:userId`):
 *    Colons mark dynamic URL wildcards. If the frontend requests `/api/user/stats/123-abc`,
 *    Express matches this route and assigns `'123-abc'` to `req.params.userId`.
 */

import { Router } from 'express';
import { 
  createUser, 
  updateUser, 
  resetAccount, 
  getUserStats,
  register,
  login,
  logout,
  refresh,
  changePassword
} from '../controllers/userController.js';
import { authenticateJwt } from '../presentation/middleware/auth.js';
import { authorizeRoles, authLimiter } from '../presentation/middleware/security.js';

const router = Router();

// Public auth endpoints (throttled)
router.post('/create', authLimiter, createUser); // Onboarding session login (find-or-create)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);

// Protected endpoints
router.post('/logout', authenticateJwt, logout);
router.post('/change-password', authenticateJwt, changePassword);

// Modify user details
router.put('/update', authenticateJwt, updateUser);

// Sensitive Admin Action: Wipes user details and all related data records
router.post('/reset', authenticateJwt, authorizeRoles('Admin'), resetAccount);

// Fetch stats (requires valid login session)
router.get('/stats/:userId', authenticateJwt, getUserStats);

export default router;
