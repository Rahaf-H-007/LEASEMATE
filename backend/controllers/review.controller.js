const Review = require("../models/review.model");
const Lease = require("../models/lease.model");
const User = require("../models/user.model");
const { analyzeReviewWithOpenAI } = require("../utils/openai");

// POST /api/reviews
exports.createReview = async (req, res) => {
  try {
    const { leaseId, revieweeId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    if (!leaseId || !revieweeId || !rating) {
      return res.status(400).json({
        status: "fail",
        message: "leaseId, revieweeId, and rating are required.",
      });
    }

    // Check if lease exists
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      return res.status(404).json({
        status: "fail",
        message: "Lease not found.",
      });
    }

    // Check the reviewer is tenant or landlord in the lease
    const reviewerIsTenant = lease.tenantId.toString() === reviewerId;
    const reviewerIsLandlord = lease.landlordId.toString() === reviewerId;

    if (!reviewerIsTenant && !reviewerIsLandlord) {
      return res.status(403).json({
        status: "fail",
        message: "You are not associated with this lease.",
      });
    }

    // Determine allowed reviewee
    const expectedRevieweeId = reviewerIsTenant
      ? lease.landlordId.toString()
      : lease.tenantId.toString();

    if (revieweeId !== expectedRevieweeId) {
      return res.status(403).json({
        status: "fail",
        message: "You can only review the other party in this lease.",
      });
    }

    // Check if a review already exists for this lease from this reviewer
    const existingReview = await Review.findOne({
      leaseId,
      reviewerId,
    });

    if (existingReview) {
      return res.status(400).json({
        status: "fail",
        message: "You have already submitted a review for this lease.",
      });
    }
    let sentiment = null;
    let keywords = [];
    let abusive = false;

    if (comment) {
      // Call OpenAI
      const analysis = await analyzeReviewWithOpenAI(comment);

      sentiment = analysis.sentiment;
      keywords = analysis.keywords;
      abusive = analysis.abusive;
    }


    // Create the review
    const review = await Review.create({
      leaseId,
      reviewerId,
      revieweeId,
      rating,
      comment,
      sentiment,
      keywords,
      abusive,
    });

    res.status(201).json({
      status: "success",
      data: review,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error while creating review.",
    });
  }
};

// GET /api/reviews/user/:userId
exports.getReviewsForUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Any user can view reviews for anyone
    const reviews = await Review.find({ revieweeId: userId })
      .populate("reviewerId", "name avatarUrl")
      .populate("leaseId", "startDate endDate");

    res.status(200).json({
      status: "success",
      data: reviews,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error while fetching reviews.",
    });
  }
};
exports.checkReviewExists = async (req, res) => {
  try {
    const leaseId = req.params.leaseId;
    const revieweeId = req.params.revieweeId;
    const reviewerId = req.user.id;

    const existingReview = await Review.findOne({
      leaseId,
      revieweeId,
      reviewerId
    });

    res.status(200).json({
      exists: !!existingReview
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Error checking review existence"
    });
  }
};
