import { StrategyInterpreter } from './StrategyInterpreter.js';
import { ExecutionContext } from './ExecutionContext.js';

/**
 * Domain Model: Strategy
 * Encapsulates parsed AST and delegates daily evaluation to StrategyInterpreter.
 */
export class Strategy {
  constructor(ast, code = '') {
    this.#ast = ast;
    this.#code = code;
  }

  #ast;
  #code;

  get ast() { return this.#ast; }
  get code() { return this.#code; }

  /** Evaluate strategy for one symbol on one trading day */
  evaluateDay(portfolio, symbol, candle, indicatorSnapshot) {
    const context = new ExecutionContext(candle, indicatorSnapshot, portfolio);
    const interpreter = new StrategyInterpreter(this.#ast, portfolio, symbol);
    return interpreter.evaluate(context.toVariableMap());
  }
}
