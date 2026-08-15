const Joi = require("joi");
const User = require("../models/User");
const Group = require("../models/Group");
const DailySong = require("../models/DailySong");
const ListeningLog = require("../models/ListeningLog");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(40).optional(),
  bio: Joi.string().trim().max(200).allow("").optional(),
  favoriteGenre: Joi.string().trim().max(50).allow("").optional(),
  avatarEmoji: Joi.string().max(4).optional(),
});

const updateProfile = asyncHandler(async (req, res) => {
  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const updates = {};
  if (value.name !== undefined) updates.name = value.name;
  if (value.bio !== undefined) updates.bio = value.bio;
  if (value.favoriteGenre !== undefined) updates.favoriteGenre = value.favoriteGenre;
  if (value.avatarEmoji !== undefined) updates.avatarEmoji = value.avatarEmoji;

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No fields to update.");
  }

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
  res.json({ success: true, user: user.toPublicJSON() });
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No image file provided.");

  const cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "music_roulette_avatars",
        public_id: `avatar_${req.user._id}`,
        overwrite: true,
        transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }],
        format: "jpg",
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(req.file.buffer);
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatarUrl: result.secure_url } },
    { new: true }
  );

  res.json({ success: true, avatarUrl: result.secure_url, user: user.toPublicJSON() });
});

const getProfileStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const groups = await Group.find({ "members.user": userId, isActive: true });
  const groupIds = groups.map((g) => g._id);

  const [songsCount, completedLogsCount, ratingsGiven] = await Promise.all([
    DailySong.countDocuments({ user: userId }),
    ListeningLog.countDocuments({ listener: userId, status: "completed" }),
    ListeningLog.countDocuments({ listener: userId, rating: { $gte: 1 } }),
  ]);

  let totalPoints = 0;
  let bestStreak = 0;
  let currentStreak = 0;
  let fiveStarCurations = 0;
  let memberSince = null;

  for (const group of groups) {
    const member = group.getMember(userId);
    if (member) {
      totalPoints += member.totalPoints;
      bestStreak = Math.max(bestStreak, member.bestStreak);
      currentStreak = Math.max(currentStreak, member.streakCount);
      fiveStarCurations += member.fiveStarCurations;
      if (!memberSince || member.joinedAt < memberSince) {
        memberSince = member.joinedAt;
      }
    }
  }

  const avgRating = ratingsGiven > 0
    ? (await ListeningLog.aggregate([
        { $match: { listener: userId, rating: { $gte: 1 } } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]))[0]?.avg || 0
    : 0;

  res.json({
    success: true,
    stats: {
      totalPoints,
      currentStreak,
      bestStreak,
      songsSubmitted: songsCount,
      songsCompleted: completedLogsCount,
      ratingsGiven,
      avgRating: Math.round(avgRating * 10) / 10,
      fiveStarCurations,
      groupsCount: groups.length,
      memberSince,
    },
  });
});

const getPublicProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select("name avatarEmoji avatarUrl bio favoriteGenre createdAt");
  if (!user) throw new ApiError(404, "User not found.");

  const groups = await Group.find({ "members.user": userId, isActive: true });
  let totalPoints = 0;
  let bestStreak = 0;
  for (const group of groups) {
    const member = group.getMember(userId);
    if (member) {
      totalPoints += member.totalPoints;
      bestStreak = Math.max(bestStreak, member.bestStreak);
    }
  }

  const songsCount = await DailySong.countDocuments({ user: userId });

  res.json({
    success: true,
    profile: {
      _id: user._id,
      name: user.name,
      avatarEmoji: user.avatarEmoji,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      favoriteGenre: user.favoriteGenre,
      totalPoints,
      bestStreak,
      songsSubmitted: songsCount,
      memberSince: user.createdAt,
    },
  });
});

module.exports = { updateProfile, uploadAvatar, getProfileStats, getPublicProfile };
