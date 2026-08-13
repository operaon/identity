class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Não autenticado', code = 'AUTHENTICATION_REQUIRED') {
    super(message, 401, code);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Acesso negado', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

const toErrorResponse = (error) => ({
  success: false,
  error: {
    code: error.code || 'INTERNAL_ERROR',
    message: error.message || 'Erro interno do servidor',
    ...(error.details ? { details: error.details } : {}),
  },
});

module.exports = { AppError, AuthenticationError, AuthorizationError, toErrorResponse };
