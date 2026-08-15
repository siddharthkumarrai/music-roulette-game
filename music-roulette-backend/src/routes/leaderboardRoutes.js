const express = require("express");
const { getLeaderboard, getWeeklyHistory } = require("../controllers/leaderboardController");

const router = express.Router({ mergeParams: true });

router.get("/", getLeaderboard);
router.get("/history", getWeeklyHistory);

module.exports = router;
