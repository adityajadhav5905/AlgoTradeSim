# 📈 AlgoTrade Simulator

<p align="center">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite Badge"/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Badge"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind Badge"/>
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express Badge"/>
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB Badge"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis Badge"/>
</p>

An advanced, interactive **Algorithmic Trading Backtesting Simulator** for the Indian stock and index markets. Designed with a sleek glassmorphic dark-mode UI, it allows traders and developers to write custom execution logic in a specialized C++-style Domain-Specific Language (DSL), compile it on the fly, and run historical simulations against daily candlestick price feeds.

---

## ✨ Primary Highlights & Features

* 🚀 **Custom C++ DSL Parser:** Tokenizes and parses custom indicators and entry/exit strategy code rules dynamically on the backend.
* ⚡ **High-Speed Backtesting Engine:** Evaluates daily time-series stock feeds (5-year range) to compile real-time returns, Sharpe ratios, maximum drawdowns, trade histories, and equity curves.
* 🧠 **AI Strategy Architect:** Native **Gemini 3.5 Flash** integration that generates production-ready DSL strategies from natural language prompts.
* 📱 **Carrier-Optimized OTP Login:** Secure verification via the TextBee Android Gateway with custom P2P filters to bypass network blocks.
* 📈 **Interactive Technical Charts:** High-fidelity financial charts rendering OHLCV candles, MACD, and RSI plots side-by-side using Lightweight Charts.
* 🏆 **Public Leaderboard:** Compare strategy return metrics and win-rates against global traders.
* 🗲 **Multi-Layer Cache Pipeline:** In-process L1 RAM cache and L2 Redis cluster invalidation to query price feeds with lightning speed.
* 🔌 **Zero-Config Database Fallback:** Automatic RAM proxy fallback allowing local development offline without MongoDB.

---

## 🛠️ Stack & Technologies

| Layer | Technology | Key Modules & Libraries |
| :--- | :--- | :--- |
| **Frontend** | React 18 (Vite SPA) | TailwindCSS, Lucide React, Monaco Editor, Lightweight Charts, React Router |
| **Backend** | Node.js (ESM) | Express, Axios, Mongoose, JWT, Dotenv, Concurrently |
| **Generative AI** | Google AI Studio | `@google/generative-ai` SDK (Gemini-3.5-Flash) |
| **Databases** | MongoDB & Redis | Mongoose ODM, Redis client (Sorted sets, Pub/Sub channels) |
| **SMS Gateway** | TextBee API | FCM Handshake protocol, SMS Gateway android runtime |

---

## ⚡ Quickstart Guide

Ensure you have **Node.js (v18+)** and **npm** installed.

### 1. Repository Setup & Install
Clone the repository and install all node packages concurrently:
```bash
git clone https://github.com/your-username/AlgoTradeSim.git
cd AlgoTradeSim
npm run install:all
```

### 2. Configure Environment Files
Create a [`.env`](file:///c:/Users/Aditya%20Jadhav/Desktop/Projects/AlgoTradeSim/server/.env) file under the `/server` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/algotrade
OPENAI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
TEXTBEE_API_KEY=your_textbee_api_key_here
TEXTBEE_DEVICE_ID=your_textbee_device_id_here
```

### 3. Generate Mock/Seed Tickers
Compile and seed daily market tickers needed for local caching tests:
```bash
npm run generate-data
```

### 4. Run Development Workspace
Start the concurrently managed development client and server environments in watch-mode:
```bash
npm start
```
* **Frontend:** [http://localhost:5173/](http://localhost:5173/)
* **Backend API:** [http://localhost:5000/](http://localhost:5000/)

---

## 🗺️ Architectural Context
For a comprehensive architectural diagram, data flow walkthroughs, and directory structures, please consult the complete [AlgoTradeSim System Document](file:///c:/Users/Aditya%20Jadhav/Desktop/Projects/AlgoTradeSim/AlgoTradeSim.md) located in the repository root.
