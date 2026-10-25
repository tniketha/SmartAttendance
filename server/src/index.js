const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { connectDatabase, client, db } = require("./config/database");
const { ENV } = require("./config/env");
const { errorHandler } = require("./middleware/error.middleware");
const app = express();
app.use(helmet());
app.use(cors({ origin: ENV.ALLOWED_ORIGINS }));
app.use(express.json({ limit: "16kb" }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 3000 }));
app.get("/api/health", (_req, res) => res.json({ status: "online" }));
app.get("/api/ready", async (_req, res) => {
  try {
    await db.command({ ping: 1 });
    res.json({ success: true });
  } catch {
    res.status(503).json({ success: false, error: "Database unavailable" });
  }
});
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    skipSuccessfulRequests: true,
  }),
  require("./routes/auth.routes"),
);
app.use("/api/student", require("./routes/student.routes"));
app.use("/api/lecturer", require("./routes/lecturer.routes"));
app.use("/api/attendance", require("./routes/attendance.routes"));
app.use("/api/reports", require("./routes/report.routes"));
app.use(errorHandler);
async function startServer(port = ENV.PORT) {
  await connectDatabase();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(
        `Smart Attendance API is running on port ${server.address().port}`,
      );
      resolve(server);
    });
    server.once("error", reject);
  });
}
if (require.main === module)
  startServer().catch(async (error) => {
    console.error(error.message);
    await client.close();
    process.exitCode = 1;
  });
module.exports = { app, startServer };
