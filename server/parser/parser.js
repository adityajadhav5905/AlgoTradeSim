import { TOKEN_TYPES, tokenize } from './lexer.js';
import { ALL_VARS, TRADING_FUNCTIONS } from '../utils/constants.js';

/**
 * STRATEGY PARSER
 * 
 * What is a Parser?
 * A parser takes the flat list of tokens from the Lexer and matches them against grammar rules
 * to build a tree structure called an Abstract Syntax Tree (AST).
 * 
 * The AST represents the nested logic of the code.
 * E.g. "if (rsi < 30) { buy_all(); }" becomes:
 * {
 *   type: "IfStatement",
 *   condition: { type: "BinaryExpression", operator: "<", left: "rsi", right: "30" },
 *   consequent: { type: "BlockStatement", body: [ { type: "CallExpression", callee: "buy_all" } ] }
 * }
 * 
 * We use a "Recursive Descent" parser structure. It parses expressions by precedence level,
 * from the lowest precedence (Logical OR) up to the highest (Primary values like literals and parameters).
 */
export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0; // Pointer index in the token array
    this.errors = [];
  }

  // Look at the current token without moving forward
  peek() { return this.tokens[this.pos]; }

  // Consume the current token and advance the pointer
  advance() { return this.tokens[this.pos++]; }

  /**
   * Asserts that the current token matches the expected type (and optional value).
   * If correct, advances. If not, throws a syntax error.
   */
  expect(type, value) {
    const tok = this.peek();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new Error(`Expected ${type}${value ? ` '${value}'` : ''}, got ${tok.type} '${tok.value}'`);
    }
    return this.advance();
  }

  /**
   * Entry point: Parses the entire token stream into a Program node.
   */
  parse() {
    const statements = [];
    while (this.peek().type !== TOKEN_TYPES.EOF) {
      statements.push(this.parseStatement());
    }
    return { type: 'Program', body: statements };
  }

  /**
   * Decides which statement parser to route to (e.g. conditional or expression)
   */
  parseStatement() {
    if (this.peek().type === TOKEN_TYPES.KEYWORD && this.peek().value === 'if') {
      return this.parseIfStatement();
    }
    return this.parseExpressionStatement();
  }

  /**
   * Parses: if(condition) { body } else { body }
   */
  parseIfStatement() {
    this.expect(TOKEN_TYPES.KEYWORD, 'if');
    this.expect(TOKEN_TYPES.LPAREN);
    const condition = this.parseExpression();
    this.expect(TOKEN_TYPES.RPAREN);
    const consequent = this.parseBlock();
    let alternate = null;

    // Check for optional "else" branch
    if (this.peek().type === TOKEN_TYPES.KEYWORD && this.peek().value === 'else') {
      this.advance();
      alternate = this.parseBlock();
    }
    return { type: 'IfStatement', condition, consequent, alternate };
  }

  /**
   * Parses block statements enclosed in curly brackets: { stmt1; stmt2; }
   */
  parseBlock() {
    this.expect(TOKEN_TYPES.LBRACE);
    const body = [];
    while (this.peek().type !== TOKEN_TYPES.RBRACE && this.peek().type !== TOKEN_TYPES.EOF) {
      body.push(this.parseStatement());
    }
    this.expect(TOKEN_TYPES.RBRACE);
    return { type: 'BlockStatement', body };
  }

  /**
   * Parses simple statements like function calls ending with semicolons: buy_all();
   */
  parseExpressionStatement() {
    const expr = this.parseExpression();
    if (this.peek().type === TOKEN_TYPES.SEMICOLON) {
      this.advance();
    }
    return { type: 'ExpressionStatement', expression: expr };
  }

  /**
   * EXPRESSION PARSING & PRECEDENCE (RECURSIVE DESCENT)
   * 
   * For Beginners:
   * How do we make sure math order of operations (like multiplying before adding) is parsed correctly?
   * We use a "Recursive Descent" parser structure. It parses expressions by precedence level,
   * starting from the lowest precedence (Logical OR) down to the highest (literals, variables).
   * 
   * Visual Hierarchy:
   * 1. parseExpression() -> parseLogicalOr()  [Lowest: ||]
   * 2. parseLogicalOr()  -> parseLogicalAnd() [&&]
   * 3. parseLogicalAnd() -> parseComparison() [> < >= <= == !=]
   * 4. parseComparison() -> parseAdditive()   [+ -]
   * 5. parseAdditive()   -> parseMultiplicative() [* /]
   * 6. parseMultiplicative() -> parseUnary()  [-x]
   * 7. parseUnary()      -> parsePrimary()    [Highest: Numbers, variables, function calls, (brackets)]
   * 
   * Because higher precedence methods are called deeper inside lower precedence methods,
   * they get grouped first in the resulting AST tree.
   */

  // Precedence level 1: Main entry for expressions
  parseExpression() {
    return this.parseLogicalOr();
  }

  // Precedence level 2: Logical OR ('||')
  parseLogicalOr() {
    let left = this.parseLogicalAnd();
    while (this.peek().type === TOKEN_TYPES.OPERATOR && this.peek().value === '||') {
      const op = this.advance().value;
      const right = this.parseLogicalAnd();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  // Precedence level 3: Logical AND ('&&')
  parseLogicalAnd() {
    let left = this.parseComparison();
    while (this.peek().type === TOKEN_TYPES.OPERATOR && this.peek().value === '&&') {
      const op = this.advance().value;
      const right = this.parseComparison();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  // Precedence level 4: Comparison operators ('>', '<', '>=', '<=', '==', '!=')
  parseComparison() {
    let left = this.parseAdditive();
    const compOps = ['>', '<', '>=', '<=', '==', '!='];
    while (this.peek().type === TOKEN_TYPES.OPERATOR && compOps.includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  // Precedence level 5: Addition and Subtraction ('+', '-')
  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.peek().type === TOKEN_TYPES.OPERATOR && ['+', '-'].includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  // Precedence level 6: Multiplication and Division ('*', '/')
  parseMultiplicative() {
    let left = this.parseUnary();
    while (this.peek().type === TOKEN_TYPES.OPERATOR && ['*', '/'].includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  // Precedence level 7: Unary negative operator ('-x')
  parseUnary() {
    if (this.peek().type === TOKEN_TYPES.OPERATOR && this.peek().value === '-') {
      const op = this.advance().value;
      return { type: 'UnaryExpression', operator: op, argument: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  // Precedence level 8: Literals, identifiers, function calls, and parenthesis groups
  parsePrimary() {
    const tok = this.peek();

    // Match numbers
    if (tok.type === TOKEN_TYPES.NUMBER) {
      this.advance();
      return { type: 'Literal', value: tok.value };
    }

    // Match identifiers (variables or function names)
    if (tok.type === TOKEN_TYPES.IDENTIFIER) {
      const name = this.advance().value;

      // If followed by '(', it is a function call: buy(10), shares_owned()
      if (this.peek().type === TOKEN_TYPES.LPAREN) {
        this.advance();
        const args = [];
        if (this.peek().type !== TOKEN_TYPES.RPAREN) {
          args.push(this.parseExpression());
          while (this.peek().type === TOKEN_TYPES.COMMA) {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        this.expect(TOKEN_TYPES.RPAREN);
        return { type: 'CallExpression', callee: name, arguments: args };
      }

      return { type: 'Identifier', name };
    }

    // Match parenthesized expression groups: (close + open)
    if (tok.type === TOKEN_TYPES.LPAREN) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TOKEN_TYPES.RPAREN);
      return expr;
    }

    throw new Error(`Unexpected token: ${tok.type} '${tok.value}'`);
  }
}

/**
 * Validate AST
 * 
 * Traverses the built syntax tree to verify that all variables and functions called
 * by the user exist in the allowed indicator or trading command schema.
 * Prevents execution of arbitrary code commands.
 */
export function validateAST(node, errors = []) {
  if (!node) return errors;

  switch (node.type) {
    case 'Program':
    case 'BlockStatement':
      node.body.forEach(s => validateAST(s, errors));
      break;
    case 'IfStatement':
      validateAST(node.condition, errors);
      validateAST(node.consequent, errors);
      if (node.alternate) validateAST(node.alternate, errors);
      break;
    case 'ExpressionStatement':
      validateAST(node.expression, errors);
      break;
    case 'BinaryExpression':
      validateAST(node.left, errors);
      validateAST(node.right, errors);
      break;
    case 'UnaryExpression':
      validateAST(node.argument, errors);
      break;
    case 'Identifier':
      if (!ALL_VARS.includes(node.name)) {
        errors.push(`Unknown variable: '${node.name}'`);
      }
      break;
    case 'CallExpression': {
      const allowed = [...TRADING_FUNCTIONS];
      if (!allowed.includes(node.callee)) {
        errors.push(`Unknown function: '${node.callee}()'`);
      }
      node.arguments.forEach(a => validateAST(a, errors));
      break;
    }
    default:
      break;
  }
  return errors;
}

/**
 * Parse and validate strategy code.
 * 
 * @param {string} code - The C++-style strategy text
 * @returns {Object} { ast, errors, valid }
 */
export function parseStrategy(code) {
  try {
    const tokens = tokenize(code);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const errors = validateAST(ast);
    return { ast, errors, valid: errors.length === 0 };
  } catch (err) {
    return { ast: null, errors: [err.message], valid: false };
  }
}
