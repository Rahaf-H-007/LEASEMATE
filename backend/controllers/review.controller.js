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
        message: "الرقم التعريفي للعقد، والمُقيَّم، والتقييم مطلوبة.",
      });
    }

    // التحقق من وجود العقد
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      return res.status(404).json({
        status: "fail",
        message: "لم يتم العثور على العقد.",
      });
    }

    // التحقق من أن المراجع هو المستأجر أو المالك في هذا العقد
    const reviewerIsTenant = lease.tenantId.toString() === reviewerId;
    const reviewerIsLandlord = lease.landlordId.toString() === reviewerId;

    if (!reviewerIsTenant && !reviewerIsLandlord) {
      return res.status(403).json({
        status: "fail",
        message: "أنت غير مرتبط بهذا العقد.",
      });
    }

    // تحديد الشخص المسموح بتقييمه
    const expectedRevieweeId = reviewerIsTenant
      ? lease.landlordId.toString()
      : lease.tenantId.toString();

    if (revieweeId !== expectedRevieweeId) {
      return res.status(403).json({
        status: "fail",
        message: "يمكنك فقط تقييم الطرف الآخر في هذا العقد.",
      });
    }

    // التحقق من وجود تقييم مسبق لهذا العقد من هذا المراجع
    const existingReview = await Review.findOne({
      leaseId,
      reviewerId,
    });

    if (existingReview) {
      return res.status(400).json({
        status: "fail",
        message: "لقد قمت بإرسال تقييم لهذا العقد مسبقًا.",
      });
    }

    let sentiment = null;
    let keywords = [];
    let abusive = false;

    if (comment) {
      // تحليل التعليق باستخدام OpenAI
      const analysis = await analyzeReviewWithOpenAI(comment);
      sentiment = analysis.sentiment;
      keywords = analysis.keywords;
      abusive = analysis.abusive;
    }

    // إنشاء التقييم
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
      message: "حدث خطأ في الخادم أثناء إنشاء التقييم.",
    });
  }
};

// GET /api/reviews/user/:userId
exports.getReviewsForUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    // يمكن لأي مستخدم مشاهدة تقييمات أي شخص
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
      message: "حدث خطأ في الخادم أثناء جلب التقييمات.",
    });
  }
};

// GET /api/reviews/check/:leaseId/:revieweeId
exports.checkReviewExists = async (req, res) => {
  try {
    const leaseId = req.params.leaseId;
    const revieweeId = req.params.revieweeId;
    const reviewerId = req.user.id;

    const existingReview = await Review.findOne({
      leaseId,
      revieweeId,
      reviewerId,
    });

    res.status(200).json({
      exists: !!existingReview,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "حدث خطأ أثناء التحقق من وجود التقييم.",
    });
  }
};
