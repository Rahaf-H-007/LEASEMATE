const asyncWrapper = require("../middlewares/asyncWrapper.middleware");
const Unit = require("../models/unit.model");
const httpStatusText = require("../utils/httpStatusText");
const appError = require("../utils/appError");
const { validationResult } = require("express-validator");
const uploadToCloudinary = require("../utils/uploadtoCloudinary");
const deleteFromCloudinary = require("../utils/deleteFromCloudinary");
const extractPublicId = require("../utils/extractPublicId");

const getAllUnits = asyncWrapper(async (req, res) => {
  const {
    search,
    type,
    minPrice,
    maxPrice,
    page = 1,
    limit = 10,
    lat,
    lng,
    radius = 50,
  } = req.query;

  // Build filter object
  let filter = {};

  if (search && search.trim()) {
    // Escape special regex characters to prevent regex errors
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filter.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { description: { $regex: escapedSearch, $options: "i" } },
      { address: { $regex: escapedSearch, $options: "i" } },
      { city: { $regex: escapedSearch, $options: "i" } },
      { governorate: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  if (type) {
    filter.type = type;
  }

  if (minPrice || maxPrice) {
    filter.pricePerMonth = {};
    if (minPrice) filter.pricePerMonth.$gte = Number(minPrice);
    if (maxPrice) filter.pricePerMonth.$lte = Number(maxPrice);
  }

  // Location-based filtering with fallback logic
  let locationQuery = null;
  if (lat && lng && (!search || search.trim() === "")) {
    // Only apply location filter if no search term
    // Convert radius from meters to radians (Earth radius ≈ 6378100 meters)
    const radiusInRadians = Number(radius) / 6378100;

    locationQuery = {
      location: {
        $geoWithin: {
          $centerSphere: [[Number(lng), Number(lat)], radiusInRadians],
        },
      },
    };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  let units = [];
  let total = 0;

  // Try location-based search first if coordinates provided and no search term
  if (locationQuery) {
    const locationFilter = { ...filter, ...locationQuery };
    units = await Unit.find(locationFilter).limit(Number(limit)).skip(skip);
    total = await Unit.countDocuments(locationFilter);

    // If no units found nearby, try governorate/city fallback
    if (units.length === 0) {
      console.log("No units found nearby, trying governorate/city fallback...");

      // Try to find units in the same governorate (need a reverse geocoding service for this)
      // For now, we'll search for units in major cities as fallback
      const fallbackFilter = {
        ...filter,
        $or: [
          { governorate: "القاهرة" },
          { governorate: "الجيزة" },
          { governorate: "الإسكندرية" },
        ],
      };

      units = await Unit.find(fallbackFilter)
        .limit(Number(limit))
        .skip(skip)
        .sort({ createdAt: -1 });
      total = await Unit.countDocuments(fallbackFilter);
    }
  } else {
    // Regular search without location or with search term (search takes precedence)
    units = await Unit.find(filter)
      .limit(Number(limit))
      .skip(skip)
      .sort({ createdAt: -1 });
    total = await Unit.countDocuments(filter);
  }

  res.json({
    status: httpStatusText.SUCCESS,
    data: {
      units,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalUnits: total,
        limit: Number(limit),
      },
    },
  });
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

  if (!req.files || req.files.length === 0) {
    return next(
      appError.create(
        "At least one image is required",
        400,
        httpStatusText.FAIL
      )
    );
  }

  const imageUploadPromises = req.files.map((file) =>
    uploadToCloudinary(file.buffer, "LeaseMate/units")
  );

  const uploadedImageUrls = await Promise.all(imageUploadPromises);

  const unit = new Unit({
    ...req.body,
    images: uploadedImageUrls,
  });

  await unit.save();

  res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { unit },
  });
});

const updateUnit = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;
  const files = req.files;

  const unit = await Unit.findById(id);
  if (!unit) {
    return next(appError.create("Unit not found", 404, httpStatusText.FAIL));
  }

  // If new images are uploaded, delete old ones first
  if (files && files.length > 0) {
    const oldImagePublicIds = unit.images.map((url) => extractPublicId(url));

    await Promise.all(oldImagePublicIds.map((id) => deleteFromCloudinary(id)));

    const newImageUrls = await Promise.all(
      files.map((file) => uploadToCloudinary(file.buffer, "LeaseMate/units"))
    );
    updates.images = newImageUrls;
  }

  Object.assign(unit, updates);
  await unit.save();

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { unit },
  });
});

const deleteUnit = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const unit = await Unit.findById(id);
  if (!unit) {
    return next(appError.create("Unit not found", 404, httpStatusText.FAIL));
  }

  const publicIds = unit.images.map((url) => extractPublicId(url));
  await Promise.all(publicIds.map((id) => deleteFromCloudinary(id)));

  await unit.deleteOne();

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: "Unit and images deleted successfully",
  });
});

const deleteUnitImage = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { imageUrl } = req.body;

  const unit = await Unit.findById(id);
  if (!unit) {
    return next(appError.create("Unit not found", 404, httpStatusText.FAIL));
  }

  if (!unit.images.includes(imageUrl)) {
    return next(
      appError.create("Image not found in unit", 404, httpStatusText.FAIL)
    );
  }

  const publicId = extractPublicId(imageUrl);
  await deleteFromCloudinary(publicId);

  unit.images = unit.images.filter((url) => url !== imageUrl);
  await unit.save();

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: "Image deleted successfully",
    data: { images: unit.images },
  });
});

module.exports = {
  getAllUnits,
  getUnit,
  addUnit,
  updateUnit,
  deleteUnit,
  deleteUnitImage,
};
