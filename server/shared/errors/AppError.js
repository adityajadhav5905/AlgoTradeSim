/**
 * Typed application errors for consistent HTTP mapping.
 * Domain and application layers throw these; presentation layer maps them to status codes.
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class StrategyExecutionError extends AppError {
  constructor(message = 'Strategy execution failed') {
    super(message, 400, 'STRATEGY_EXECUTION_ERROR');
  }
}

export class CompilationError extends AppError {
  constructor(message = 'Compilation/Parsing failed') {
    super(message, 400, 'COMPILATION_ERROR');
  }
}

export class ContainerExecutionError extends AppError {
  constructor(message = 'Container execution failed') {
    super(message, 500, 'CONTAINER_EXECUTION_ERROR');
  }
}
