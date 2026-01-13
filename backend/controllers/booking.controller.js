const BookingRequest = require("../models/booking-request.model");
const Unit = require("../models/unit.model");
const notificationService = require('../services/notification.service');

exports.createBookingRequest = async (req, res) => {
  try {
    console.log("=== BOOKING REQUEST DEBUG ===");
    console.log("Headers:", req.headers);
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Body:", req.body);
    console.log("Body type:", typeof req.body);
    console.log("Body keys:", Object.keys(req.body || {}));
    console.log("User:", req.user);
    console.log("=============================");

    // التحقق من وجود البيانات
    if (!req.body) {
      return res.status(400).json({ 
        error: "Request body is missing",
        debug: "req.body is null or undefined"
      });
    }

    const { unitId, message, startDate, endDate, durationMonths, price } = req.body;
    
    // التحقق من unitId
    if (!unitId) {
      return res.status(400).json({ 
        error: "unitId is required",
        received: { unitId, message },
        bodyKeys: Object.keys(req.body)
      });
    }

    // التحقق من المستخدم
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // إنشاء طلب الحجز
    const newRequest = new BookingRequest({
      tenantId: req.user._id,
      unitId,
      message: message || "",
      startDate,
      endDate,
      durationMonths,
      price
    });

    await newRequest.save();
    
    // Fetch unit to get ownerId and name
    const unit = await Unit.findById(unitId);
    if (unit && unit.ownerId) {
      // Send notification to landlord
      const notification = await notificationService.createNotification({
        userId: unit.ownerId,
        senderId: req.user._id,
        type: 'BOOKING_REQUEST',
        title: `لديك طلب ايجار جديد للوحده ${unit.name}`,
        message: `لديك طلب ايجار جديد للوحده ${unit.name}`,
        link: '/dashboard/booking-requests',
        isRead: false
      });
      // Emit notification via socket.io
      const io = req.app.get('io');
      if (io) {
        console.log('📡 Emitting newNotification to landlord:', unit.ownerId.toString());
        // Populate senderId before emitting
        const populatedNotification = await notification.populate('senderId', 'name avatarUrl');
        io.to(unit.ownerId.toString()).emit('newNotification', populatedNotification);
        console.log('✅ Booking notification emitted successfully');
      } else {
        console.error('❌ Socket.io instance not available');
      }
    }
    
    console.log("Booking request created successfully:", newRequest._id);
    
    res.status(201).json({ 
      message: "Booking request sent successfully.",
      requestId: newRequest._id
    });
  } catch (err) {
    console.error("Booking request error:", err);
    res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

exports.getLandlordBookings = async (req, res) => {
  try {
    console.log("=== GET LANDLORD BOOKINGS DEBUG ===");
    console.log("User ID:", req.user._id);
    console.log("User role:", req.user.role);
    console.log("================================");

    // التحقق من أن المستخدم مالك
    if (req.user.role !== 'landlord') {
      return res.status(403).json({ 
        error: "Access denied. Only landlords can view booking requests." 
      });
    }

    // جلب جميع طلبات الحجز المعلقة
    const bookings = await BookingRequest.find({ status: "pending" })
      .populate("tenantId", "name email phone")
      .populate("unitId", "name ownerId pricePerMonth securityDeposit")
      .lean();

    // console.log("All pending bookings:", bookings.length);
    // console.log("Sample booking:", bookings[0]);
    // console.log("Sample booking unitId:", bookings[0]?.unitId);
    // console.log("Sample booking tenantId:", bookings[0]?.tenantId);

    // فلترة الطلبات للمالك الحالي فقط
    const landlordBookings = bookings.filter((booking) => {
      if (!booking.unitId || !booking.unitId.ownerId) {
        console.log("Booking without unitId or ownerId:", booking);
        return false;
      }
      
      const isOwner = String(booking.unitId.ownerId) === String(req.user._id);
      console.log(`Booking ${booking._id}: ownerId=${booking.unitId.ownerId}, user=${req.user._id}, isOwner=${isOwner}`);
      return isOwner;
    });

    // console.log("Filtered bookings for landlord:", landlordBookings.length);

    res.json({ 
      status: "success", 
      data: { 
        requests: landlordBookings 
      } 
    });
  } catch (err) {
    console.error("Get landlord bookings error:", err);
    res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// حذف طلب الإيجار من قبل المالك مع إشعار المستأجر
exports.rejectBookingRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await BookingRequest.findById(id).populate("tenantId").populate("unitId");
    if (!booking) {
      return res.status(404).json({ message: "Booking request not found" });
    }
    // التأكد أن المالك هو صاحب الوحدة
    if (!booking.unitId || String(booking.unitId.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Unauthorized: You are not the owner of this unit." });
    }
    // حفظ بيانات المستأجر قبل الحذف
    const tenantId = booking.tenantId._id;
    const unitName = booking.unitId.name;
    await booking.deleteOne();
    // إرسال إشعار بالرفض للمستأجر
    const notification = await notificationService.createNotification({
      userId: tenantId,
      senderId: req.user._id,
      type: 'BOOKING_REJECTED',
      title: `تم رفض طلب الإيجار للوحدة ${unitName}`,
      message: `تم رفض طلب الإيجار الخاص بك للوحدة ${unitName} من قبل المالك.`,
      link: '/dashboard/booking-requests',
      isRead: false
    });
    // إرسال الإشعار عبر سوكيت
    const io = req.app.get('io');
    if (io) {
      const populatedNotification = await notification.populate('senderId', 'name avatarUrl');
      io.to(tenantId.toString()).emit('newNotification', populatedNotification);
    }
    res.status(200).json({ message: "Booking request rejected and deleted, notification sent." });
  } catch (err) {
    console.error("Reject booking request error:", err);
    res.status(500).json({ error: err.message });
  }
};

// جلب كل طلبات الحجز للمستخدم الحالي على وحدة معينة
exports.getMyBookingRequestsByUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const requests = await BookingRequest.find({
      tenantId: req.user._id,
      unitId: unitId
    });
    res.json({ status: "success", data: { requests } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
