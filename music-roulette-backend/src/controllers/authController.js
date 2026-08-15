const Joi = require("joi");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { signToken } = require("../middleware/auth");

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(40).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).max(100).required(),
  avatarEmoji: Joi.string().max(4).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

const register = asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const existing = await User.findOne({ email: value.email });
  if (existing) throw new ApiError(409, "An account with this email already exists.");

  const passwordHash = await User.hashPassword(value.password);
  const user = await User.create({
    name: value.name,
    email: value.email,
    passwordHash,
    avatarEmoji: value.avatarEmoji || "🎧",
  });

  const token = signToken(user._id);
  res.status(201).json({ success: true, token, user: user.toPublicJSON() });
});

const login = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const user = await User.findOne({ email: value.email });
  if (!user) throw new ApiError(401, "Invalid email or password.");

  const match = await user.comparePassword(value.password);
  if (!match) throw new ApiError(401, "Invalid email or password.");

  const token = signToken(user._id);
  res.json({ success: true, token, user: user.toPublicJSON() });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
});

module.exports = { register, login, me };
