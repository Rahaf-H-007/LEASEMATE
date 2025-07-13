const express = require("express");
const { adminLogin, getUsers, updateVerificationStatus } = require("../controllers/adminController");
const { protect, admin } = require("../middlewares/auth");

const router = express.Router();

router.post("/login", adminLogin);
router.get("/users", protect, admin, getUsers);
router.put("/users/:userId/verification", protect, admin, updateVerificationStatus);

module.exports = router;
