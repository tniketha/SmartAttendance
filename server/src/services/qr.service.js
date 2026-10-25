const { randomBytes } = require("node:crypto");
const QRService = {
  createToken() {
    return randomBytes(24).toString("hex");
  },
  createPayload(sessionId, token) {
    return JSON.stringify({ sessionId: String(sessionId), token });
  },
  parsePayload(text) {
    try {
      const value = JSON.parse(text);
      if (
        typeof value?.sessionId !== "string" ||
        !/^[a-f0-9]{24}$/i.test(value.sessionId)
      )
        return null;
      if (
        typeof value.token !== "string" ||
        !/^[a-f0-9]{48}$/i.test(value.token)
      )
        return null;
      return { sessionId: value.sessionId, token: value.token };
    } catch {
      return null;
    }
  },
};
module.exports = { QRService };
