const MaintenanceRequest = require('../models/maintenance.model');
const Unit = require('../models/unit.model');
const uploadToCloudinary = require('../utils/uploadtoCloudinary');
const User = require('../models/user.model');
const { onlineUsers } = require('../socket');
const notificationService = require('../services/notification.service');

// إضافة طلب صيانة جديد
exports.createRequest = async (req, res) => {
  try {
    console.log('🔧 Creating maintenance request...');
    console.log('📝 Request body:', req.body);
    console.log('👤 User:', req.user._id);
    
    const { tenantId, unitId, contractId, title, description } = req.body;
    let image = req.body.image;
    
    // لو فيه رفع صورة عبر middleware
    if (req.file) {
      console.log('📸 Uploading image to Cloudinary...');
      image = await uploadToCloudinary(req.file.buffer, 'maintenance');
      console.log('✅ Image uploaded:', image);
    }

    // إنشاء كائن الطلب مع الحقول المطلوبة فقط
    const requestData = {
      tenantId: tenantId || req.user._id, // استخدام معرف المستخدم الحالي إذا لم يتم توفير tenantId
      title,
      description,
      image
    };

    // إضافة unitId و contractId فقط إذا كانت متوفرة
    if (unitId) requestData.unitId = unitId;
    if (contractId) requestData.contractId = contractId;

    console.log('📋 Request data:', requestData);
    const request = await MaintenanceRequest.create(requestData);
    console.log('✅ Maintenance request created:', request._id);

    // Get the unit to find the landlord
    const unit = await Unit.findById(unitId);
    
    console.log('🏠 Unit found:', unit?._id);
    console.log('👤 Landlord ID:', unit?.ownerId);
    console.log('📡 Online users:', Object.keys(onlineUsers));
    
    if (!unit) {
      console.log('⚠️ Unit not found, but continuing with request creation');
    }
    
    if (unit && unit.ownerId) {
      console.log('🏠 Found unit and landlord:', unit.ownerId);
      
      // Create notification for landlord
      try {
        console.log('📧 Creating notification for landlord:', unit.ownerId);
        console.log('📧 Notification data:', {
          senderId: req.user._id,
          userId: unit.ownerId,
          title: 'طلب صيانة جديد',
          message: `لديك طلب صيانة جديد من المستأجر: ${title}`,
          type: 'MAINTENANCE_REQUEST',
          maintenanceRequestId: request._id,
          link: `/dashboard/maintenance-requests`
        });
        
        const notification = await notificationService.createNotification({
          senderId: req.user._id,
          userId: unit.ownerId,
          title: 'طلب صيانة جديد',
          message: `لديك طلب صيانة جديد من المستأجر: ${title}`,
          type: 'MAINTENANCE_REQUEST',
          maintenanceRequestId: request._id,
          link: `/dashboard/maintenance-requests`
        });

        console.log('✅ Notification created:', notification._id);
        console.log('✅ Full notification object:', notification);

        // Emit socket event immediately
        const io = req.app.get('io');
        if (io) {
          console.log('📡 Emitting newNotification to landlord:', unit.ownerId.toString());
          io.to(unit.ownerId.toString()).emit('newNotification', notification);
        } else {
          console.error('❌ Socket.io instance not available');
        }
      } catch (notificationError) {
        console.error('❌ Error creating landlord notification:', notificationError);
        // Don't fail the main request if notification fails
      }

      // Emit to landlord if online
      try {
        const landlordSocketId = onlineUsers[unit.ownerId.toString()];
        console.log('🏠 Landlord socket ID:', landlordSocketId);
        if (landlordSocketId) {
          console.log('📡 Emitting to landlord:', landlordSocketId);
          req.app.get('io').to(landlordSocketId).emit('maintenanceRequestCreated', {
            type: 'maintenanceRequestCreated',
            request: request,
            message: 'تم إنشاء طلب صيانة جديد'
          });
        }
      } catch (socketError) {
        console.error('❌ Error emitting to landlord:', socketError);
      }
    }

    // Emit to tenant if online
    try {
      const tenantSocketId = onlineUsers[req.user._id.toString()];
      console.log('👤 Tenant socket ID:', tenantSocketId);
      if (tenantSocketId) {
        console.log('📡 Emitting to tenant:', tenantSocketId);
        req.app.get('io').to(tenantSocketId).emit('maintenanceRequestCreated', {
          type: 'maintenanceRequestCreated',
          request: request,
          message: 'تم إرسال طلب الصيانة بنجاح'
        });
      }
    } catch (socketError) {
      console.error('❌ Error emitting to tenant:', socketError);
    }

    res.status(201).json({ message: 'تم إرسال طلب الصيانة بنجاح', request });
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء إرسال الطلب', error: error.message });
  }
};

// جلب كل الطلبات (يمكن تخصيصها لاحقًا)
exports.getAllRequests = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'tenant') {
      filter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      const units = await Unit.find({ ownerId: req.user._id }, '_id');
      const unitIds = units.map(unit => unit._id);
      filter.unitId = { $in: unitIds };
    } else {
      // Other roles (e.g., admin) get nothing
      return res.status(403).json({ message: 'Not authorized to view maintenance requests' });
    }
    const requests = await MaintenanceRequest.find(filter).sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الطلبات', error });
  }
};

// تحديث حالة الطلب وإضافة ملاحظة
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const request = await MaintenanceRequest.findByIdAndUpdate(
      id,
      { status, notes },
      { new: true }
    );
    if (!request) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }

    // Create notification for tenant
    try {
      const statusText = status === 'pending' ? 'قيد الانتظار' : 
                        status === 'in progress' ? 'جاري التنفيذ' : 'تم الحل';
      
      console.log('📧 Creating notification for tenant:', request.tenantId);
      const notification = await notificationService.createNotification({
        senderId: req.user._id,
        userId: request.tenantId,
        title: 'تحديث طلب الصيانة',
        message: `تم تحديث حالة طلب الصيانة "${request.title}" إلى: ${statusText}`,
        type: 'MAINTENANCE_UPDATE',
        maintenanceRequestId: request._id,
        link: `/dashboard/maintenance-requests`
      });

      console.log('✅ Notification created:', notification._id);

      // Emit socket event immediately
      const io = req.app.get('io');
      if (io) {
        console.log('📡 Emitting newNotification to tenant:', request.tenantId.toString());
        io.to(request.tenantId.toString()).emit('newNotification', notification);
      } else {
        console.error('❌ Socket.io instance not available');
      }
    } catch (notificationError) {
      console.error('Error creating tenant notification:', notificationError);
    }

    // Emit to tenant if online
    const tenantSocketId = onlineUsers[request.tenantId.toString()];
    console.log('👤 Tenant socket ID for update:', tenantSocketId);
    if (tenantSocketId) {
      console.log('📡 Emitting update to tenant:', tenantSocketId);
      req.app.get('io').to(tenantSocketId).emit('maintenanceRequestUpdated', {
        type: 'maintenanceRequestUpdated',
        request: request,
        message: `تم تحديث حالة الطلب إلى: ${status === 'pending' ? 'قيد الانتظار' : status === 'in progress' ? 'جاري التنفيذ' : 'تم الحل'}`
      });
    }

    // Get the unit to find the landlord
    const unit = await Unit.findById(request.unitId);
    
    console.log('🏠 Unit found for update:', unit?._id);
    console.log('👤 Landlord ID for update:', unit?.ownerId);
    
    if (unit && unit.ownerId) {
      // Emit to landlord if online
      const landlordSocketId = onlineUsers[unit.ownerId.toString()];
      console.log('🏠 Landlord socket ID for update:', landlordSocketId);
      if (landlordSocketId) {
        console.log('📡 Emitting update to landlord:', landlordSocketId);
        req.app.get('io').to(landlordSocketId).emit('maintenanceRequestUpdated', {
          type: 'maintenanceRequestUpdated',
          request: request,
          message: `تم تحديث حالة الطلب إلى: ${status === 'pending' ? 'قيد الانتظار' : status === 'in progress' ? 'جاري التنفيذ' : 'تم الحل'}`
        });
      }
    }

    res.status(200).json({ message: 'تم تحديث حالة الطلب', request });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث الطلب', error });
  }
}; 
