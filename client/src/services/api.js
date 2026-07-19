/**
 * HTTP NETWORK REQUESTS LAYER (api.js)
 * 
 * For Beginners:
 * This file sets up Axios, a popular JavaScript library used to send HTTP requests to the backend server.
 * Instead of writing raw `fetch(...)` calls with URL strings in every component, we consolidate all backend connections here.
 * 
 * Concepts Explained:
 * 1. Base URL & Environment Variables:
 *    We check `import.meta.env.VITE_API_URL`. This is a Vite-specific environment variable.
 *    - In Development: It points to our local backend server (e.g. `http://localhost:5000/api`).
 *    - In Production: It defaults to `/api` (meaning relative requests are sent to the same host that serves the frontend).
 * 2. Axios Instance creation:
 *    Consolidates baseline configurations (headers, base URLs) to prevent repeat declarations.
 * 3. Exported Bindings:
 *    We export simple, readable functions that map directly to Express routes.
 *    For example: Calling `getStrategies(123)` returns a Promise that executes an HTTP GET request to `/api/strategies?userId=123`.
 */

import axios from 'axios';

// Determine backend target URL (falls back to '/api' in production/build environments)
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create a configured axios client instance
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }, // We communicate using JSON formats
});

// Axios Request Interceptor: Automatically injects the JWT authentication token
// from local storage into the 'Authorization' header of every request.
api.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('algotrade_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (err) {
        console.error('[API Interceptor] Failed to parse cached session token:', err.message);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// USER API ENDPOINTS
// ==========================================

// Requests a 6-digit OTP to be generated and logged on the server.
export const requestOtp = (phoneNumber) => api.post('/user/request-otp', { phoneNumber });

// Verifies the 6-digit OTP code. If the user is new, includes 'name' to complete registration.
export const verifyOtp = (phoneNumber, otp, name) => api.post('/user/verify-otp', { phoneNumber, otp, name });

// Updates the authenticated user's profile details.
export const updateUser = (name) => api.put('/user/update', { name });

// Resets a user account. Deletes all their strategy entries, backtests, and user record.
export const resetAccount = () => api.post('/user/reset');

// Gets user statistics (e.g., number of strategies, average backtest returns).
export const getUserStats = (userId) => api.get(`/user/stats/${userId}`);

// ==========================================
// STRATEGY API ENDPOINTS (CRUD operations)
// ==========================================

// Retrieves strategies created by the authenticated user.
export const getStrategies = () => api.get('/strategies');

// Creates a new strategy code entry.
export const createStrategy = (data) => api.post('/strategies', data);

// Updates the code or title of an existing strategy by its ID.
export const updateStrategy = (id, data) => api.put(`/strategies/${id}`, data);

// Deletes a strategy by its ID.
export const deleteStrategy = (id) => api.delete(`/strategies/${id}`);

// Sends code to the parser to validate syntax rules.
export const validateStrategy = (code) => api.post('/strategies/validate', { code });

// ==========================================
// BACKTEST ENGINE ENDPOINTS
// ==========================================

// Triggers the time-series backtest engine to simulate strategy code.
export const runBacktest = (data) => api.post('/backtest/run', data);

// Fetches the computed details and equity log of a specific past backtest simulation.
export const getBacktest = (id) => api.get(`/backtest/${id}`);

// Retrieves all past backtests performed by the authenticated user.
export const getBacktests = () => api.get('/backtests');

// Clears/Deletes all backtest history logs linked to the user.
export const clearBacktests = () => api.post('/backtest/clear');

// ==========================================
// LEADERBOARD ENDPOINTS
// ==========================================

// Fetches list of strategies ranked by returns and risk profiles.
export const getLeaderboard = () => api.get('/leaderboard');

// ==========================================
// AI ASSISTANT ENDPOINTS (Gemini Integration)
// ==========================================

// Generates a fully coded strategy template based on user prompt.
export const aiGenerate = (prompt) => api.post('/ai/generate', { prompt });

// ==========================================
// MARKET REFERENCE DATA ENDPOINTS
// ==========================================

// Retrieves lists of active trading stocks, indices, and available dates.
export const getMarketSymbols = () => api.get('/market/symbols');

// Gets documentation listings of trading functions and DSL examples.
export const getReference = () => api.get('/reference');

export default api;
