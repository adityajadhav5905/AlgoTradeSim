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
import { createUser, updateUser, resetAccount, getUserStats } from '../controllers/userController.js';

const router = Router();

// Route: POST /api/user/create -> Creates user profiles
router.post('/create', createUser);

// Route: PUT /api/user/update -> Updates username profiles
router.put('/update', updateUser);

// Route: POST /api/user/reset -> Wipes user details and all related data records
router.post('/reset', resetAccount);

// Route: GET /api/user/stats/:userId -> Returns total counts, returns metrics, and leaderboard positions
router.get('/stats/:userId', getUserStats);

export default router;
