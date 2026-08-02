/**
 * BACKEND EXPRESS APPLICATION ENTRY POINT (index.js)
 * 
 * For Beginners:
 * This file is the primary starting point for our backend server.
 * It is built using Node.js and Express, which is the standard web framework for building REST APIs in JavaScript.
 * 
 * Flow of events when starting the server:
 * 1. Load Configurations: Reads the `.env` settings using the dotenv library (e.g. database URLs, server ports).
 * 2. Setup Middleware:
 *    - CORS (Cross-Origin Resource Sharing): Allows our frontend web page (running on port 5173)
 *      to securely query our backend API (running on port 5000).
 *    - express.json(): Automatically reads JSON request payloads sent by the frontend, parsing them
 *      into standard JavaScript objects (`req.body`).
 * 3. Mount Routes: Hooks up specific URL pathways to custom controller routers (e.g., requests to `/api/strategies`
 *    are forwarded to `strategyRoutes`).
 * 4. DB Fallback Connection: Attempts to establish a connection with MongoDB. If MongoDB is not installed
 *    or running locally, it prints a warning message and falls back to running the site in-memory (using `dbProxy.js`).
 * 5. Start Listening: Binds the Express app to the designated network port (default 5000), starting the server.
 */

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import strategyRoutes from './routes/strategyRoutes.js';
import backtestRoutes from './routes/backtestRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import {
  getAvailableSymbols,
  invalidateCache,
  initRedis
} from './services/marketDataService.js';
import { STOCKS, INDEXES, EXAMPLE_STRATEGIES, ALL_VARS, TRADING_FUNCTIONS } from './utils/constants.js';

// Load variables from .env file into process.env
dotenv.config();

const app = express();
// Port is read from environment config, default to 5000 if empty
const PORT = process.env.PORT || 5000;

// Setup CORS: Allows requests from the configured CLIENT_URL and any local development ports (e.g. 5173, 5174, etc.)
const allowedOrigins = [process.env.CLIENT_URL].filter(Boolean);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
    if (isLocalhost || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Setup Request Parser: Decodes JSON bodies. Limit increased to 10mb to handle long strategy code transmissions.
app.use(express.json({ limit: '10mb' }));

// ==========================================
// REST API ROUTING REGISTRY
// ==========================================
app.use('/api/user', userRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/backtest', backtestRoutes);
app.use('/api/backtests', backtestRoutes); // Backup route alignment
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/ai', aiRoutes);

// Endpoint: Returns lists of traded stock symbols and indices
app.get('/api/market/symbols', (req, res) => {
  res.json({ stocks: STOCKS, indexes: INDEXES, available: getAvailableSymbols() });
});

// Endpoint: Invalidates cached stock data across local memory, Redis, and other cluster instances
app.post('/api/market/cache/invalidate', async (req, res) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }
    await invalidateCache(symbol);
    res.json({ status: 'success', message: `Cache successfully invalidated for: ${symbol.toUpperCase()}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Returns DSL documentation references and templates shown in the Editor Reference page
app.get('/api/reference', (req, res) => {
  res.json({ variables: ALL_VARS, functions: TRADING_FUNCTIONS, examples: EXAMPLE_STRATEGIES });
});

// Health check endpoint (used by cloud services to check if the server is responsive)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Global error handling middleware.
// If any API controller encounters an unhandled exception, it forwards it to `next(err)`.
// This catch-all middleware intercepts it, logs the error stack trace, and returns a clean 500 status.
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * start
 * Prepares mock files, connects to database, and boots the port listener.
 */
async function start() {
  // Load MongoDB URI connection string
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/algotrade';
  try {
    // Attempt Mongoose database connection
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    // MongoDB failed. The project automatically reverts to saving variables to RAM arrays (offline proxy mode).
    console.warn('MongoDB connection failed — running without database:', err.message);
  }
  await initRedis();

  // Open the network socket and listen for requests
  app.listen(PORT, () => {
    console.log(`AlgoTrade server running on port ${PORT}`);
  });
}

start();
