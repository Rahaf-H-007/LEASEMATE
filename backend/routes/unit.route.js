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
} = require("../controllers/unit.controller");

const upload = require("../middlewares/upload.middleware");
const { protect } = require("../middlewares/auth.middleware");
const { checkRole } = require("../middlewares/role.middleware");

router
  .route("/")
  .get(getAllUnits) // Public access for viewing units
  .post(protect, checkRole("landlord"), upload.array("images", 5), addUnit); // Auth required for creating

router
  .route("/:id")
  .get(getUnit) // Public access for viewing individual units
  .patch(protect, checkRole("landlord"), upload.array("images", 5), updateUnit) // Auth required for updating
  .delete(protect, checkRole("landlord"), deleteUnit); // Auth required for deleting

router.delete("/:id/image", protect, checkRole("landlord"), deleteUnitImage);

// Test route for debugging
router.get("/test/database", testDatabase);

module.exports = router;
