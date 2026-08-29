function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || 500;
  if (error.name === 'ValidationError' || error instanceof SyntaxError) statusCode = 400;
  if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT') statusCode = 413;
  if (error.code === 11000) statusCode = 409;
  const body = {
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message
  };

  if (error.details !== undefined) body.details = error.details;
  res.status(statusCode).json(body);
}

module.exports = errorHandler;
