const asyncWrapper = require("../middlewares/asyncWrapper.middleware");
const Unit = require("../models/unit.model");
const httpStatusText = require("../utils/httpStatusText");
const appError = require("../utils/appError");
const { validationResult } = require("express-validator");
const uploadToCloudinary = require("../utils/uploadtoCloudinary");
const deleteFromCloudinary = require("../utils/deleteFromCloudinary");
const extractPublicId = require("../utils/extractPublicId");
const notificationService = require("../services/notification.service");
const User = require("../models/user.model");
const Lease = require("../models/lease.model");

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
    status: { $in: ["available", "approved"] }, // دعم مؤقت للشقق القديمة
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

  // Enforce plan unit limit for landlords
  const user = req.user;
  if (user.role === 'landlord') {
    // Fetch latest user data (in case plan changed)
    const landlord = await require('../models/user.model').findById(user._id);
    if (!landlord.subscriptionPlan || !landlord.isSubscribed) {
      return next(appError.create('يجب الاشتراك في خطة لإضافة وحدة.', 403, httpStatusText.FAIL));
    }
    // Find the current active subscription
    const Subscription = require('../models/subscription.model');
    const activeSub = await Subscription.findOne({
      landlordId: user._id,
      status: 'active',
      endDate: { $gte: new Date() }
    }).sort({ startDate: -1 });
    if (!activeSub) {
      return next(appError.create('لا يوجد اشتراك نشط.', 403, httpStatusText.FAIL));
    }
    // Prevent adding units if subscription is expired
    if (activeSub.status === 'expired') {
      return next(appError.create('لقد وصلت للحد الأقصى للوحدات في خطتك. لا يمكنك إضافة وحدات جديدة حتى يقوم احد المشرفين بمراجهة وحداتك المرفوعة بالفعل .', 403, httpStatusText.FAIL));
    }
    // Count all units for this subscription (including pending)
    const totalCount = await Unit.countDocuments({ ownerId: user._id, subscriptionId: activeSub._id, status: { $in: ['available', 'booked', 'approved', 'pending'] } });
    if (activeSub.unitLimit && totalCount >= activeSub.unitLimit) {
      return next(appError.create('لقد وصلت للحد الأقصى للوحدات في خطتك. لا يمكنك إضافة وحدات جديدة حتى يتم رفض أو حذف وحدة.', 403, httpStatusText.FAIL));
    }
    req.activeSub = activeSub; // Pass to next step
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
    images: uploadedImageUrls.map(url => ({ url, status: 'pending' })),
    ownerId: req.user._id, // Set the owner ID from authenticated user
    subscriptionId: req.activeSub ? req.activeSub._id : undefined,
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
    const oldImagePublicIds = unit.images.map((img) => extractPublicId(img.url));

    await Promise.all(oldImagePublicIds.map((id) => deleteFromCloudinary(id)));

    const newImageUrls = await Promise.all(
      files.map((file) => uploadToCloudinary(file.buffer, "LeaseMate/units"))
    );
    
    // إذا كانت الوحدة مرفوضة وتم رفع صور جديدة، قم بتغيير حالة الصور إلى pending
    // وإعادة الوحدة إلى حالة pending للمراجعة
    if (unit.status === "rejected") {
      updates.images = newImageUrls.map(url => ({ url, status: "pending" }));
      updates.status = "pending";
      updates.rejectionReason = ""; // مسح سبب الرفض السابق
    } else {
      updates.images = newImageUrls.map(url => ({ url, status: "pending" }));
    }
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

  const publicIds = unit.images.map((img) => extractPublicId(img.url));
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

  const imageIndex = unit.images.findIndex(img => img.url === imageUrl);
  if (imageIndex === -1) {
    return next(
      appError.create("Image not found in unit", 404, httpStatusText.FAIL)
    );
  }

  const publicId = extractPublicId(imageUrl);
  await deleteFromCloudinary(publicId);

  unit.images.splice(imageIndex, 1);
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

// جلب كل الشقق التي بها صور قيد المراجعة (pending)
const getPendingUnitImages = asyncWrapper(async (req, res) => {
  // اجلب كل الشقق التي بها صورة واحدة على الأقل حالتها pending
  const units = await Unit.find(
    { "images.status": "pending" },
    {
      images: 1,
      name: 1,
      ownerId: 1,
      _id: 1,
    }
  ).populate("ownerId", "name phone username");

  // لكل شقة، اجلب فقط الصور pending
  const pendingUnits = units
    .map((unit) => ({
      unitId: unit._id,
      unitName: unit.name,
      owner: unit.ownerId,
      images: unit.images.filter((img) => img.status === "pending"),
    }))
    .filter((unit) => unit.images.length > 0);

  res
    .status(200)
    .json({ status: httpStatusText.SUCCESS, data: { pendingUnits } });
});

// جلب كل الشقق المعلقة مع تفاصيلها الكاملة
const getPendingUnitsWithDetails = asyncWrapper(async (req, res) => {
  // اجلب كل الشقق التي بها صورة واحدة على الأقل حالتها pending
  const units = await Unit.find(
    { "images.status": "pending" }
  ).populate("ownerId", "name phone username email verificationStatus");

  // لكل شقة، اجلب فقط الصور pending مع تفاصيل الوحدة الكاملة
  const pendingUnits = units
    .map((unit) => ({
      unitId: unit._id,
      unitName: unit.name,
      description: unit.description,
      pricePerMonth: unit.pricePerMonth,
      securityDeposit: unit.securityDeposit,
      address: unit.address,
      city: unit.city,
      governorate: unit.governorate,
      postalCode: unit.postalCode,
      numRooms: unit.numRooms,
      space: unit.space,
      type: unit.type,
      isFurnished: unit.isFurnished,
      hasPool: unit.hasPool,
      hasAC: unit.hasAC,
      hasTV: unit.hasTV,
      hasWifi: unit.hasWifi,
      hasKitchenware: unit.hasKitchenware,
      hasHeating: unit.hasHeating,
      status: unit.status,
      rejectionReason: unit.rejectionReason,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
      owner: unit.ownerId,
      images: unit.images.filter((img) => img.status === "pending"),
    }))
    .filter((unit) => unit.images.length > 0);

  res
    .status(200)
    .json({ status: httpStatusText.SUCCESS, data: { pendingUnits } });
});

// موافقة الأدمن على كل صور الشقة دفعة واحدة
const approveAllUnitImages = asyncWrapper(async (req, res, next) => {
  const { unitId } = req.body;
  const unit = await Unit.findById(unitId).populate("ownerId", "name");
  if (!unit) {
    return next(appError.create("Unit not found", 404, httpStatusText.FAIL));
  }
  let updated = false;
  unit.images.forEach((img) => {
    if (img.status === "pending") {
      img.status = "approved";
      updated = true;
    }
  });
  if (updated) {
    if (
      unit.images.length > 0 &&
      unit.images.every((img) => img.status === "approved")
    ) {
      unit.status = "available";
      unit.rejectionReason = "";
      await unit.save();

      // إشعار للمالك
      const notification = await notificationService.createNotification({
        userId: unit.ownerId._id,
        title: "تمت الموافقة على إعلانك",
        message: `تمت الموافقة على إعلان وحدتك (${unit.name}) وأصبح الآن ظاهرًا للمستخدمين.`,
        type: "GENERAL",
      });
      // إرسال socket إذا متاح
      const io = req.app.get("io");
      if (io) {
        io.to(unit.ownerId._id.toString()).emit(
          "newNotification",
          notification
        );
      }
    } else {
      await unit.save();
    }
  }
  res.status(200).json({ status: httpStatusText.SUCCESS, data: { unit } });
});
// رفض الأدمن لكل صور الشقة دفعة واحدة مع سبب
const rejectAllUnitImages = asyncWrapper(async (req, res, next) => {
  const { unitId, reason } = req.body;
  const unit = await Unit.findById(unitId).populate("ownerId", "name");
  if (!unit) {
    return next(appError.create("Unit not found", 404, httpStatusText.FAIL));
  }
  let updated = false;
  unit.images.forEach((img) => {
    if (img.status === "pending") {
      img.status = "rejected";
      updated = true;
    }
  });
  if (updated) {
    if (unit.images.every((img) => img.status === "rejected")) {
      unit.status = "rejected";
      unit.rejectionReason = reason || "";
      await unit.save();

      // إشعار للمالك مع رابط التعديل
      const notification = await notificationService.createNotification({
        userId: unit.ownerId._id,
        title: "تم رفض إعلانك",
        message: `تم رفض إعلان وحدتك (${unit.name}). السبب: ${
          reason || "غير محدد"
        }. انقر هنا لتعديل الوحدة وإعادة رفعها.`,
        type: "UNIT_REJECTED",
        link: `/unit/${unit._id}/manage`,
      });
      // إرسال socket إذا متاح
      const io = req.app.get("io");
      if (io) {
        io.to(unit.ownerId._id.toString()).emit(
          "newNotification",
          notification
        );
      }
    } else {
      await unit.save();
    }
  }
  res.status(200).json({ status: httpStatusText.SUCCESS, data: { unit } });
});

// مراجعة صورة (موافقة أو رفض)
const reviewUnitImage = asyncWrapper(async (req, res, next) => {
  const { unitId, imageUrl } = req.body;
  const { action } = req.query; // 'approve' or 'reject'
  if (!unitId || !imageUrl || !["approve", "reject"].includes(action)) {
    return next(appError.create("بيانات غير مكتملة", 400, httpStatusText.FAIL));
  }
  const unit = await Unit.findById(unitId);
  if (!unit) {
    return next(appError.create("Unit not found", 404, httpStatusText.FAIL));
  }
  const img = unit.images.find((img) => img.url === imageUrl);
  if (!img) {
    return next(appError.create("Image not found", 404, httpStatusText.FAIL));
  }
  img.status = action === "approve" ? "approved" : "rejected";
  await unit.save();
  res
    .status(200)
    .json({ status: httpStatusText.SUCCESS, data: { image: img, unitId } });
});

// موافقة الأدمن على الشقة
const approveUnit = asyncWrapper(async (req, res, next) => {
  const { unitId } = req.body;
  const unit = await Unit.findById(unitId).populate("ownerId", "name");
  if (!unit) {
    return next(appError.create("Unit not found", 404, httpStatusText.FAIL));
  }
  unit.status = "approved";
  unit.rejectionReason = "";
  await unit.save();

  // إشعار للمالك
  const notification = await notificationService.createNotification({
    userId: unit.ownerId._id,
    title: "تمت الموافقة على إعلانك",
    message: `تمت الموافقة على إعلان وحدتك (${unit.name}) وأصبح الآن ظاهرًا للمستخدمين.`,
    type: "GENERAL",
  });
  // إرسال socket إذا متاح
  const io = req.app.get("io");
  if (io) {
    io.to(unit.ownerId._id.toString()).emit("newNotification", notification);
    io.to(unit.ownerId._id.toString()).emit("unitStatusChanged", {
      unitId: unit._id,
      status: unit.status,
    });
  }

  res.status(200).json({ status: httpStatusText.SUCCESS, data: { unit } });
});

// رفض الأدمن للشقة مع سبب
const rejectUnit = asyncWrapper(async (req, res, next) => {
  const { unitId, reason } = req.body;
  const unit = await Unit.findById(unitId).populate("ownerId", "name");
  if (!unit) {
    return next(appError.create("Unit not found", 404, httpStatusText.FAIL));
  }
  unit.status = "rejected";
  unit.rejectionReason = reason || "";
  await unit.save();

  // إشعار للمالك مع رابط التعديل
  const notification = await notificationService.createNotification({
    userId: unit.ownerId._id,
    title: "تم رفض إعلانك",
    message: `تم رفض إعلان وحدتك (${unit.name}). السبب: ${
      reason || "غير محدد"
    }. انقر هنا لتعديل الوحدة وإعادة رفعها.`,
    type: "UNIT_REJECTED",
    link: `/unit/${unit._id}/manage`,
  });
  // إرسال socket إذا متاح
  const io = req.app.get("io");
  if (io) {
    io.to(unit.ownerId._id.toString()).emit("newNotification", notification);
    io.to(unit.ownerId._id.toString()).emit("unitStatusChanged", {
      unitId: unit._id,
      status: unit.status,
    });
  }

  res.status(200).json({ status: httpStatusText.SUCCESS, data: { unit } });
});

// إعادة إرسال الوحدة المرفوضة للمراجعة
const resubmitRejectedUnit = asyncWrapper(async (req, res, next) => {
  const { unitId } = req.params;
  const unit = await Unit.findById(unitId);
  if (!unit) {
    return next(appError.create("Unit not found", 404, httpStatusText.FAIL));
  }

  // التأكد أن الوحدة مرفوضة
  if (unit.status !== "rejected") {
    return next(appError.create("Unit is not rejected", 400, httpStatusText.FAIL));
  }

  // تغيير حالة الوحدة إلى pending
  unit.status = "pending";
  unit.rejectionReason = "";
  
  // تغيير حالة جميع الصور إلى pending
  unit.images.forEach((img) => {
    if (img.status === "rejected") {
      img.status = "pending";
    }
  });

  await unit.save();

  res.status(200).json({ 
    status: httpStatusText.SUCCESS, 
    data: { unit },
    message: "Unit resubmitted for review successfully"
  });
});

// Add this endpoint to check if the user can add a unit
const canAddUnit = asyncWrapper(async (req, res, next) => {
  const user = req.user;
  if (user.role !== 'landlord') {
    return res.status(403).json({
      status: httpStatusText.FAIL,
      canAdd: false,
      reason: 'Only landlords can add units.'
    });
  }
  // Fetch all units for this landlord
  const units = await Unit.find({ ownerId: user._id }).sort({ createdAt: -1 });
  // If no units, allow adding
  if (units.length === 0) {
    return res.json({ status: httpStatusText.SUCCESS, canAdd: true });
  }
  // Check last unit status
  const lastUnit = units[0];
  if (['pending', 'under maintenance'].includes(lastUnit.status)) {
    return res.json({
      status: httpStatusText.SUCCESS,
      canAdd: false,
      reason: lastUnit.status === 'pending' ?
        'لا يمكنك إضافة وحدة جديدة حتى يتم مراجعة وحدتك الحالية.' :
        'لا يمكنك إضافة وحدة جديدة أثناء وجود وحدة تحت الصيانة.'
    });
  }
  // Check plan limit
  const Subscription = require('../models/subscription.model');
  const activeSub = await Subscription.findOne({
    landlordId: user._id,
    status: 'active',
    endDate: { $gte: new Date() }
  }).sort({ startDate: -1 });
  if (!activeSub) {
    return res.json({
      status: httpStatusText.FAIL,
      canAdd: false,
      reason: 'يجب الاشتراك في خطة لإضافة وحدة.'
    });
  }
  const totalCount = await Unit.countDocuments({ ownerId: user._id, subscriptionId: activeSub._id, status: { $in: ['available', 'booked', 'approved', 'pending'] } });
  if (activeSub.unitLimit && totalCount >= activeSub.unitLimit) {
    return res.json({
      status: httpStatusText.SUCCESS,
      canAdd: false,
      reason: 'لقد وصلت للحد الأقصى للوحدات في خطتك. يرجى الاشتراك في خطة جديدة.'
    });
  }
  // Otherwise, allow adding
  return res.json({ status: httpStatusText.SUCCESS, canAdd: true });
});

// جلب الشقق المتاحة
const getAvailableUnits = asyncWrapper(async (req, res) => {
  const units = await Unit.find({ status: 'available' })
    .populate('ownerId', 'name phone email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { units }
  });
});

// جلب الشقق تحت الصيانة
const getMaintenanceUnits = asyncWrapper(async (req, res) => {
  const units = await Unit.find({ status: 'under maintenance' })
    .populate('ownerId', 'name phone email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { units }
  });
});

// جلب الشقق المحجوزة مع معلومات العقد
const getBookedUnits = asyncWrapper(async (req, res) => {
  const units = await Unit.find({ status: 'booked' })
    .populate('ownerId', 'name phone email')
    .sort({ createdAt: -1 });

  // جلب معلومات العقود لكل شقة محجوزة
  const unitsWithLeases = await Promise.all(
    units.map(async (unit) => {
      const lease = await Lease.findOne({ unitId: unit._id })
        .populate('tenantId', 'name phone email')
        .populate('landlordId', 'name phone email');
      
      return {
        ...unit.toObject(),
        lease: lease || null
      };
    })
  );

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { units: unitsWithLeases }
  });
});

module.exports = {
  getAllUnits,
  getUnit,
  addUnit,
  updateUnit,
  deleteUnit,
  deleteUnitImage,
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
};
