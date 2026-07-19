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

import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Strategy from '../models/Strategy.js';
import Backtest from '../models/Backtest.js';
import Leaderboard from '../models/Leaderboard.js';
import Otp from '../models/Otp.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_for_algotrade_simulator_123';

/**
 * requestOtp - Generates a 6-digit OTP code and logs it to the backend console.
 * Route: POST /api/user/request-otp
 */
export const requestOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(phoneNumber.trim())) {
      return res.status(400).json({ error: 'Please enter a valid phone number (digits only, optional country code).' });
    }

    const cleanPhone = phoneNumber.trim();

    // Generate a secure 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store/Upsert the OTP in the database (or memory fallback). Set expires/TTL.
    await Otp.findOneAndUpdate(
      { phoneNumber: cleanPhone },
      { otp: otpCode, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // CRITICAL: Log the OTP code to the server terminal console for developer/tester access.
    // We do NOT return the OTP in the response body to prevent inspection hacks in the browser network tab.
    console.log('\n==================================================');
    console.log(`[OTP ALERT] Phone Number: ${cleanPhone}`);
    console.log(`[OTP ALERT] Generated OTP: ${otpCode}`);
    console.log('==================================================\n');

    res.json({ message: 'OTP sent successfully. Please check the backend server console for the code.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * verifyOtp - Validates the submitted OTP. Registers new accounts or logs in existing accounts.
 * Route: POST /api/user/verify-otp
 */
export const verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp, name } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required.' });
    }

    const cleanPhone = phoneNumber.trim();
    const cleanOtp = otp.trim();

    // 1. Retrieve the stored OTP entry
    const otpRecord = await Otp.findOne({ phoneNumber: cleanPhone });
    if (!otpRecord) {
      return res.status(400).json({ error: 'OTP has expired or was never requested. Please click Resend OTP.' });
    }

    // 2. Validate matching OTP
    if (otpRecord.otp !== cleanOtp) {
      return res.status(400).json({ error: 'Incorrect OTP code. Please check and try again.' });
    }

    // 3. Find if a User exists with this phone number
    const user = await User.findOne({ phoneNumber: cleanPhone });

    if (!user) {
      // User doesn't exist yet: Registration step.
      // If the client did not send a 'name', request the name to complete registration.
      if (!name || !name.trim()) {
        return res.json({
          isNewUser: true,
          message: 'OTP verified. Please provide a name to complete your account registration.'
        });
      }

      // If 'name' is provided, create the user profile.
      const userId = uuidv4();
      const newUser = await User.create({
        userId,
        name: name.trim(),
        phoneNumber: cleanPhone
      });

      // Generate JWT session token
      const token = jwt.sign(
        { userId, phoneNumber: cleanPhone, name: name.trim() },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Clean up the used OTP record
      await Otp.deleteOne({ phoneNumber: cleanPhone });

      return res.status(201).json({
        token,
        user: {
          userId: newUser.userId,
          name: newUser.name,
          phoneNumber: newUser.phoneNumber,
          createdAt: newUser.createdAt
        },
        isNewUser: true
      });
    }

    // User exists: Normal login.
    const token = jwt.sign(
      { userId: user.userId, phoneNumber: user.phoneNumber, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Clean up the used OTP record
    await Otp.deleteOne({ phoneNumber: cleanPhone });

    res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt
      },
      isNewUser: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * updateUser - Modifies the username profile.
 * Route: PUT /api/user/update
 */
export const updateUser = async (req, res) => {
  try {
    const { name } = req.body;
    const { userId } = req.user; // Securely read the user ID from the signed JWT payload.
    
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const cleanName = name.trim();

    // Find the user by authenticated ID and update their name.
    const user = await User.findOneAndUpdate({ userId }, { name: cleanName }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // CASCADING UPDATE:
    // Update the username across all strategies, backtests, and leaderboard records linked to this userId.
    await Strategy.updateMany({ userId }, { userName: cleanName });
    await Backtest.updateMany({ userId }, { userName: cleanName });
    await Leaderboard.updateMany({ userId }, { userName: cleanName });

    res.json({
      userId: user.userId,
      name: user.name,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * resetAccount - Completely deletes a user and all related strategical records.
 * Route: POST /api/user/reset
 */
export const resetAccount = async (req, res) => {
  try {
    const { userId } = req.user; // Securely read user identity from JWT payload.

    // Delete all linked entries in parallel databases
    await Strategy.deleteMany({ userId });
    await Backtest.deleteMany({ userId });
    await Leaderboard.deleteMany({ userId });
    await User.deleteOne({ userId });

    res.json({ message: 'Account and all trading history wiped successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * getUserStats - Gathers aggregated user portfolio stats.
 * Route: GET /api/user/stats/:userId
 */
export const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params; // Extract target user stats ID from URL parameter.

    // SECURITY CHECK: Ensure a user cannot query another user's private backtest stats.
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You cannot retrieve other users\' statistics.' });
    }

    // 1. Count the total number of strategies created by this user
    const strategies = await Strategy.countDocuments({ userId });
    
    // 2. Fetch all backtests completed, sorted from newest to oldest
    const backtests = await Backtest.find({ userId }).sort({ createdAt: -1 });
    
    // 3. Map returns array to calculate max/average return values
    const returns = backtests.map(b => b.returnPercent);
    const bestReturn = returns.length ? Math.max(...returns) : 0;
    
    // Reduce sums all items. We divide by count to get the average.
    const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;

    // 4. Find the user's best ranking entry on the leaderboard (lowest rank number means highest position)
    const rankEntry = await Leaderboard.findOne({ userId }).sort({ rank: 1 });
    const rank = rankEntry?.rank || null;

    // Return compiled statistics bundle
    res.json({
      totalStrategies: strategies,
      totalBacktests: backtests.length,
      bestReturn,
      avgReturn: +avgReturn.toFixed(2), // Convert back to float with two decimal points
      rank,
      recentBacktests: backtests.slice(0, 5), // Only return the 5 most recent runs for preview
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
