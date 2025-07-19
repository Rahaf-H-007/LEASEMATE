const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");
const {  protect } = require("../middlewares/auth.middleware");
const { checkRole } = require("../middlewares/role.middleware");

// إرسال طلب حجز (للمستأجر)
router.post("/request", protect, bookingController.createBookingRequest);

// جلب طلبات الحجز للمالك
router.get("/landlord-requests", protect, checkRole("landlord"), bookingController.getLandlordBookings);

module.exports = router; 