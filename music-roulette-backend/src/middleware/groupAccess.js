const ApiError = require("../utils/ApiError");
const Group = require("../models/Group");
const asyncHandler = require("../utils/asyncHandler");

// Loads the group from :groupId, checks the authed user is a member,
// and attaches both to req so downstream controllers don't repeat this.
const requireGroupMember = asyncHandler(async (req, res, next) => {
  const group = await Group.findById(req.params.groupId);
  if (!group || !group.isActive) throw new ApiError(404, "Group not found.");

  if (!group.isMember(req.user._id)) {
    throw new ApiError(403, "You are not a member of this group.");
  }

  req.group = group;
  req.member = group.getMember(req.user._id);
  next();
});

module.exports = { requireGroupMember };
