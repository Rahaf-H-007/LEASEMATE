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
    units = await Unit.find(locationFilter)
      .populate('ownerId', 'name email phone') // Populate owner details
      .limit(Number(limit))
      .skip(skip);
    total = await Unit.countDocuments(locationFilter);

    // If no units found nearby, try governorate/city fallback
    if (units.length === 0) {
      // Try to find units in the same governorate (need a reverse geocoding service for this)
      // For now, we'll search for units in major cities as fallback
      const fallbackFilter = {
        ...filter,
        $or: [
          { governorate: "القاهرة" },
          { governorate: "الجيزة" },
          { governorate: "الإسكندرية" },
          { governorate: "Cairo" }, // English versions
          { governorate: "Giza" },
          { governorate: "Alexandria" },
        ],
      };

      units = await Unit.find(fallbackFilter)
        .populate('ownerId', 'name email phone') // Populate owner details
        .limit(Number(limit))
        .skip(skip)
        .sort({ createdAt: -1 });
      total = await Unit.countDocuments(fallbackFilter);
      
      // If still no results, show all units
      if (units.length === 0) {
        units = await Unit.find(filter)
          .populate('ownerId', 'name email phone')
          .limit(Number(limit))
          .skip(skip)
          .sort({ createdAt: -1 });
        total = await Unit.countDocuments(filter);
      }
    }
  } else {
    // Regular search without location or with search term (search takes precedence)
    units = await Unit.find(filter)
      .populate('ownerId', 'name email phone') // Populate owner details
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
  const unit = await Unit.findById(req.params.id).populate('ownerId', 'name email phone');
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
    // For testing, allow units without images
    console.log("No images provided, creating unit without images for testing");
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

  console.log("=== ADD UNIT DEBUG ===");
  console.log("Unit to be saved:", unit);
  console.log("Owner ID:", req.user._id);
  console.log("======================");

  await unit.save();

  console.log("Unit saved successfully with ID:", unit._id);

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

// Test endpoint to check database
const testDatabase = asyncWrapper(async (req, res) => {
  console.log("=== DATABASE TEST ===");
  
  try {
    const totalUnits = await Unit.countDocuments();
    const allUnits = await Unit.find().limit(5).populate('ownerId', 'name email phone');
    
    console.log("Total units in database:", totalUnits);
    console.log("Sample units with populated owner:", allUnits.map(u => ({ 
      id: u._id, 
      name: u.name, 
      ownerId: u.ownerId,
      governorate: u.governorate,
      createdAt: u.createdAt 
    })));
    
    // Find the specific unit you created
    const yourUnit = await Unit.findOne({ name: "فيلا جامدة معلش" }).populate('ownerId', 'name email phone');
    console.log("Your unit details:", yourUnit);
    
    // Also search for units by partial name match
    const recentUnits = await Unit.find().sort({ createdAt: -1 }).limit(3).populate('ownerId', 'name email phone');
    console.log("Most recent units:", recentUnits.map(u => ({ 
      id: u._id, 
      name: u.name, 
      ownerId: u.ownerId,
      governorate: u.governorate,
      createdAt: u.createdAt 
    })));
    
    res.json({
      status: httpStatusText.SUCCESS,
      data: {
        totalUnits,
        sampleUnits: allUnits,
        yourUnit: yourUnit,
        recentUnits: recentUnits
      }
    });
  } catch (error) {
    console.error("Database test error:", error);
    res.status(500).json({
      status: httpStatusText.ERROR,
      message: error.message
    });
  }
});

module.exports = {
  getAllUnits,
  getUnit,
  addUnit,
  updateUnit,
  deleteUnit,
  deleteUnitImage,
  testDatabase,
};
