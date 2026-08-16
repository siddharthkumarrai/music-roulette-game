const { spawn, execFile } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs");
const os = require("os");

const execFileAsync = promisify(execFile);

const YTDLP_PATH = process.env.YTDLP_PATH || "yt-dlp";

function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  const local = path.join(__dirname, "..", "..", "tools", "ffmpeg.exe");
  if (fs.existsSync(local)) return local;
  const docker = "/usr/bin/ffmpeg";
  if (fs.existsSync(docker)) return docker;
  return "ffmpeg";
}

const FFMPEG_PATH = resolveFfmpeg();

const AUDIO_DIR = path.join(__dirname, "..", "..", "audio_cache");
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

const extractionProgress = new Map();

function getAudioPath(videoId) {
  return path.join(AUDIO_DIR, `${videoId}.mp3`);
}

function isCloudinaryConfigured() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function getTmpDir() {
  const dir = path.join(os.tmpdir(), "audio_workdir");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getCookiePath() {
  const raw = process.env.YOUTUBE_COOKIES_BASE64;
  if (!raw) return null;
  try {
    const toolsDir = path.join(__dirname, "..", "..", "tools");
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir, { recursive: true });
    }
    const cookiePath = path.join(toolsDir, "cookies.txt");
    if (!fs.existsSync(cookiePath)) {
      const decoded = Buffer.from(raw, "base64").toString("utf-8");
      fs.writeFileSync(cookiePath, decoded);
      console.log("[ytAudio] Wrote cookies.txt to", cookiePath);
    }
    return cookiePath;
  } catch (err) {
    console.error("[ytAudio] Failed to write cookies:", err.message);
    return null;
  }
}

function buildCookiesArgs() {
  const cookiePath = getCookiePath();
  if (!cookiePath) return [];
  return ["--cookies", cookiePath];
}

function cleanupFile(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

function getProgress(videoId) {
  return extractionProgress.get(videoId) || { state: "idle", percent: 0 };
}

function setProgress(videoId, state, percent = 0) {
  extractionProgress.set(videoId, { state, percent, updatedAt: Date.now() });
}

async function extractMetadata(videoId) {
  const localMeta = path.join(AUDIO_DIR, `${videoId}.meta.json`);
  if (fs.existsSync(localMeta)) {
    try { return JSON.parse(fs.readFileSync(localMeta, "utf-8")); } catch {}
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const cookiesArgs = buildCookiesArgs();

  try {
    const { stdout } = await execFileAsync(YTDLP_PATH, [
      "--no-download", "--print-json", "--no-playlist",
      "--remote-components", "ejs:github",
      ...cookiesArgs, url,
    ], { timeout: 45000 });

    const info = JSON.parse(stdout);
    const metadata = {
      videoId,
      title: info.title || "Unknown",
      author: info.channel || info.uploader || "Unknown",
      thumbnailUrl: info.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: info.duration || 0,
    };

    try { fs.writeFileSync(localMeta, JSON.stringify(metadata)); } catch {}
    return metadata;
  } catch (err) {
    console.error(`[ytAudio] metadata extraction failed for ${videoId}:`, err.message.split("\n")[0]);
    const fallback = {
      videoId,
      title: null,
      author: null,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: 0,
    };
    try { fs.writeFileSync(localMeta, JSON.stringify(fallback)); } catch {}
    return fallback;
  }
}

function runYtdlp(args, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    let stdout = "";
    let killed = false;

    const proc = spawn(YTDLP_PATH, args, {
      timeout: timeoutMs,
      windowsHide: true,
    });

    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.stdout.on("data", (d) => { stdout += d.toString(); });

    const timer = setTimeout(() => {
      killed = true;
      try { proc.kill("SIGTERM"); } catch {}
      setTimeout(() => {
        try { proc.kill("SIGKILL"); } catch {}
      }, 3000);
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) {
        reject(new Error(`yt-dlp timed out after ${timeoutMs / 1000}s`));
        return;
      }
      if (code === 0) resolve(stdout);
      else reject(new Error(`yt-dlp exit ${code}: ${stderr.slice(0, 500)}`));
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

const COMMON_ARGS = [
  "--remote-components", "ejs:github",
  "--js-runtimes", "node",
  "--no-playlist", "--no-overwrites",
  "--socket-timeout", "30", "--retries", "3",
  "--ffmpeg-location", FFMPEG_PATH,
];

const FORMAT_STRATEGIES = [
  { args: ["--extractor-args", "youtube:player_client=mweb", "-f", "bestaudio/best"], label: "mweb" },
  { args: ["-f", "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio"], label: "bestaudio m4a/mp3" },
  { args: ["-f", "bestaudio"], label: "bestaudio" },
  { args: ["--extractor-args", "youtube:player_client=web", "-f", "bestaudio/best"], label: "web" },
  { args: ["--extractor-args", "youtube:player_client=android", "-f", "bestaudio/best"], label: "android" },
  { args: [], label: "no format (auto)" },
];

async function extractToLocal(videoId) {
  const audioPath = getAudioPath(videoId);
  if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
    console.log(`[ytAudio] ${videoId} already extracted, skipping`);
    setProgress(videoId, "done", 100);
    return audioPath;
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const cookiesArgs = buildCookiesArgs();
  setProgress(videoId, "extracting", 10);
  console.log(`[ytAudio] starting extraction for ${videoId}, cookies: ${cookiesArgs.length > 0 ? "yes" : "no"}`);

  let lastError = null;
  for (let i = 0; i < FORMAT_STRATEGIES.length; i++) {
    const strategy = FORMAT_STRATEGIES[i];
    const pct = 10 + Math.round((i / FORMAT_STRATEGIES.length) * 30);
    setProgress(videoId, "extracting", pct);
    console.log(`[ytAudio] strategy ${i + 1}/${FORMAT_STRATEGIES.length}: ${strategy.label}`);

    try {
      const fullArgs = [
        ...COMMON_ARGS,
        ...strategy.args,
        "-x", "--audio-format", "mp3", "--audio-quality", "3",
        "-o", audioPath,
        ...cookiesArgs, url,
      ];
      console.log(`[ytAudio] running: yt-dlp ${fullArgs.slice(0, 5).join(" ")} ...`);
      await runYtdlp(fullArgs);

      if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
        const size = fs.statSync(audioPath).size;
        console.log(`[ytAudio] SUCCESS: ${videoId} extracted (${size} bytes)`);
        setProgress(videoId, "done", 100);
        return audioPath;
      }
      console.log(`[ytAudio] strategy ${strategy.label} produced no file`);
    } catch (err) {
      lastError = err;
      console.log(`[ytAudio] strategy ${strategy.label} failed: ${err.message.split("\n")[0]}`);
    }
  }

  setProgress(videoId, "failed", 0);
  throw lastError || new Error("All extraction strategies failed");
}

async function extractAndUploadCloudinary(videoId) {
  const cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const tmpFile = path.join(getTmpDir(), `${videoId}.mp3`);
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const cookiesArgs = buildCookiesArgs();
  setProgress(videoId, "extracting", 10);

  let lastError = null;
  for (let i = 0; i < FORMAT_STRATEGIES.length; i++) {
    const strategy = FORMAT_STRATEGIES[i];
    const pct = 10 + Math.round((i / FORMAT_STRATEGIES.length) * 30);
    setProgress(videoId, "extracting", pct);
    console.log(`[ytAudio] strategy ${i + 1}/${FORMAT_STRATEGIES.length}: ${strategy.label}`);

    try {
      cleanupFile(tmpFile);
      await runYtdlp([
        ...COMMON_ARGS,
        ...strategy.args,
        "-x", "--audio-format", "mp3", "--audio-quality", "3",
        "-o", tmpFile,
        ...cookiesArgs, url,
      ]);

      if (fs.existsSync(tmpFile) && fs.statSync(tmpFile).size > 0) {
        const size = fs.statSync(tmpFile).size;
        console.log(`[ytAudio] yt-dlp OK (${size} bytes), uploading to Cloudinary...`);
        setProgress(videoId, "uploading", 85);
        const result = await cloudinary.uploader.upload(tmpFile, {
          resource_type: "video",
          folder: "music_roulette_cache",
          public_id: videoId,
          format: "mp3",
          overwrite: true,
        });
        console.log(`[ytAudio] SUCCESS: ${videoId} uploaded to Cloudinary`);
        setProgress(videoId, "done", 100);
        return result.secure_url;
      }
      console.log(`[ytAudio] strategy ${strategy.label} produced no file`);
    } catch (err) {
      lastError = err;
      console.log(`[ytAudio] strategy ${strategy.label} failed: ${err.message.split("\n")[0]}`);
    } finally {
      cleanupFile(tmpFile);
    }
  }

  setProgress(videoId, "failed", 0);
  throw lastError || new Error("All extraction strategies failed");
}

async function updateSongAudioUrl(videoId, audioUrl, metadata) {
  try {
    const DailySong = require("../models/DailySong");
    const update = { audioUrl, streamReady: true };
    if (metadata) {
      if (metadata.title) update.title = metadata.title;
      if (metadata.author) update.artist = metadata.author;
      if (metadata.thumbnailUrl) update.thumbnailUrl = metadata.thumbnailUrl;
      if (metadata.durationSeconds) update.durationSeconds = metadata.durationSeconds;
    }
    await DailySong.updateOne({ youtubeVideoId: videoId }, { $set: update });
    console.log(`[ytAudio] DB updated for ${videoId}: audioUrl set`);
  } catch (err) {
    console.error(`[ytAudio] DB update failed for ${videoId}:`, err.message);
  }
}

async function getOrExtract(videoId) {
  if (audioExists(videoId)) {
    setProgress(videoId, "done", 100);
    const metadata = await extractMetadata(videoId);
    return { ...metadata, audioUrl: null };
  }

  setProgress(videoId, "extracting", 5);
  const metadata = await extractMetadata(videoId);
  let audioUrl = null;

  try {
    if (isCloudinaryConfigured()) {
      audioUrl = await extractAndUploadCloudinary(videoId);
      await updateSongAudioUrl(videoId, audioUrl, metadata);
    } else {
      await extractToLocal(videoId);
      audioUrl = null;
    }
  } catch (err) {
    console.error(`[ytAudio] extraction failed for ${videoId}:`, err.message);
  }

  return { ...metadata, audioUrl };
}

function triggerExtraction(videoId) {
  const current = extractionProgress.get(videoId);
  if (current && (current.state === "done" || current.state === "extracting" || current.state === "converting" || current.state === "uploading")) {
    return;
  }
  if (audioExists(videoId)) {
    setProgress(videoId, "done", 100);
    return;
  }

  setProgress(videoId, "extracting", 5);
  if (isCloudinaryConfigured()) {
    extractAndUploadCloudinary(videoId)
      .then(async (audioUrl) => {
        if (audioUrl) {
          const metadata = await extractMetadata(videoId).catch(() => null);
          await updateSongAudioUrl(videoId, audioUrl, metadata);
        }
      })
      .catch((err) => {
        console.error(`[ytAudio] background extraction failed for ${videoId}:`, err.message);
      });
  } else {
    extractToLocal(videoId).catch((err) => {
      console.error(`[ytAudio] background extraction failed for ${videoId}:`, err.message);
    });
  }
}

function audioExists(videoId) {
  const p = getAudioPath(videoId);
  return fs.existsSync(p) && fs.statSync(p).size > 0;
}

function getStreamPath(videoId) {
  return getAudioPath(videoId);
}

async function deleteFromCloudinary(videoId) {
  if (!isCloudinaryConfigured()) return;
  try {
    const cloudinary = require("cloudinary").v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const publicId = `music_roulette_cache/${videoId}`;
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    console.log(`[ytAudio] Deleted from Cloudinary: ${publicId}`);
  } catch (err) {
    console.error(`[ytAudio] Cloudinary delete failed for ${videoId}:`, err.message);
  }
}

async function deleteAudioForGroup(groupId) {
  const DailySong = require("../models/DailySong");
  const songs = await DailySong.find({ group: groupId }).select("youtubeVideoId audioUrl");
  const localFiles = songs
    .filter((s) => !s.audioUrl)
    .map((s) => s.youtubeVideoId);

  for (const videoId of localFiles) {
    const p = getAudioPath(videoId);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch {}
    }
  }

  const cloudinaryIds = songs
    .filter((s) => s.audioUrl && s.audioUrl.includes("cloudinary.com"))
    .map((s) => s.youtubeVideoId);

  await Promise.allSettled(cloudinaryIds.map((vid) => deleteFromCloudinary(vid)));

  console.log(`[ytAudio] Cleaned up ${localFiles.length} local + ${cloudinaryIds.length} Cloudinary files for group ${groupId}`);
}

module.exports = { extractMetadata, extractAndUploadCloudinary, extractToLocal, getOrExtract, triggerExtraction, audioExists, getStreamPath, getProgress, deleteFromCloudinary, deleteAudioForGroup };
