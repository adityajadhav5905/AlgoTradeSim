import fs from 'fs';
import { runBacktest } from '../domain/backtest/BacktestEngine.js';

async function main() {
  try {
    const inputPath = process.argv[2];
    if (!inputPath) {
      throw new Error('Input parameter file path is required');
    }
    const params = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const result = await runBacktest(params);
    console.log(JSON.stringify({ success: true, result }));
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  }
}

main();
