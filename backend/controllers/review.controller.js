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

    // إذا كان التعليق مسيء، زيادة العداد للمراجع
    if (abusive) {
      // زيادة العداد أولاً
      const updatedUser = await User.findByIdAndUpdate(
        reviewerId, 
        { $inc: { abusiveCommentsCount: 1 } },
        { new: true }
      );

      // التحقق من عدد التعليقات المسيئة
      const abusiveCount = updatedUser.abusiveCommentsCount;
      
      if (abusiveCount >= 2) {
        // حظر المستخدم تلقائياً بعد التعليق المسيء الثاني
        await User.findByIdAndUpdate(reviewerId, { isBlocked: true });
        
        // إرسال إشعار الحظر
        const notificationService = require('../services/notification.service');
        const blockNotification = await notificationService.createNotification({
          userId: reviewerId,
          senderId: null,
          type: 'USER_BLOCKED',
          title: 'تم حظر حسابك',
          message: 'تم حظر حسابك تلقائياً بسبب تكرار التعليقات المسيئة. يمكنك التواصل مع الدعم الفني للمراجعة.',
          isRead: false
        });

        // إرسال إشعار الحظر عبر Socket.io
        const io = req.app.get('io');
        if (io) {
          console.log('📡 Emitting user blocked notification to user:', reviewerId);
          const populatedBlockNotification = await blockNotification.populate('senderId', 'name avatarUrl');
          io.to(reviewerId).emit('newNotification', populatedBlockNotification);
          
          // إرسال حدث الحظر الفوري للمستخدم
          console.log('🚫 Emitting real-time user blocked event to user:', reviewerId);
          io.to(reviewerId).emit('userBlocked', {
            userId: reviewerId,
            isBlocked: true,
            reason: 'تكرار التعليقات المسيئة',
            timestamp: new Date()
          });
          
          console.log('✅ User blocked notification and real-time event emitted successfully');
        } else {
          console.error('❌ Socket.io instance not available for user blocked notification');
        }
      } else {
        // إرسال إشعار تحذيري للمرة الأولى
        const notificationService = require('../services/notification.service');
        const warningNotification = await notificationService.createNotification({
          userId: reviewerId,
          senderId: null,
          type: 'ABUSIVE_COMMENT_WARNING',
          title: 'تحذير من التعليقات المسيئة',
          message: `لقد قمت بكتابة تعليق مسيء. هذا تحذيرك الأول. التعليق المسيء التالي سيؤدي إلى حظر حسابك تلقائياً.`,
          isRead: false
        });

        // إرسال الإشعار عبر Socket.io للعرض الفوري
        const io = req.app.get('io');
        if (io) {
          console.log('📡 Emitting abusive comment warning to user:', reviewerId);
          const populatedWarningNotification = await warningNotification.populate('senderId', 'name avatarUrl');
          io.to(reviewerId).emit('newNotification', populatedWarningNotification);
          console.log('✅ Abusive comment warning emitted successfully');
        } else {
          console.error('❌ Socket.io instance not available for abusive comment warning');
        }
      }
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
