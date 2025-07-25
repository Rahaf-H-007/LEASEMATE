const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");

// Admin Login
const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, role: 'admin' });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: "Invalid admin credentials" });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

// Update verification status
const updateVerificationStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body;

    console.log('Update verification request:', { userId, action, body: req.body });

    // Validate userId format
    if (!userId || userId.length !== 24) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log('Found user:', { id: user._id, name: user.name, currentStatus: user.verificationStatus?.status });

    if (action === 'approve') {
      user.verificationStatus.status = 'approved';
      user.verificationStatus.idVerified = true;
      user.verificationStatus.faceMatched = true;
    } else if (action === 'reject') {
      user.verificationStatus.status = 'rejected';
    } else {
      return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'" });
    }

    console.log('Saving user with new status:', user.verificationStatus.status);
    await user.save();
    
    console.log('User saved successfully');
    res.json({ message: `Verification ${action}d successfully` });
  } catch (error) {
    console.error('Error in updateVerificationStatus:', error);
    res.status(500).json({ message: "Error updating verification status", error: error.message });
  }
};

// Get users with more than 3 abusive comments
const getAbusiveUsers = async (req, res) => {
  try {
    const users = await User.find({ abusiveCommentsCount: { $gt: 3 } }).select('-password').sort({ abusiveCommentsCount: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Error fetching abusive users" });
  }
};

// Block a user
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.isBlocked = true;
    await user.save();
    res.json({ message: "User has been blocked successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error blocking user" });
  }
};

module.exports = {
  adminLogin,
  getUsers,
  updateVerificationStatus,
  getAbusiveUsers,
  blockUser,
};
