require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { startCronJobs } = require("./jobs/dailyCronJob");

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  startCronJobs();

  app.listen(PORT, () => {
    console.log(`🚀 Music Roulette API running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
  });
})();

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
