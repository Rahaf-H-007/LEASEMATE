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
    res.status(500).json({ message: "حدث خطأ أثناء استرداد الاشتراك" });
  }
};

module.exports = {
  adminLogin,
  getUsers,
  updateVerificationStatus,
  getSubscriptions,
  refundSubscription,
};
