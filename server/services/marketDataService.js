/**
 * Backward-compatible facade — delegates to MarketDataProvider abstraction.
 */
import {
  MarketDataProvider,
  getMarketDataProvider,
  YahooFinanceMarketDataProvider,
  DATA_DIR,
} from '../domain/market/MarketDataProvider.js';

const provider = getMarketDataProvider();

export { DATA_DIR };

export async function loadSymbolData(symbol) {
  return provider.loadSymbolData(symbol);
}

export function filterByDateRange(candles, startDate, endDate) {
  return provider.filterByDateRange(candles, startDate, endDate);
}

export function getAvailableSymbols() {
  return provider.getAvailableSymbols();
}

export function validateBacktestPeriod(startDate, endDate) {
  return provider.validateBacktestPeriod(startDate, endDate);
}

export { MarketDataProvider, YahooFinanceMarketDataProvider, getMarketDataProvider };
