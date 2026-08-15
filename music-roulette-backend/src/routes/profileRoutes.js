const express = require("express");
const multer = require("multer");
const { updateProfile, uploadAvatar, getProfileStats, getPublicProfile } = require("../controllers/profileController");
const { protect } = require("../middleware/auth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  },
});

router.use(protect);

router.put("/update", updateProfile);
router.post("/avatar", upload.single("avatar"), uploadAvatar);
router.get("/stats", getProfileStats);
router.get("/public/:userId", getPublicProfile);

module.exports = router;
