const express = require("express");
const {
  createGroup,
  joinGroup,
  myGroups,
  getGroup,
  updateSettings,
  deleteGroup,
} = require("../controllers/groupController");
const { protect } = require("../middleware/auth");
const { requireGroupMember } = require("../middleware/groupAccess");

const songRoutes = require("./songRoutes");
const logRoutes = require("./logRoutes");
const leaderboardRoutes = require("./leaderboardRoutes");

const router = express.Router();

router.use(protect);

router.post("/", createGroup);
router.post("/join", joinGroup);
router.get("/", myGroups);

router.get("/:groupId", requireGroupMember, getGroup);
router.patch("/:groupId/settings", requireGroupMember, updateSettings);
router.delete("/:groupId", requireGroupMember, deleteGroup);

router.use("/:groupId/songs", requireGroupMember, songRoutes);
router.use("/:groupId/logs", requireGroupMember, logRoutes);
router.use("/:groupId/leaderboard", requireGroupMember, leaderboardRoutes);

module.exports = router;
