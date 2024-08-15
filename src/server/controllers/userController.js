const User = require("../models/User");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password -twoFactorSecret",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      "firstName",
      "lastName",
      "bio",
      "avatar",
      "preferences",
      "socialLinks",
    ];
    const actualUpdates = Object.keys(updates)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    const user = await User.findByIdAndUpdate(req.user.userId, actualUpdates, {
      new: true,
      runValidators: true,
    }).select("-password -twoFactorSecret");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating user profile", error: error.message });
  }
};
