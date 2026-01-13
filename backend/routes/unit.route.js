const express = require("express");
const router = express.Router();
const {
  getAllUnits,
  getUnit,
  addUnit,
  updateUnit,
  deleteUnit,
  deleteUnitImage,
  testDatabase,
  getMyUnits,
  getPendingUnitImages,
  getPendingUnitsWithDetails,
  reviewUnitImage,
  approveUnit,
  rejectUnit,
  approveAllUnitImages,
  rejectAllUnitImages,
  resubmitRejectedUnit,
  canAddUnit,
  getAvailableUnits,
  getMaintenanceUnits,
  getBookedUnits,
} = require("../controllers/unit.controller");

const upload = require("../middlewares/upload.middleware");
const { protect } = require("../middlewares/auth.middleware");
const { checkRole } = require("../middlewares/role.middleware");
const { checkVerification } = require("../middlewares/verification.middleware");

router
  .route("/")
  .get(getAllUnits) // Public access for viewing units
  .post(
    protect,
    checkRole("landlord"),
    checkVerification,
    upload.array("images", 5),
    addUnit
  ); // Auth + verification required for creating units
router.get("/my-units", protect, checkRole("landlord"), getMyUnits);
router.get(
  "/can-add",
  protect,
  checkRole("landlord"),
  canAddUnit
);

router
  .route("/:id")
  .get(getUnit) // Public access for viewing individual units
  .patch(
    protect,
    checkRole("landlord"),
    checkVerification,
    upload.array("images", 5),
    updateUnit
  ) // Auth + verification required for updating
  .delete(protect, checkRole("landlord"), checkVerification, deleteUnit); // Auth + verification required for deleting

router.delete(
  "/:id/image",
  protect,
  checkRole("landlord"),
  checkVerification,
  deleteUnitImage
);
// Admin endpoints for reviewing unit images
router.get(
  "/admin/pending-images",
  protect,
  checkRole("admin"),
  getPendingUnitImages
);
router.get(
  "/admin/pending-units",
  protect,
  checkRole("admin"),
  getPendingUnitsWithDetails
);
router.patch(
  "/admin/review-image",
  protect,
  checkRole("admin"),
  reviewUnitImage
);

// Admin endpoints for approving/rejecting units
router.post("/admin/approve-unit", protect, checkRole("admin"), approveUnit);
router.post("/admin/reject-unit", protect, checkRole("admin"), rejectUnit);

// Admin endpoints for approving/rejecting all images of a unit
router.post(
  "/admin/approve-all-images",
  protect,
  checkRole("admin"),
  approveAllUnitImages
);
router.post(
  "/admin/reject-all-images",
  protect,
  checkRole("admin"),
  rejectAllUnitImages
);

// Landlord endpoint for resubmitting rejected units
router.post(
  "/:unitId/resubmit",
  protect,
  checkRole("landlord"),
  checkVerification,
  resubmitRejectedUnit
);

// Admin routes for getting units by status
router.get(
  "/admin/available-units",
  protect,
  checkRole("admin"),
  getAvailableUnits
);

router.get(
  "/admin/maintenance-units",
  protect,
  checkRole("admin"),
  getMaintenanceUnits
);

router.get(
  "/admin/booked-units",
  protect,
  checkRole("admin"),
  getBookedUnits
);

module.exports = router;
