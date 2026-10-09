require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");
const { startCronJobs } = require("./jobs/dailyCronJob");

const PORT = process.env.PORT || 5000;
const MONGODB_KEEP_ALIVE_INTERVAL = 25 * 60 * 1000;

function startMongoKeepAlive() {
  setInterval(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        console.log("Keep-alive: MongoDB pinged successfully.");
      }
    } catch (error) {
      console.error("Keep-alive MongoDB ping error:", error);
    }
  }, MONGODB_KEEP_ALIVE_INTERVAL);
}

(async () => {
  await connectDB();
  startMongoKeepAlive();
  startCronJobs();

  app.listen(PORT, () => {
    console.log(`🚀 Music Roulette API running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
  });
})();

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
