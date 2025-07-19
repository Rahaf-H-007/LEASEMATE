const express = require("express");
const router = express.Router();
const { 
  createLease, 
  getMyLease, 
  getMyLeases, 
  generateLeasePDF 
} = require("../controllers/lease.controller.js");
const { protect } = require("../middlewares/auth.middleware");
const { checkRole } = require("../middlewares/role.middleware");

// إنشاء عقد بناءً على bookingId (يملأه المالك)
router.post("/create/:bookingId", protect, checkRole("landlord"), createLease);

// جلب عقد المستأجر الحالي
router.get("/my-lease", protect, getMyLease);

// جلب كل عقود المستخدم
router.get("/my-leases", protect, getMyLeases);

// تحميل عقد الإيجار PDF
router.get("/:leaseId/pdf", protect, generateLeasePDF);

module.exports = router;
