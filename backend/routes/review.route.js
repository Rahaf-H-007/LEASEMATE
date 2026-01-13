const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/", protect, reviewController.createReview);
router.get("/check", protect, reviewController.checkReviewExists);
router.get('/check/:leaseId/:revieweeId', protect, reviewController.checkReviewExists);
router.get("/:userId", reviewController.getReviewsForUser);

module.exports = router;
