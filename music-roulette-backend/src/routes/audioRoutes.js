const express = require("express");
const fs = require("fs");
const DailySong = require("../models/DailySong");
const { audioExists, getStreamPath, getProgress, triggerExtraction } = require("../services/youtubeAudioService");

const router = express.Router({ mergeParams: true });

router.get("/:videoId/status", async (req, res) => {
  const { videoId } = req.params;
  const song = await DailySong.findOne({ youtubeVideoId: videoId }).select("audioUrl streamReady durationSeconds title artist thumbnailUrl");
  if (!song) return res.status(404).json({ error: "Song not found" });

  const hasLocal = audioExists(videoId);
  const progress = getProgress(videoId);

  if (!song.audioUrl && !hasLocal && progress.state === "idle") {
    triggerExtraction(videoId);
  }

  const streamReady = song.streamReady || hasLocal || progress.state === "done";
  const audioUrl = song.audioUrl || (hasLocal ? `${process.env.API_BASE_URL || ""}/api/audio/${videoId}/stream` : null);

  res.json({
    videoId,
    audioUrl,
    streamReady,
    durationSeconds: song.durationSeconds,
    title: song.title,
    artist: song.artist,
    thumbnailUrl: song.thumbnailUrl,
    progress,
  });
});

router.post("/:videoId/retry", async (req, res) => {
  const { videoId } = req.params;
  const progress = getProgress(videoId);
  if (progress.state === "extracting" || progress.state === "converting" || progress.state === "uploading") {
    return res.json({ success: true, message: "Extraction already in progress", progress });
  }

  triggerExtraction(videoId);
  res.json({ success: true, message: "Extraction triggered", progress: getProgress(videoId) });
});

router.get("/:videoId/stream", async (req, res) => {
  const { videoId } = req.params;

  const song = await DailySong.findOne({ youtubeVideoId: videoId }).select("audioUrl");
  if (song && song.audioUrl) {
    return res.redirect(302, song.audioUrl);
  }

  if (!audioExists(videoId)) {
    return res.status(404).json({ error: "Audio not ready yet." });
  }

  const filePath = getStreamPath(videoId);
  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Content-Length": stat.size,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
  });
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
