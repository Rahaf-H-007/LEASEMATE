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
  ); // Auth + verification required for creating

router.get("/my-units", protect, checkRole("landlord"), getMyUnits);

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

module.exports = router;
