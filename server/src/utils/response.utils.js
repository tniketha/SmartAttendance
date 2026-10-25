function sendSuccess(res, data, message, statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}
function sendError(res, error, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error });
}
class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
module.exports = { sendSuccess, sendError, HttpError };
