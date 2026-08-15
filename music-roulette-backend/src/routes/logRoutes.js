const express = require("express");
const { submitLog, useBusyPass } = require("../controllers/logController");

const router = express.Router({ mergeParams: true });

router.post("/", submitLog);
router.post("/busy-pass", useBusyPass);

module.exports = router;
