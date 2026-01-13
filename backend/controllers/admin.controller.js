const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");
const Unit = require("../models/unit.model");
const Notification = require("../models/notification.model");
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
    
    // Emit WebSocket event for real-time updates
    if (global.io) {
      global.io.emit('admin_update', {
        type: 'user_verification_updated',
        userId: user._id,
        action: action,
        status: user.verificationStatus.status
      });
    }
    
    console.log('User saved successfully');
    res.json({ message: `Verification ${action}d successfully` });
  } catch (error) {
    console.error('Error in updateVerificationStatus:', error);
    res.status(500).json({ message: "Error updating verification status", error: error.message });
  }
};

// Get all subscriptions with landlord details
const getSubscriptions = async (req, res) => {
  console.log('getSubscriptions endpoint called');
  try {
    const subscriptions = await Subscription.find({})
      .populate('landlordId', 'name phone email')
      .sort({ createdAt: -1 });
    
    console.log('Found subscriptions:', subscriptions.length);
    res.json({ subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الاشتراكات" });
  }
};

// Admin refund subscription
const refundSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const subscription = await Subscription.findById(subscriptionId)
      .populate('landlordId', 'name phone email');
    
    if (!subscription) {
      return res.status(404).json({ message: "لم يتم العثور على الاشتراك" });
    }

    // Check if subscription can be refunded
    if (subscription.refunded) {
      return res.status(400).json({ message: "تم استرداد هذا الاشتراك مسبقاً" });
    }

    if (subscription.status !== 'expired') {
      return res.status(400).json({ message: "يمكن استرداد الاشتراكات المنتهية الصلاحية فقط" });
    }

    // Check if more than a month has passed since subscription creation
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    if (subscription.startDate > oneMonthAgo) {
      return res.status(400).json({ message: "لا يمكن استرداد الاشتراك إلا بعد مرور شهر على إنشائه" });
    }

    // Check if there are any booked units
    const bookedUnits = await Unit.find({
      subscriptionId: subscription._id,
      status: 'booked'
    });

    if (bookedUnits.length > 0) {
      return res.status(400).json({ message: "لا يمكن استرداد الاشتراك إذا كانت هناك وحدات محجوزة" });
    }

    // Mark subscription as refunded
    subscription.refunded = true;
    subscription.status = 'refunded';
    await subscription.save();

    // Delete all units related to this subscription
    await Unit.deleteMany({ subscriptionId: subscription._id });

    // Create notification for the landlord
    const planNameArabic = subscription.planName === 'basic' ? 'أساسي' : 
                           subscription.planName === 'standard' ? 'قياسي' : 
                           subscription.planName === 'premium' ? 'مميز' : subscription.planName;
    
    const notification = await Notification.create({
      userId: subscription.landlordId._id,
      title: 'تم استرداد اشتراكك بنجاح',
      message: `تم استرداد اشتراكك (${planNameArabic}) بنجاح. تم حذف جميع الوحدات المرتبطة بهذا الاشتراك نهائياً. يمكنك الاشتراك مرة أخرى في أي وقت.`,
      type: 'REFUND_SUCCESS',
      isRead: false,
      createdAt: new Date(),
      meta: {
        subscriptionId: subscription._id,
        planName: subscription.planName,
        refundedAt: new Date()
      }
    });

    // Send WebSocket notification to landlord
    if (global.io) {
      global.io.to(subscription.landlordId._id.toString()).emit('newNotification', notification);
    }

    // Emit WebSocket event for real-time updates
    if (global.io) {
      global.io.emit('subscription_update', {
        type: 'subscription_refunded',
        subscriptionId: subscription._id,
        landlordId: subscription.landlordId._id
      });
    }

    res.json({ 
      message: "تم استرداد الاشتراك بنجاح وحذف الوحدات المرتبطة به",
      subscription 
    });
  } catch (error) {
    console.error('Error refunding subscription:', error);
    res.status(500).json({ message: "حدث خطأ أثناء استرداد الاشتراك" });}}
// Get users with 2 or more abusive comments (at risk of being blocked or already blocked)
const getAbusiveUsers = async (req, res) => {
  try {
    const users = await User.find({ abusiveCommentsCount: { $gte: 2 } }).select('-password').sort({ abusiveCommentsCount: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Error fetching abusive users" });
  }
};

// Admin block/unblock user
const toggleUserBlock = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBlocked } = req.body;
    
    // Update user blocked status
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { isBlocked }, 
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    
    // Create notification for the user
    const notificationService = require('../services/notification.service');
    const notificationData = {
      userId: userId,
      senderId: req.user._id, // Admin who performed the action
      type: isBlocked ? 'USER_BLOCKED' : 'GENERAL',
      title: isBlocked ? 'تم حظر حسابك' : 'تم إلغاء حظر حسابك',
      message: isBlocked 
        ? 'تم حظر حسابك من قبل الإدارة. يمكنك التواصل مع الدعم الفني للمراجعة.'
        : 'تم إلغاء حظر حسابك. يمكنك الآن استخدام المنصة بشكل طبيعي.',
      isRead: false
    };
    
    const notification = await notificationService.createNotification(notificationData);
    
    // Send real-time WebSocket events
    const io = req.app.get('io');
    if (io) {
      console.log(`🚫 Emitting real-time user ${isBlocked ? 'blocked' : 'unblocked'} event to user:`, userId);
      
      // Send notification
      const populatedNotification = await notification.populate('senderId', 'name avatarUrl');
      io.to(userId).emit('newNotification', populatedNotification);
      
      // Send blocking status change event
      io.to(userId).emit('userBlocked', {
        userId: userId,
        isBlocked: isBlocked,
        reason: isBlocked ? 'إجراء إداري' : 'إلغاء الحظر',
        timestamp: new Date(),
        adminAction: true
      });
      
      console.log(`✅ User ${isBlocked ? 'blocked' : 'unblocked'} event emitted successfully`);
    } else {
      console.error('❌ Socket.io instance not available for user blocking event');
    }
    
    res.json({ 
      message: isBlocked ? "تم حظر المستخدم بنجاح" : "تم إلغاء حظر المستخدم بنجاح",
      user: updatedUser 
    });
    
  } catch (error) {
    console.error('Error toggling user block status:', error);
    res.status(500).json({ message: "حدث خطأ أثناء تغيير حالة الحظر" });
  }
};

module.exports = {
  adminLogin,
  getUsers,
  updateVerificationStatus,
  getSubscriptions,
  refundSubscription,
  getAbusiveUsers,
  toggleUserBlock,
};
