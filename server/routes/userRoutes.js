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
import { requestOtp, verifyOtp, updateUser, resetAccount, getUserStats } from '../controllers/userController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Route: POST /api/user/request-otp -> Generates and logs OTP code
router.post('/request-otp', requestOtp);

// Route: POST /api/user/verify-otp -> Verifies OTP and returns user + JWT token
router.post('/verify-otp', verifyOtp);

// Route: PUT /api/user/update -> Updates username profiles (Authenticated)
router.put('/update', auth, updateUser);

// Route: POST /api/user/reset -> Wipes user profile and all strategies/backtests (Authenticated)
router.post('/reset', auth, resetAccount);

// Route: GET /api/user/stats/:userId -> Returns user simulation statistics (Authenticated)
router.get('/stats/:userId', auth, getUserStats);

export default router;
