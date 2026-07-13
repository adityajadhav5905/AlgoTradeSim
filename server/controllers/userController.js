/**
 * USER SERVICE CONTROLLERS (userController.js)
 * 
 * For Beginners:
 * Controllers contain the actual business logic of our Express application.
 * When a router matches a URL, it calls one of these exported functions.
 * 
 * Each controller takes two key arguments:
 * 1. `req` (Request): Holds information sent *from* the frontend (like headers, path params, request body JSONs).
 * 2. `res` (Response): Contains functions to send details *back* to the frontend (like `.status()` and `.json()`).
 * 
 * Concepts Covered:
 * - Async/Await: Database queries are slow and asynchronous. We use `await` to halt function execution
 *   until MongoDB returns a result, wrapping the logic in `try/catch` to prevent server crashes on errors.
 * - HTTP Status Codes:
 *   - 200: Standard successful request.
 *   - 201: Successful resource creation.
 *   - 400: Bad Request (e.g., missing required fields).
 *   - 404: Resource Not Found.
 *   - 500: Internal Server Error (something went wrong on the backend).
 * - Cascading updates: When a user changes their name, we must update that name across strategies, backtests, and leaderboard.
 */

import { userApplicationService } from '../application/services/UserApplicationService.js';
import { securityApplicationService } from '../application/services/SecurityApplicationService.js';
import { UserDTO } from '../presentation/dtos/UserDTO.js';
import { ValidationError } from '../shared/errors/AppError.js';

/**
 * createUser - Onboarding session login (quick find-or-create).
 * Route: POST /api/user/create
 */
export const createUser = async (req, res, next) => {
  try {
    const { name } = req.body;
    const { user, accessToken, refreshToken } = await securityApplicationService.quickRegister(
      name,
      req.ip,
      req.headers['user-agent']
    );
    res.status(201).json({
      success: true,
      data: {
        ...UserDTO.toResponse(user),
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * register - Standard registration with password policy checks.
 * Route: POST /api/user/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, password, role } = req.body;
    const { user, accessToken, refreshToken } = await securityApplicationService.register(
      { name, password, role },
      req.ip,
      req.headers['user-agent']
    );
    res.status(201).json({
      success: true,
      data: {
        ...UserDTO.toResponse(user),
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * login - Standard credential verification with brute force protection.
 * Route: POST /api/user/login
 */
export const login = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const { user, accessToken, refreshToken } = await securityApplicationService.login(
      { name, password },
      req.ip,
      req.headers['user-agent']
    );
    res.json({
      success: true,
      data: {
        ...UserDTO.toResponse(user),
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * logout - Invalidates user session refresh tokens.
 * Route: POST /api/user/logout
 */
export const logout = async (req, res, next) => {
  try {
    const result = await securityApplicationService.logout(
      req.user.userId,
      req.ip,
      req.headers['user-agent']
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * refresh - Performs token rotation and reuse detection.
 * Route: POST /api/user/refresh
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await securityApplicationService.refresh(
      refreshToken,
      req.ip,
      req.headers['user-agent']
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * changePassword - Updates password credential securely.
 * Route: POST /api/user/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await securityApplicationService.changePassword(
      req.user.userId,
      { oldPassword, newPassword },
      req.ip,
      req.headers['user-agent']
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * updateUser - Modifies the username profile.
 * Route: PUT /api/user/update
 */
export const updateUser = async (req, res, next) => {
  try {
    const { userId, name } = req.body;
    
    // Protect profile edits
    if (req.user.userId !== userId && req.user.role !== 'Admin') {
      throw new ValidationError('Access denied: cannot modify other user profiles');
    }
    
    const user = await userApplicationService.updateUserProfile(userId, name, req.ip, req.headers['user-agent']);
    res.json({ success: true, data: UserDTO.toResponse(user) });
  } catch (err) {
    next(err);
  }
};

/**
 * resetAccount - Completely deletes a user and all related strategical records.
 * Route: POST /api/user/reset
 */
export const resetAccount = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const result = await userApplicationService.resetAccount(userId, req.ip, req.headers['user-agent']);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * getUserStats - Gathers aggregated user portfolio stats.
 * Route: GET /api/user/stats/:userId
 */
export const getUserStats = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const stats = await userApplicationService.getUserStats(userId);
    res.json({ success: true, data: UserDTO.toStatsResponse(stats) });
  } catch (err) {
    next(err);
  }
};
