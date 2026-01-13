const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");
const {  protect } = require("../middlewares/auth.middleware");
const { checkRole } = require("../middlewares/role.middleware");
const { getMyBookingRequestsByUnit } = require("../controllers/booking.controller");

// إرسال طلب حجز (للمستأجر)
router.post("/request", protect, bookingController.createBookingRequest);

// جلب طلبات الحجز للمالك
router.get("/landlord-requests", protect, checkRole("landlord"), bookingController.getLandlordBookings);

// جلب كل طلبات الحجز للمستخدم الحالي على وحدة معينة
router.get("/my-requests/:unitId", protect, getMyBookingRequestsByUnit);

// حذف طلب الإيجار من قبل المالك
router.delete("/request/:id/reject", protect, checkRole("landlord"), bookingController.rejectBookingRequest);

module.exports = router; 