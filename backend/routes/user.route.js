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
const { body, validationResult } = require("express-validator");
const { getUserById } = require("../controllers/user.controller");

const router = express.Router();

router.post(
  "/register",
  [
    body("name")
      .notEmpty().withMessage("Name is required")
      .isLength({ min: 4 }).withMessage("يجب أن يكون الاسم 4 أحرف على الأقل")
      .matches(/^[^\d]+$/).withMessage("Name must not contain numbers"),
    body("username")
      .notEmpty().withMessage("Username is required")
      .isString()
      .trim()
      .toLowerCase(),
    body("phone")
      .notEmpty().withMessage("Phone is required")
      .matches(/^01[0-9]{9}$/)
      .withMessage("Please enter a valid Egyptian phone number"),
    body("password")
      .notEmpty().withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .notEmpty().withMessage("Role is required")
      .isIn(["landlord", "tenant"])
      .withMessage("Role must be landlord, tenant"),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    },
  ],
  register
);
router.post("/login", login);
router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);
router.post("/me/avatar", protect, upload.single("avatar"), uploadAvatar);
router.get("/:id", getUserById);

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
