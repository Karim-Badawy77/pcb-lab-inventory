function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const body = {
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message
  };

  if (error.details !== undefined) body.details = error.details;
  res.status(statusCode).json(body);
}

module.exports = errorHandler;
