const express = require("express");
const { submitSong, getTodayQuest, getGroupPlaylists } = require("../controllers/songController");

const router = express.Router({ mergeParams: true });

router.post("/", submitSong);
router.get("/today", getTodayQuest);
router.get("/playlists", getGroupPlaylists);

module.exports = router;
