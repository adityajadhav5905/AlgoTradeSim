/**
 * STRATEGY LEXER (TOKENIZER)
 * 
 * What is a Lexer?
 * A lexer (or tokenizer) takes a raw string of strategy code (text written by the user)
 * and breaks it down into a list of meaningful components called "tokens".
 * 
 * For example, if the user writes:
 *    if (rsi < 30) { buy_all(); }
 * 
 * The lexer will produce tokens like:
 *    [KEYWORD("if"), LPAREN("("), IDENTIFIER("rsi"), OPERATOR("<"), NUMBER(30), RPAREN(")"), LBRACE("{"), IDENTIFIER("buy_all"), LPAREN("("), RPAREN(")"), SEMICOLON(";"), RBRACE("}")]
 * 
 * This makes it much easier for the Parser to understand the grammatical structure of the code.
 */

// All classification types for our tokens
export const TOKEN_TYPES = {
  NUMBER: 'NUMBER',         // E.g. 100, 30.5
  IDENTIFIER: 'IDENTIFIER', // E.g. rsi, buy_all, close
  OPERATOR: 'OPERATOR',     // E.g. +, -, >, <, &&, ==
  LPAREN: 'LPAREN',         // (
  RPAREN: 'RPAREN',         // )
  LBRACE: 'LBRACE',         // {
  RBRACE: 'RBRACE',         // }
  SEMICOLON: 'SEMICOLON',   // ;
  COMMA: 'COMMA',           // ,
  KEYWORD: 'KEYWORD',       // reserved words like "if" or "else"
  EOF: 'EOF',               // End Of File marker
};

// Reserved language keywords
const KEYWORDS = new Set(['if', 'else']);

// All supported operations, sorted by length so double-character operators
// like '>=' are matched before single characters like '>'
const OPERATORS = ['>=', '<=', '==', '!=', '&&', '||', '>', '<', '+', '-', '*', '/'];

/**
 * Tokenize source code string into array of classified tokens.
 * Throws a syntax error if it encounters an unrecognized character.
 * 
 * @param {string} source - Raw strategy code
 * @returns {Array} List of tokens
 */
export function tokenize(source) {
  const tokens = [];
  let i = 0; // Pointer index in the source string

  while (i < source.length) {
    const ch = source[i];

    // 1. Skip whitespace characters (spaces, tabs, newlines)
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // 2. Skip single-line comments (starts with '//')
    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') {
        i++;
      }
      continue;
    }

    // 3. Match operators (check multi-character operators first)
    let matched = false;
    for (const op of OPERATORS) {
      if (source.slice(i, i + op.length) === op) {
        tokens.push({ type: TOKEN_TYPES.OPERATOR, value: op });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 4. Match single-character punctuation
    if (ch === '(') { tokens.push({ type: TOKEN_TYPES.LPAREN, value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: TOKEN_TYPES.RPAREN, value: ')' }); i++; continue; }
    if (ch === '{') { tokens.push({ type: TOKEN_TYPES.LBRACE, value: '{' }); i++; continue; }
    if (ch === '}') { tokens.push({ type: TOKEN_TYPES.RBRACE, value: '}' }); i++; continue; }
    if (ch === ';') { tokens.push({ type: TOKEN_TYPES.SEMICOLON, value: ';' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: TOKEN_TYPES.COMMA, value: ',' }); i++; continue; }

    // 5. Match numbers (integers or decimals)
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(source[i + 1]))) {
      let num = '';
      while (i < source.length && /[0-9.]/.test(source[i])) {
        num += source[i];
        i++;
      }
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: parseFloat(num) });
      continue;
    }

    // 6. Match identifiers (words starting with letters or underscore)
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        id += source[i];
        i++;
      }
      // Differentiate between keywords and general variable/function names
      if (KEYWORDS.has(id)) {
        tokens.push({ type: TOKEN_TYPES.KEYWORD, value: id });
      } else {
        tokens.push({ type: TOKEN_TYPES.IDENTIFIER, value: id });
      }
      continue;
    }

    // If no rules match, the user entered an illegal character
    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }

  // Append End Of File token to signify tokenize completion
  tokens.push({ type: TOKEN_TYPES.EOF, value: null });
  return tokens;
}
