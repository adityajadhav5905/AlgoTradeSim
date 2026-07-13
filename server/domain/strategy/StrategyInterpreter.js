import { Order } from '../trading/Order.js';

/**
 * StrategyInterpreter — evaluates the DSL AST against an execution context.
 * (Strategy Pattern: interchangeable evaluation engine behind Strategy facade)
 */
export class StrategyInterpreter {
  constructor(ast, portfolio, symbol) {
    this.#ast = ast;
    this.#portfolio = portfolio;
    this.#symbol = symbol;
    this.#vars = {};
    this.#orders = [];
  }

  #ast;
  #portfolio;
  #symbol;
  #vars;
  #orders;

  evaluate(contextVariables) {
    this.#vars = { ...contextVariables };
    this.#orders = [];

    if (this.#ast?.body) {
      for (const stmt of this.#ast.body) {
        this.#executeStatement(stmt);
      }
    }

    return this.#orders.map(o => Order.fromPlain(o));
  }

  #executeStatement(node) {
    if (!node) return;
    switch (node.type) {
      case 'IfStatement':
        if (this.#evaluateExpression(node.condition)) {
          this.#executeBlock(node.consequent);
        } else if (node.alternate) {
          this.#executeBlock(node.alternate);
        }
        break;
      case 'ExpressionStatement':
        this.#evaluateExpression(node.expression);
        break;
      case 'BlockStatement':
        this.#executeBlock(node);
        break;
      default:
        break;
    }
  }

  #executeBlock(block) {
    if (!block?.body) return;
    for (const stmt of block.body) {
      this.#executeStatement(stmt);
    }
  }

  #evaluateExpression(node) {
    if (!node) return 0;

    switch (node.type) {
      case 'Literal':
        return node.value;
      case 'Identifier':
        return this.#vars[node.name] ?? 0;
      case 'UnaryExpression':
        return node.operator === '-'
          ? -this.#evaluateExpression(node.argument)
          : this.#evaluateExpression(node.argument);
      case 'BinaryExpression':
        return this.#applyBinary(node.operator, node.left, node.right);
      case 'CallExpression':
        return this.#executeCall(node);
      default:
        return 0;
    }
  }

  #applyBinary(op, left, right) {
    const l = this.#evaluateExpression(left);
    const r = this.#evaluateExpression(right);
    switch (op) {
      case '+': return l + r;
      case '-': return l - r;
      case '*': return l * r;
      case '/': return r !== 0 ? l / r : 0;
      case '>': return l > r;
      case '<': return l < r;
      case '>=': return l >= r;
      case '<=': return l <= r;
      case '==': return l === r;
      case '!=': return l !== r;
      case '&&': return l && r;
      case '||': return l || r;
      default: return 0;
    }
  }

  #executeCall(node) {
    const { callee, arguments: args } = node;
    const pos = this.#portfolio.getHolding(this.#symbol);

    switch (callee) {
      case 'buy': {
        const qty = Math.floor(this.#evaluateExpression(args[0]));
        if (qty > 0) {
          this.#orders.push({ action: 'BUY', symbol: this.#symbol, quantity: qty });
        }
        return qty;
      }
      case 'sell': {
        const qty = Math.floor(this.#evaluateExpression(args[0]));
        const sellQty = Math.min(qty, pos.shares);
        if (sellQty > 0) {
          this.#orders.push({ action: 'SELL', symbol: this.#symbol, quantity: sellQty });
        }
        return sellQty;
      }
      case 'buy_all':
        this.#orders.push({ action: 'BUY_ALL', symbol: this.#symbol });
        return 1;
      case 'sell_all':
        if (pos.shares > 0) {
          this.#orders.push({ action: 'SELL_ALL', symbol: this.#symbol });
        }
        return pos.shares;
      case 'shares_owned':
        return pos.shares;
      case 'current_cash':
        return this.#portfolio.cash;
      case 'portfolio_value':
        return this.#portfolio.totalValue;
      default:
        return 0;
    }
  }
}
