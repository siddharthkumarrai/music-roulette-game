const Joi = require("joi");
const Group = require("../models/Group");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  minMembers: Joi.number().integer().min(2).max(50).optional(),
  maxMembers: Joi.number().integer().min(2).max(50).optional(),
  dailyDeadlineHour: Joi.number().integer().min(0).max(23).optional(),
  timezone: Joi.string().optional(),
});

// Any authenticated user can spin up a new group of any size —
// this is the "generic" entry point, not hardcoded to 3 friends.
const createGroup = asyncHandler(async (req, res) => {
  const { error, value } = createGroupSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const settings = {};
  if (value.minMembers) settings.minMembers = value.minMembers;
  if (value.maxMembers) settings.maxMembers = value.maxMembers;
  if (value.dailyDeadlineHour !== undefined) settings.dailyDeadlineHour = value.dailyDeadlineHour;
  if (value.timezone) settings.timezone = value.timezone;

  const group = await Group.create({
    name: value.name,
    createdBy: req.user._id,
    settings,
    members: [{ user: req.user._id, role: "owner" }],
  });

  res.status(201).json({ success: true, group });
});

const joinGroupSchema = Joi.object({
  inviteCode: Joi.string().trim().uppercase().length(6).required(),
});

const joinGroup = asyncHandler(async (req, res) => {
  const { error, value } = joinGroupSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const group = await Group.findOne({ inviteCode: value.inviteCode, isActive: true });
  if (!group) throw new ApiError(404, "Invalid invite code.");

  if (group.isMember(req.user._id)) {
    return res.json({ success: true, group, message: "Already a member." });
  }

  if (group.members.length >= group.settings.maxMembers) {
    throw new ApiError(400, `This group is full (max ${group.settings.maxMembers} members).`);
  }

  group.members.push({
    user: req.user._id,
    busyPassesLeft: group.settings.busyPassesPerWeek,
  });
  await group.save();

  res.json({ success: true, group });
});

// Groups the current user belongs to, with fresh member/user data populated.
const myGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ "members.user": req.user._id, isActive: true })
    .populate("members.user", "name avatarEmoji")
    .sort({ createdAt: -1 });

  res.json({ success: true, groups });
});

const getGroup = asyncHandler(async (req, res) => {
  const group = await req.group.populate("members.user", "name avatarEmoji email");
  res.json({ success: true, group });
});

const updateSettingsSchema = Joi.object({
  dailyDeadlineHour: Joi.number().integer().min(0).max(23).optional(),
  timezone: Joi.string().optional(),
  pointsDailyComplete: Joi.number().integer().optional(),
  pointsBestCurationBonus: Joi.number().integer().optional(),
  pointsStreakBonus: Joi.number().integer().optional(),
  streakLengthForBonus: Joi.number().integer().min(2).optional(),
  penaltyUnexcusedSkip: Joi.number().integer().max(0).optional(),
  busyPassesPerWeek: Joi.number().integer().min(0).optional(),
  minReactionLength: Joi.number().integer().min(0).optional(),
});

// Owner-only: lets a group tune its own rules without redeploying the app.
const updateSettings = asyncHandler(async (req, res) => {
  if (req.member.role !== "owner") {
    throw new ApiError(403, "Only the group owner can change settings.");
  }
  const { error, value } = updateSettingsSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  Object.assign(req.group.settings, value);
  await req.group.save();

  res.json({ success: true, group: req.group });
});

const deleteGroup = asyncHandler(async (req, res) => {
  if (req.member.role !== "owner") {
    throw new ApiError(403, "Only the group owner can delete this room.");
  }

  const DailySong = require("../models/DailySong");
  const ListeningLog = require("../models/ListeningLog");
  const WeeklyWinner = require("../models/WeeklyWinner");
  const { deleteAudioForGroup } = require("../services/youtubeAudioService");

  await deleteAudioForGroup(req.group._id);

  await Promise.all([
    DailySong.deleteMany({ group: req.group._id }),
    ListeningLog.deleteMany({ group: req.group._id }),
    WeeklyWinner.deleteMany({ group: req.group._id }),
  ]);

  await Group.findByIdAndDelete(req.group._id);

  res.json({ success: true, message: "Room deleted successfully." });
});

module.exports = { createGroup, joinGroup, myGroups, getGroup, updateSettings, deleteGroup };
