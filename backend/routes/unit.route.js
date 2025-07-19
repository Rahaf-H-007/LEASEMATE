const express = require("express");
const router = express.Router();
const {
  getAllUnits,
  getUnit,
  addUnit,
  updateUnit,
  deleteUnit,
} = require("../controllers/unit.controller");

router.route("/").get(getAllUnits).post(addUnit);

router.route("/:id").get(getUnit).patch(updateUnit).delete(deleteUnit);

module.exports = router;
