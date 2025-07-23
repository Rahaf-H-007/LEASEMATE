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
    governorate,
    hasAC,
    hasWifi,
    hasTV,
    hasKitchenware,
    hasHeating,
    hasPool,
    isFurnished,
  } = req.query;

  // Build filter object
  let filter = {
    status: "available", // Only get available units
  };

  // if (req.query.ownerId) {
  //   filter.ownerId = req.query.ownerId;
  // }

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

  if (governorate && governorate.trim()) {
    filter.governorate = governorate.trim();
  }

  if (minPrice || maxPrice) {
    filter.pricePerMonth = {};
    if (minPrice) filter.pricePerMonth.$gte = Number(minPrice);
    if (maxPrice) filter.pricePerMonth.$lte = Number(maxPrice);
  }

  // Add amenity filters
  if (hasAC === "true") filter.hasAC = true;
  if (hasWifi === "true") filter.hasWifi = true;
  if (hasTV === "true") filter.hasTV = true;
  if (hasKitchenware === "true") filter.hasKitchenware = true;
  if (hasHeating === "true") filter.hasHeating = true;
  if (hasPool === "true") filter.hasPool = true;

  // Handle furnished filter
  if (isFurnished === "true" || isFurnished === true) {
    filter.isFurnished = true;
  } else if (isFurnished === "false" || isFurnished === false) {
    filter.isFurnished = false;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get all units with filters applied (all units are from verified landlords)
  const allUnits = await Unit.find(filter)
    .populate("ownerId", "name phone username verificationStatus")
    .sort({ createdAt: -1 });

  let units = [];
  let total = 0;

  // If we have user location, sort by proximity (nearby first, then all others)
  if (lat && lng && (!search || search.trim() === "")) {
    // Helper function to calculate distance between two points in meters
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lng2 - lng1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    // Separate units into nearby and far
    const nearbyUnits = [];
    const farUnits = [];
    const radiusInMeters = Number(radius);

    allUnits.forEach((unit) => {
      if (unit.location && unit.location.coordinates) {
        const [unitLng, unitLat] = unit.location.coordinates;
        const distance = calculateDistance(
          Number(lat),
          Number(lng),
          unitLat,
          unitLng
        );

        if (distance <= radiusInMeters) {
          nearbyUnits.push(unit);
        } else {
          farUnits.push(unit);
        }
      } else {
        // Units without location go to far units
        farUnits.push(unit);
      }
    });

    // Combine: nearby first, then far units
    const sortedUnits = [...nearbyUnits, ...farUnits];
    units = sortedUnits.slice(skip, skip + Number(limit));
    total = sortedUnits.length;
  } else {
    // Regular search without location or with search term (search takes precedence)
    units = allUnits.slice(skip, skip + Number(limit));
    total = allUnits.length;
  }

  // Calculate total available units for display
  const totalAvailableUnits = allUnits.filter(
    (unit) => unit.status === "available"
  ).length;

  res.json({
    status: httpStatusText.SUCCESS,
    data: {
      units,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalUnits: total,
        totalAvailableUnits: totalAvailableUnits,
        limit: Number(limit),
      },
    },
  });
});

const getUnit = asyncWrapper(async (req, res, next) => {
  const unit = await Unit.findById(req.params.id).populate(
    "ownerId",
    "name phone username verificationStatus"
  );
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
    // Allow units without images
  }

  let uploadedImageUrls = [];
  if (req.files && req.files.length > 0) {
    const imageUploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, "LeaseMate/units")
    );
    uploadedImageUrls = await Promise.all(imageUploadPromises);
  }

  const unit = new Unit({
    ...req.body,
    images: uploadedImageUrls,
    ownerId: req.user._id, // Set the owner ID from authenticated user
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

const getMyUnits = asyncWrapper(async (req, res, next) => {
  if (!req.user || !req.user._id) {
    return next(
      appError.create("Unauthorized: user not found", 401, httpStatusText.FAIL)
    );
  }
  const userId = req.user._id;
  const units = await Unit.find({ ownerId: userId })
    .populate("ownerId", "name phone username verificationStatus")
    .sort({ createdAt: -1 });
  res.status(200).json({ status: httpStatusText.SUCCESS, data: { units } });
});

module.exports = {
  getAllUnits,
  getUnit,
  addUnit,
  updateUnit,
  deleteUnit,
  deleteUnitImage,
  getMyUnits,
};
