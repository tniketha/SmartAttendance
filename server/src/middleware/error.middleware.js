const { sendError } = require("../utils/response.utils");
// Express 4 needs rejected async handlers passed to its error middleware.
function asyncHandler(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.code === 11000)
    return sendError(res, "Attendance already recorded.", 409);
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  sendError(
    res,
    status >= 500 ? "Unable to complete this request." : error.message,
    status,
  );
}
module.exports = { asyncHandler, errorHandler };
