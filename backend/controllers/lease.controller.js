const Lease = require("../models/lease.model");
const BookingRequest = require("../models/booking-request.model");
const puppeteer = require('puppeteer');
const Unit = require("../models/unit.model");
const notificationService = require('../services/notification.service');

const createLease = async (req, res) => {
  // console.log("=== CREATE LEASE DEBUG ===");
  // console.log("URL:", req.url);
  // console.log("Method:", req.method);
  // console.log("Params:", req.params);
  // console.log("Body:", req.body);
  // console.log("User:", req.user);
  // console.log("==========================");
  
  try {
    const { bookingId } = req.params;
    const {
      startDate,
      endDate,
      paymentTerms
    } = req.body;

    console.log("BookingId:", bookingId);
    console.log("Lease data:", { startDate, endDate, paymentTerms });

    // جلب بيانات الحجز مع جميع بيانات الوحدة المطلوبة
    const booking = await BookingRequest.findById(bookingId).populate({
      path: "unitId",
      select: "pricePerMonth securityDeposit name type description images ownerId numRooms space isFurnished address location city governorate postalCode hasPool hasAC hasTV hasWifi hasKitchenware hasHeating status"
    });

    if (!booking || booking.status !== "pending") {
      return res.status(400).json({ message: "Invalid booking." });
    }

    // جلب سعر الإيجار وسعر التأمين من بيانات الوحدة
    const rentAmount = booking.unitId.pricePerMonth;
    const depositAmount = booking.unitId.securityDeposit;

    // mark booking as accepted
    booking.status = "accepted";
    await booking.save();

    const lease = new Lease({
      tenantId: booking.tenantId,
      landlordId: req.user._id,
      unitId: booking.unitId._id,
      rentAmount,
      depositAmount,
      startDate,
      endDate,
      paymentTerms,
      status: "pending" // تعيين الحالة للعقود الجديدة
    });

    await lease.save();

    // ربط العقد بالـBookingRequest (اختياري)
    booking.leaseId = lease._id;
    await booking.save();

    // تحديث حالة الوحدة إلى 'booked'
    await Unit.findByIdAndUpdate(booking.unitId._id, { status: "booked" });

    // Send notification to tenant about lease approval
    const notification = await notificationService.createNotification({
      userId: booking.tenantId,
      senderId: req.user._id,
      leaseId: lease._id,
      type: 'LEASE_APPROVED',
      title: 'لقد تم الموافقه علي طلب الايجار',
      message: 'لقد تم الموافقه علي طلب الايجار يمكنك الاطلاع علي العقد',
      link: `/dashboard/lease/${lease._id}`,
      isRead: false
    });
    // Emit notification via socket.io
    const io = req.app.get('io');
    if (io) {
      console.log('📡 Emitting newNotification to tenant:', booking.tenantId.toString());
      const populatedNotification = await notification.populate('senderId', 'name avatarUrl');
      io.to(booking.tenantId.toString()).emit('newNotification', populatedNotification);
      console.log('✅ Lease approval notification emitted successfully');
    } else {
      console.error('❌ Socket.io instance not available');
    }

    console.log("Lease created successfully:", lease._id);
    res.status(201).json({ message: "Lease created.", lease });
  } catch (err) {
    console.error("Create lease error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getMyLease = async (req, res) => {
  try {
    const lease = await Lease.findOne({ tenantId: req.user._id }).populate("unitId");
    if (!lease) return res.status(404).json({ message: "No lease found." });

    res.json(lease);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMyLeases = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'landlord') {
      query = { landlordId: req.user._id };
    } else if (req.user.role === 'tenant') {
      query = { tenantId: req.user._id };
    }

    // Pagination
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 5;
    const skip = (page - 1) * limit;

    const totalLeases = await Lease.countDocuments(query);
    const totalPages = Math.ceil(totalLeases / limit);

    const leases = await Lease.find(query)
      .populate('tenantId', 'name phone')
      .populate('landlordId', 'name phone')
      .populate('unitId')
      .skip(skip)
      .limit(limit);

    res.json({
      status: 'success',
      data: {
        leases,
        pagination: {
          currentPage: page,
          totalPages,
          totalLeases,
          limit
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// توليد وتحميل عقد الإيجار PDF
const generateLeasePDF = async (req, res) => {
  try {
    // console.log('=== GENERATE PDF START ===');
    const { leaseId } = req.params;
    console.log('LeaseId:', leaseId);
    
    const lease = await Lease.findById(leaseId)
      .populate('tenantId', 'name phone')
      .populate('landlordId', 'name phone')
      .populate('unitId');

    if (!lease) {
      console.log('Lease not found');
      return res.status(404).json({ message: 'لم يتم العثور على العقد.' });
    }

    // console.log('Lease found:', lease._id);
    // console.log('Landlord:', lease.landlordId?.name);
    // console.log('Tenant:', lease.tenantId?.name);

    // إنشاء HTML content بسيط
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>عقد إيجار</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            text-align: center; 
            font-size: 24px; 
            font-weight: bold;
            margin-bottom: 30px; 
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
          }
          .section { 
            margin: 20px 0; 
            padding: 15px;
            border: 1px solid #ccc;
          }
          .title { 
            font-weight: bold; 
            margin-bottom: 10px; 
            font-size: 16px;
          }
          .info { 
            margin: 5px 0; 
            font-size: 14px;
          }
          .signature-section {
            margin-top: 40px;
            border-top: 2px solid #000;
            padding: 20px;
          }
          .signature-box {
            text-align: center;
            margin: 10px 0;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            width: 200px;
            margin: 10px auto;
            height: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">عقد إيجار وحدة سكنية</div>
        
        <div class="section">
          <div class="title">الطرف الأول (المالك):</div>
          <div class="info">الاسم: ${lease.landlordId?.name || 'غير محدد'}</div>
          <div class="info">رقم الهاتف: ${lease.landlordId?.phone || 'غير محدد'}</div>
        </div>
        
        <div class="section">
          <div class="title">الطرف الثاني (المستأجر):</div>
          <div class="info">الاسم: ${lease.tenantId?.name || 'غير محدد'}</div>
          <div class="info">رقم الهاتف: ${lease.tenantId?.phone || 'غير محدد'}</div>
        </div>
        
        <div class="section">
          <div class="title">بيانات الوحدة:</div>
          <div class="info">اسم الوحدة: ${lease.unitId?.name || 'غير محدد'}</div>
          <div class="info">العنوان: ${lease.unitId?.address || 'غير محدد'}</div>
          <div class="info">النوع: ${lease.unitId?.type || 'غير محدد'}</div>
        </div>
        
        <div class="section">
          <div class="title">بيانات العقد:</div>
          <div class="info">قيمة الإيجار الشهري: ${lease.rentAmount} جنيه مصري</div>
          <div class="info">قيمة التأمين: ${lease.depositAmount} جنيه مصري</div>
          <div class="info">تاريخ بداية العقد: ${lease.startDate ? new Date(lease.startDate).toLocaleDateString('ar-EG') : 'غير محدد'}</div>
          <div class="info">تاريخ نهاية العقد: ${lease.endDate ? new Date(lease.endDate).toLocaleDateString('ar-EG') : 'غير محدد'}</div>
          <div class="info">شروط الدفع: ${lease.paymentTerms || 'غير محدد'}</div>
        </div>
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="title">توقيع الطرف الأول (المالك)</div>
            <div class="signature-line"></div>
            <div class="info">${lease.landlordId?.name || 'غير محدد'}</div>
          </div>
          <div class="signature-box">
            <div class="title">توقيع الطرف الثاني (المستأجر)</div>
            <div class="signature-line"></div>
            <div class="info">${lease.tenantId?.name || 'غير محدد'}</div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-style: italic;">
          <p>تم تحرير هذا العقد بين الطرفين ويخضع لأحكام القانون المصري.</p>
        </div>
      </body>
      </html>
    `;

    console.log('HTML content created, length:', htmlContent.length);

    // استخدام puppeteer لتحويل HTML إلى PDF
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    console.log('Browser launched, creating page...');
    const page = await browser.newPage();
    
    // تعيين viewport
    await page.setViewport({ width: 1200, height: 800 });
    
    // تحميل المحتوى
    console.log('Setting content...');
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // توليد PDF مباشرة
    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    // إغلاق المتصفح
    console.log('Closing browser...');
    await browser.close();

    // التحقق من حجم الـ PDF
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('فشل في توليد PDF');
    }

    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // إرسال الـ PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename=lease_${leaseId}.pdf`);
    res.setHeader('Cache-Control', 'no-cache');
    
    res.send(pdfBuffer);
    console.log('=== GENERATE PDF END ===');
    
  } catch (err) {
    console.error('=== LEASE PDF ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('========================');
    res.status(500).json({ error: 'حدث خطأ أثناء توليد ملف العقد.' });
  }
};

// رفض العقد من قبل المستأجر
const rejectLease = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const lease = await Lease.findById(id);
    if (!lease) {
      return res.status(404).json({ message: "Lease not found" });
    }
    // التأكد أن المستخدم هو المستأجر
    if (String(lease.tenantId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Unauthorized: Only the tenant can reject the lease." });
    }
    lease.status = "rejected";
    lease.rejectionReason = reason || "";
    await lease.save();
    // إعادة الوحدة إلى متاحة إذا تم رفض العقد
    await Unit.findByIdAndUpdate(lease.unitId, { status: "available" });
    // إرسال إشعار للمالك
    const notification = await notificationService.createNotification({
      userId: lease.landlordId,
      senderId: req.user._id,
      leaseId: lease._id,
      type: 'GENERAL',
      title: 'تم رفض العقد من قبل المستأجر',
      message: `قام المستأجر برفض العقد. السبب: ${reason || "لم يتم ذكر سبب"}`,
      link: `/dashboard/lease/${lease._id}`,
      isRead: false
    });
    // إرسال الإشعار عبر سوكيت
    const io = req.app.get('io');
    if (io) {
      const populatedNotification = await notification.populate('senderId', 'name avatarUrl');
      io.to(lease.landlordId.toString()).emit('newNotification', populatedNotification);
    }
    res.status(200).json({ message: "Lease rejected and reason sent to landlord." });
  } catch (err) {
    console.error("Reject lease error:", err);
    res.status(500).json({ error: err.message });
  }
};

// قبول العقد من قبل المستأجر
const acceptLease = async (req, res) => {
  try {
    const { id } = req.params;
    const lease = await Lease.findById(id);
    if (!lease) {
      return res.status(404).json({ message: "Lease not found" });
    }
    // التأكد أن المستخدم هو المستأجر
    if (String(lease.tenantId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Unauthorized: Only the tenant can accept the lease." });
    }
    if (lease.status !== "pending") {
      return res.status(400).json({ message: "Only pending leases can be accepted." });
    }
    lease.status = "active";
    await lease.save();
    res.status(200).json({ message: "Lease accepted and activated." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createLease,
  getMyLease,
  generateLeasePDF,
  getMyLeases,
  rejectLease,
  acceptLease
};
