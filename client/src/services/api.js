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

// Request interceptor to attach JWT access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('algotrade_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to unpack envelopes and handle token refresh / rotation
api.interceptors.response.use(
  (response) => {
    // 1. Automatically extract and persist tokens if returned in successful payload
    if (response.data && response.data.success === true && response.data.data) {
      const payload = response.data.data;
      if (payload.accessToken) {
        localStorage.setItem('algotrade_access_token', payload.accessToken);
      }
      if (payload.refreshToken) {
        localStorage.setItem('algotrade_refresh_token', payload.refreshToken);
      }
      response.data = payload;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 2. Intercept 401 Unauthorized errors to perform token rotation
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('algotrade_refresh_token');
      
      if (refreshToken) {
        try {
          // Request a new rotated access/refresh token pair
          const res = await axios.post(`${API_URL}/user/refresh`, { refreshToken });
          
          if (res.data && res.data.success && res.data.data) {
            const { accessToken, refreshToken: newRefreshToken } = res.data.data;
            localStorage.setItem('algotrade_access_token', accessToken);
            localStorage.setItem('algotrade_refresh_token', newRefreshToken);
            
            // Retry the original request with the new access token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.warn('Session expired or token rotation violation detected. Clearing credentials.');
          localStorage.removeItem('algotrade_user');
          localStorage.removeItem('algotrade_access_token');
          localStorage.removeItem('algotrade_refresh_token');
          // Redirect to onboarding page
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// USER API ENDPOINTS
// ==========================================

// Creates a new user record. Sends a POST request with the user's name in the body.
export const createUser = (name) => api.post('/user/create', { name });

// Log in with username and password.
export const loginUser = (name, password) => api.post('/user/login', { name, password });

// Register a new user with username, password, and optional role.
export const registerUser = (name, password, role) => api.post('/user/register', { name, password, role });

// Change user password.
export const changePassword = (oldPassword, newPassword) => api.post('/user/change-password', { oldPassword, newPassword });

// Log out user.
export const logoutUser = () => api.post('/user/logout');

// Updates an existing user's profile details.
export const updateUser = (userId, name) => api.put('/user/update', { userId, name });

// Resets a user account. Deletes all their strategy entries, backtest metrics, and user record.
export const resetAccount = (userId) => api.post('/user/reset', { userId });

// Gets user statistics (e.g., number of strategies created, average backtest results, active win rate).
export const getUserStats = (userId) => api.get(`/user/stats/${userId}`);

// ==========================================
// STRATEGY API ENDPOINTS (CRUD operations)
// ==========================================

// Retrieves a list of strategies created by a specific user. Passed as query parameters (?userId=xxx)
export const getStrategies = (userId) => api.get('/strategies', { params: { userId } });

// Creates a new strategy code entry.
export const createStrategy = (data) => api.post('/strategies', data);

// Updates the code or title of an existing strategy by its ID parameter.
export const updateStrategy = (id, data) => api.put(`/strategies/${id}`, data);

// Deletes a strategy from the database by its ID.
export const deleteStrategy = (id) => api.delete(`/strategies/${id}`);

// Sends code to the backend parser to validate syntax rules without saving.
export const validateStrategy = (code) => api.post('/strategies/validate', { code });

// ==========================================
// BACKTEST ENGINE ENDPOINTS
// ==========================================

// Triggers the time-series backtest engine to simulate strategy code on stock dates.
export const runBacktest = (data) => api.post('/backtest/run', data);

// Fetches the computed details and equity log of a specific past backtest simulation.
export const getBacktest = (id) => api.get(`/backtest/${id}`);

// Retrieves all past backtests performed by a specific user.
export const getBacktests = (userId) => api.get('/backtests', { params: { userId } });

// Clears/Deletes all backtest history logs linked to a user.
export const clearBacktests = (userId) => api.post('/backtest/clear', { userId });

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

// Asks AI to explain strategy logic line-by-line.
export const aiExplain = (code) => api.post('/ai/explain', { code });

// Asks AI to optimize/improve a strategy structure based on a target goal (e.g. increase wins).
export const aiImprove = (code, goal) => api.post('/ai/improve', { code, goal });

// Passes compiled parser syntax errors to AI to return a corrected code string.
export const aiFix = (code, errors) => api.post('/ai/fix', { code, errors });

// ==========================================
// MARKET REFERENCE DATA ENDPOINTS
// ==========================================

// Retrieves lists of active trading stocks, indices, and available dates.
export const getMarketSymbols = () => api.get('/market/symbols');

// Gets documentation listings of trading functions and DSL examples.
export const getReference = () => api.get('/reference');

export default api;
