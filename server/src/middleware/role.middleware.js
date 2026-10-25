const { sendError } = require("../utils/response.utils");
function requireRoles(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return sendError(res, "You do not have permission for this action.", 403);
    next();
  };
}
module.exports = { requireRoles };
