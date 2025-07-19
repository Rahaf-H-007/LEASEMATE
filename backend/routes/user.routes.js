const express = require("express");
const {
  register,
  login,
  getProfile,
  updateProfile,
  uploadAvatar,uploadVerification
} = require("../controllers/user.controller");
const { protect } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

const router = express.Router();

router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/me", protect, userController.getProfile);
router.put("/me", protect, userController.updateProfile);
router.post("/me/avatar", protect, upload.single("avatar"), userController.uploadAvatar);

router.post(
  "/me/verify-id",
  protect,
  upload.fields([
    { name: "idFile", maxCount: 1 },
    { name: "selfieFile", maxCount: 1 },
  ]),
  userController.uploadVerification
);

module.exports = router;
