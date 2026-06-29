# AlgoTrade Simulator

A full-stack algorithmic trading simulator for creating, backtesting, and comparing trading strategies on historical Indian market data.

## Features

- **Strategy Editor** — Write C++-style DSL strategies with Monaco Editor, syntax validation, and autocomplete
- **AI Strategy Architect** — Generate, explain, improve, and fix strategies using OpenAI
- **Multi-Stock Backtesting** — Test on 1–5 stocks with shared capital (₹1,00,000 default)
- **Performance Analytics** — Sharpe, Sortino, CAGR, drawdown, win rate, and more
- **Visualizations** — OHLC charts, equity curve, drawdown, monthly returns heatmap, trade history
- **Global Leaderboard** — Compete ranked by return % and Sharpe ratio
- **No Auth Required** — Enter your name and start immediately

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, Tailwind CSS, Monaco Editor, TradingView Lightweight Charts, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AI | OpenAI API |

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
# server/.env
cp server/.env.example server/.env

# client/.env
cp client/.env.example client/.env
```

Edit `server/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/algotrade
OPENAI_API_KEY=your_key_here
CLIENT_URL=http://localhost:5173
```

### 3. Generate market data

```bash
cd server && npm run generate-data
```

### 4. Start the app

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
AlgoTrade/
├── client/          # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       ├── services/
│       └── utils/
├── server/          # Express backend
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── engine/      # Backtest & strategy execution
│   ├── parser/      # DSL lexer & parser
│   └── services/
└── data/            # CSV market data files
```

## Strategy DSL

```cpp
if(sma50 > sma200)
{
    buy_all();
}

if(rsi > 70)
{
    sell_all();
}
```

**Variables:** `open`, `high`, `low`, `close`, `volume`, `sma20`, `sma50`, `sma100`, `sma200`, `ema20`, `ema50`, `ema100`, `rsi`, `macd`, `atr`, `high_52w`, `low_52w`, `high_1m`, `low_1m`, `high_1w`, `low_1w`, `cash`, `portfolio_value`

**Functions:** `buy(qty)`, `sell(qty)`, `buy_all()`, `sell_all()`, `shares_owned()`, `current_cash()`, `portfolio_value()`

## Backtest Assumptions

- Commission: 0.10%
- Slippage: 0.05%
- Order execution: Next day open
- Minimum period: 2 years
- Default capital: ₹1,00,000

## Deployment

- **Frontend:** Vercel — set `VITE_API_URL` to your backend URL
- **Backend:** Render / Railway — set `MONGODB_URI`, `OPENAI_API_KEY`, `CLIENT_URL`
- **Database:** MongoDB Atlas

## License

MIT
