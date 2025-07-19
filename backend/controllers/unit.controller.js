const asyncWrapper = require("../middlewares/asyncWrapper.middleware");
const Unit = require("../models/unit.model");
const httpStatusText = require("../utils/httpStatusText");
const appError = require("../utils/appError");
const { validationResult } = require("express-validator");

const getAllUnits = asyncWrapper(async (req, res) => {
  const units = await Unit.find();
  res.json({ status: httpStatusText.SUCCESS, data: { units } });
});

const getUnit = asyncWrapper(async (req, res, next) => {
  const unit = await Unit.findById(req.params.id);
  if (!unit) {
    const error = appError.create("Unit not found", 404, httpStatusText.FAIL);
    return next(error);
  }
  res.status(200).json({ status: httpStatusText.SUCCESS, data: { unit } });
});

const addUnit = asyncWrapper(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = appError.create(errors.array(), 400, httpStatusText.FAIL);
    return next(error);
  }

  const unit = new Unit(req.body);
  await unit.save();

  res
    .status(201)
    .json({ status: httpStatusText.SUCCESS, data: { unit: unit } });
});

const updateUnit = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const unit = await Unit.findByIdAndUpdate(id, {
    $set: { ...req.body },
  });
  res.status(200).json({ status: httpStatusText.SUCCESS, data: { unit: unit } });
});

const deleteUnit = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  await Unit.findByIdAndDelete(id)
  res.status(200).json({status: httpStatusText.SUCCESS, data: null})
});

module.exports = { getAllUnits, getUnit, addUnit, updateUnit, deleteUnit };