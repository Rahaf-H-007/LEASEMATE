const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");
const uploadToCloudinary = require("../utils/uploadtoCloudinary");

// Register
const register = async (req, res) => {
  const { name, username, phone, password, role } = req.body;
  const userExists = await User.findOne({ $or: [{ username }, { phone }] });
  if (userExists)
    return res.status(400).json({ message: "User already exists" });

  const user = await User.create({ name, username, phone, password, role });
  res.status(201).json({
    _id: user._id,
    name: user.name,
    role: user.role,
    token: generateToken(user._id),
  });
};

//  Login
const login = async (req, res) => {
  const { usernameOrPhone, password } = req.body;
  const user = await User.findOne({
    $or: [{ username: usernameOrPhone }, { phone: usernameOrPhone }],
  });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      role: user.role,
      token: generateToken(user._id),
      verificationStatus: user.verificationStatus,
    });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
};

//  Get Profile
const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json(user);
};

// Update Profile
const updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.name = req.body.name || user.name;
    user.username = req.body.username || user.username;
    user.phone = req.body.phone || user.phone;
    if (req.body.password) user.password = req.body.password;
    await user.save();
    res.json({ message: "Profile updated" });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};

// Upload Avatar
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const avatarUrl = await uploadToCloudinary(
      req.file.buffer,
      "LeaseMate/avatars"
    );

    const user = await User.findById(req.user._id);
    user.avatarUrl = avatarUrl;
    await user.save();

    res.status(200).json({ message: "Avatar uploaded", avatarUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Avatar upload failed", error });
  }
};

//  Upload ID & Selfie for Verification
const uploadVerification = async (req, res) => {
  try {
    const { idFile, selfieFile } = req.files;

    if (!idFile || !selfieFile) {
      return res
        .status(400)
        .json({ message: "Both ID and selfie are required" });
    }

    const idUrl = await uploadToCloudinary(idFile[0].buffer, "LeaseMate/IDs");
    const selfieUrl = await uploadToCloudinary(
      selfieFile[0].buffer,
      "LeaseMate/Selfies"
    );

    const user = await User.findById(req.user._id);

    user.verificationStatus = {
      status: "pending",
      uploadedIdUrl: idUrl,
      selfieUrl: selfieUrl,
    };

    await user.save();

    res.json({
      message: "Verification uploaded successfully",
      idUrl,
      selfieUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Verification upload failed", error });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadVerification,
};
