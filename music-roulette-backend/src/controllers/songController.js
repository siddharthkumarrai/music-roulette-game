const Joi = require("joi");
const DailySong = require("../models/DailySong");
const ListeningLog = require("../models/ListeningLog");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { extractYoutubeId } = require("../utils/youtube");
const { todayInTimezone, currentHourInTimezone } = require("../utils/dateHelper");
const { getOrExtract } = require("../services/youtubeAudioService");

const submitSongSchema = Joi.object({
  url: Joi.string().trim().required(),
});

const submitSong = asyncHandler(async (req, res) => {
  const { error, value } = submitSongSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const videoId = extractYoutubeId(value.url);
  if (!videoId) throw new ApiError(400, "Couldn't find a valid YouTube video in that link.");

  const { timezone, dailyDeadlineHour } = req.group.settings;
  const dropDate = todayInTimezone(timezone);
  const isLate = currentHourInTimezone(timezone) >= dailyDeadlineHour;

  const existing = await DailySong.findOne({ group: req.group._id, user: req.user._id, dropDate });
  if (existing) throw new ApiError(409, "You've already dropped a song today.");

  let metadata = { title: null, author: null, thumbnailUrl: null, durationSeconds: 0, audioUrl: null };
  try {
    metadata = await getOrExtract(videoId);
  } catch (err) {
    console.error(`[songController] extraction failed for ${videoId}:`, err.message);
  }

  const song = await DailySong.create({
    group: req.group._id,
    user: req.user._id,
    youtubeVideoId: videoId,
    title: metadata.title,
    artist: metadata.author,
    thumbnailUrl: metadata.thumbnailUrl,
    durationSeconds: metadata.durationSeconds,
    audioUrl: metadata.audioUrl,
    streamReady: !!metadata.audioUrl,
    dropDate,
  });

  res.status(201).json({ success: true, song, isLate });
});

const getTodayQuest = asyncHandler(async (req, res) => {
  const { timezone } = req.group.settings;
  const dropDate = todayInTimezone(timezone);

  const [mySong, othersSongs] = await Promise.all([
    DailySong.findOne({ group: req.group._id, user: req.user._id, dropDate }),
    DailySong.find({ group: req.group._id, dropDate, user: { $ne: req.user._id } }).populate(
      "user",
      "name avatarEmoji"
    ),
  ]);

  const logs = await ListeningLog.find({
    group: req.group._id,
    listener: req.user._id,
    song: { $in: othersSongs.map((s) => s._id) },
  });
  const logBySong = Object.fromEntries(logs.map((l) => [l.song.toString(), l]));

  const quest = othersSongs.map((song) => ({
    song,
    myLog: logBySong[song._id.toString()] || null,
  }));

  const completedCount = quest.filter((q) => q.myLog?.status === "completed").length;

  res.json({
    success: true,
    dropDate,
    mySong: mySong || null,
    quest,
    progress: { completed: completedCount, total: quest.length },
  });
});

const getGroupPlaylists = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const songs = await DailySong.find({ group: groupId })
    .populate("user", "_id name avatarEmoji")
    .sort({ submittedAt: -1 });

  const grouped = {};
  songs.forEach((song) => {
    const userId = song.user._id.toString();
    if (!grouped[userId]) {
      grouped[userId] = {
        user: {
          _id: song.user._id,
          name: song.user.name,
          avatarEmoji: song.user.avatarEmoji,
        },
        songs: [],
      };
    }
    grouped[userId].songs.push(song);
  });

  const playlists = Object.values(grouped).sort((a, b) => {
    const aLatest = a.songs[0]?.submittedAt || 0;
    const bLatest = b.songs[0]?.submittedAt || 0;
    return new Date(bLatest) - new Date(aLatest);
  });

  res.json({ success: true, playlists });
});

module.exports = { submitSong, getTodayQuest, getGroupPlaylists };
