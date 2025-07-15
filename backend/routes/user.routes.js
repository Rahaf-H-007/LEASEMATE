const express = require("express");
const {
  register,
  login,
  getProfile,
  updateProfile,
  uploadAvatar,uploadVerification
} = require("../controllers/userController");
const { protect } = require("../middlewares/auth");
const upload = require("../middlewares/upload");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);
router.post("/me/avatar", protect, upload.single("avatar"), uploadAvatar);

router.post(
  "/me/verify-id",
  protect,
  upload.fields([
    { name: "idFile", maxCount: 1 },
    { name: "selfieFile", maxCount: 1 },
  ]),
  uploadVerification
);

module.exports = router;
