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

    // إنشاء HTML content رسمي أبيض وأسود
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>عقد إيجار رسمي</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          
          body { 
            font-family: 'Cairo', Arial, sans-serif; 
            margin: 0;
            padding: 0;
            line-height: 1.6;
            color: #000;
            background: white;
          }
          
          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          
          .header { 
            text-align: center; 
            background: white;
            color: black;
            padding: 30px;
            margin: -20mm -20mm 20px -20mm;
            border-radius: 0;
            border-bottom: 2px solid black;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: bold;
            margin: 0 0 10px 0;
            color: black;
          }
          
          .header h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 5px 0;
            color: black;
          }
          
          .header h3 {
            font-size: 16px;
            margin: 0;
            color: black;
          }
          
          .contract-number {
            border-top: 2px solid black;
            padding-top: 15px;
            margin-top: 15px;
          }
          
          .official-stamp {
            position: absolute;
            top: 50px;
            right: 50px;
            width: 120px;
            height: 120px;
            border: 3px solid black;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            color: black;
            background: white;
            transform: rotate(-15deg);
            text-align: center;
            line-height: 1.2;
          }
          
          .section {
            margin: 20px 0;
            padding: 20px;
            border: 2px solid black;
            border-radius: 0;
            background: white;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 15px;
            text-align: center;
            color: black;
            border-bottom: 2px solid black;
            padding-bottom: 8px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          
          .info-item {
            margin: 8px 0;
            font-size: 14px;
            color: black;
          }
          
          .info-label {
            font-weight: bold;
            color: black;
          }
          
          .info-value {
            color: black;
            font-weight: 600;
          }
          
          .parties-section {
            display: block;
            margin: 20px 0;
          }
          
          .party-card {
            border: none;
            border-radius: 0;
            padding: 20px;
            background: white;
            margin-bottom: 20px;
          }
          
          .party-title {
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            margin-bottom: 15px;
            color: black;
            border-bottom: none;
            padding-bottom: 8px;
          }
          
          .clause-section {
            background: white;
            border: none;
            border-radius: 0;
            padding: 20px;
            margin: 20px 0;
          }
          
          .clause-title {
            font-weight: bold;
            font-size: 18px;
            text-align: center;
            margin-bottom: 15px;
            color: black;
            border-bottom: none;
            padding-bottom: 8px;
          }
          
          .clause-content {
            margin: 10px 0;
            padding: 8px;
            background: white;
            border-radius: 0;
            border-right: none;
            color: black;
            line-height: 1.6;
            text-align: right;
          }
          
          .signature-section {
            margin-top: 40px;
            border-top: 3px solid black;
            padding: 20px;
          }
          
          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          
          .signature-box {
            text-align: center;
            padding: 20px;
            border: 2px solid black;
            border-radius: 0;
            background: white;
          }
          
          .signature-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 15px;
            color: black;
          }
          
          .signature-line {
            border-bottom: 2px solid black;
            width: 200px;
            margin: 15px auto;
            height: 20px;
          }
          
          .signature-name {
            font-weight: bold;
            color: black;
            margin-top: 10px;
          }
          
          .signature-id {
            font-size: 12px;
            color: black;
            margin-top: 5px;
          }
          
          .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background: white;
            border-radius: 0;
            border: 2px solid black;
          }
          
          .footer-text {
            font-weight: bold;
            color: black;
            margin-bottom: 10px;
          }
          
          .footer-note {
            font-size: 12px;
            color: black;
            line-height: 1.4;
          }
          
          .total-amount {
            background: white;
            border: 2px solid black;
            border-radius: 0;
            padding: 15px;
            margin: 15px 0;
            text-align: center;
          }
          
          .amount-text {
            font-weight: bold;
            font-size: 16px;
            color: black;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 0;
            font-weight: bold;
            font-size: 12px;
            border: 1px solid black;
            background: white;
            color: black;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="official-stamp">
            <div>
              <div style="font-size: 10px;">جمهورية مصر العربية</div>
              <div style="font-size: 10px;">وزارة العدل</div>
              <div style="font-size: 10px;">مُوثق رسمياً</div>
            </div>
          </div>
          
          <div class="header">
            <h1>جمهورية مصر العربية</h1>
            <h2>وزارة العدل</h2>
            <h3>مكتب التوثيق الرسمي</h3>
            <div class="contract-number">
              <h2>عقد إيجار وحدة سكنية</h2>
              <p>رقم العقد: ${lease._id}</p>
              <p>تاريخ التحرير: ${new Date().toLocaleDateString('ar-EG')}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 20px 0; font-size: 16px; line-height: 1.6; color: black;">
            <p>أنه في يوم ${new Date().toLocaleDateString('ar-EG')} الموافق ${new Date().toLocaleDateString('ar-EG')} تم تحرير عقد إيجار الشقة بين كل من:</p>
          </div>
          
          <div class="parties-section">
            <div class="party-card">
              <div class="party-title">أولاً: السيد/…………………..المقيم/……………….رقم البطاقة الشخصية/………………….(طرف العقد الأول وهو المالك).</div>
              <div class="info-item">
                <span class="info-label">الاسم:</span>
                <span class="info-value">${lease.landlordId?.name || 'غير محدد'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">رقم الهاتف:</span>
                <span class="info-value">${lease.landlordId?.phone || 'غير محدد'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">الجنسية:</span>
                <span class="info-value">مصري</span>
              </div>
              <div class="info-item">
                <span class="info-label">رقم الهوية:</span>
                <span class="info-value">**********</span>
              </div>
            </div>
            
            <div class="party-card">
              <div class="party-title">ثانيًا: السيد/………………المقيم/…………………..رقم الرقم القومي/……………….(طرف ثاني وهو المستأجر).</div>
              <div class="info-item">
                <span class="info-label">الاسم:</span>
                <span class="info-value">${lease.tenantId?.name || 'غير محدد'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">رقم الهاتف:</span>
                <span class="info-value">${lease.tenantId?.phone || 'غير محدد'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">الجنسية:</span>
                <span class="info-value">مصري</span>
              </div>
              <div class="info-item">
                <span class="info-label">رقم الهوية:</span>
                <span class="info-value">**********</span>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 20px 0; font-size: 16px; line-height: 1.6; color: black;">
            <p>وبعد إقرار الطرفين بالأهلية الكاملة، اتفقوا على الآتي:</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند الأول: وصف العين المؤجرة</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              قام طرف العقد الأول بوصف العين المؤجرة إلى طرف العقد الثاني وعنوان الشقة ${lease.unitId?.name || 'غير محدد'} الكائنة ب${lease.unitId?.address || 'غير محدد'} شارع ${lease.unitId?.address || 'غير محدد'} قسم ${lease.unitId?.city || 'غير محدد'} محافظة ${lease.unitId?.governorate || 'غير محدد'}.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند الثاني: مدة التعاقد</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              مدة العقد تبدأ من ${lease.startDate ? new Date(lease.startDate).toLocaleDateString('ar-EG') : '…………………'} وينتهي العقد في ${lease.endDate ? new Date(lease.endDate).toLocaleDateString('ar-EG') : '…………………………'}، وللعلم ينتهي مدة العقد خلال المدة المحددة، ولا يشترط إرسال إنذار طرف العقد الثاني، وهذا العقد غير قابل للتجديد ويجب كتابة عقد جديد في حالة الرغبة.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند الثالث: قيمة الإيجار</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              قيمة الإيجار المتفق عليه بين الطرف الأول والثاني للعقد تبلغ ${lease.rentAmount?.toLocaleString() || 'غير محدد'} جنيه مصري، وهذا المبلغ يتم دفعه شهريًا مقدمًا خلال أول الشهر، وذمة الطرف الثاني لا تبرأ من الدفع إلا بموجب إيصال إثبات السداد.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند الرابع: مبلغ التأمين</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              قام الطرف الثاني بدفع قيمة تأمينية للعين المؤجرة تبلغ ${lease.depositAmount?.toLocaleString() || 'غير محدد'} جنيه مصري، ويرد هذا المبلغ إلى المستأجر في نهاية مدة العقد إذا كان يحق له ذلك.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند الخامس: عدم سداد الإيجار</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              في حالة عدم سداد قيمة الإيجار خلال مدة شهرين ويتم تحديد المدة بالعقد، وفي حالة التأخير يتم اعتبار العقد مفسوخ من تلقاء نفسه، ولا داعي لإنذار المستأجر، وكذلك لا يوجد داعي للحصول على حكم قضائي بالفسخ. يحق للمؤجر أن يقوم بطرد المستأجر من العين المؤجرة إلا بسداد القيمة الإجمالية للمتأخرات، كما يحق له المطالبة بالتعويضات في حالة الحاجة لذلك.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند السادس: عدم إمكانية التأجير من الباطن</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              لا يحق للمستأجر تأجير العين المؤجرة من الباطن، وكذلك لا يحق التنازل عنها للغير بدون الحصول على أذن من المالك الأول للشقة. يشترط الحفاظ على الشقة، ويجب أن يراعيها المستأجر ويحافظ عليها. وفي حالة مخالفة المستأجر والامتناع عن الحفاظ على الشقة يكون هذا العقد مفسوخًا من تلقاء نفسه، ولا يشترط إرسال انذار، وكذلك لا يشترط الحصول على أذن قضائي.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند السابع: عدم جواز تغيير غرض التأجير</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              لا يجوز لمستأجر العين المؤجرة تغيير غرض التأجير الأساسي وهو المعيشة والسكن، والامتناع عن لقيام بالأنشطة الأخرى. وفي حالة الإخلال بهذا البند يكون العقد مفسوخ من تلقاء نفسه دون الحصول على أذن قانوني، أو إنذار سابق.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند الثامن: الانفاق على العين المؤجرة</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              جميع المصاريف التي ينفقها المستأجر على العين المؤجرة بعد الاستلام ومنها الدهانات، أو لصق الورق، وخلافه من الديكورات لا يحق للمالك دفعها، وكذلك لا يحق للمستأجر المطالبة بهذا المصاريف.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند التاسع: الحفاظ على العين المؤجرة</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              ينبغي على المستأجر القيام بكافة الترميمات في العين المؤجرة الناتجة عن الاستخدام طوال مدة العقد.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند العاشر: رد العين المؤجرة</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              يجب على المستأجر رد العين المؤجرة بعد انتهاء مدة الإيجار بحالتها كما استلمها المستأجر في بداية مدة العقد، وفي حالة حدوث تلفيات في العين المؤجرة، يتحمل المستأجر تكاليف الإصلاح إذا كان الخطأ من المستخدم.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند الحادي عشر: التسليم بعد انتهاء مدة العقد</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              لا يجوز للمستأجر المماطلة في تسليم العين المؤجرة بعد انتهاء مدة العقد المتفق عليها بين المؤجر والمستأجر لأي سبب من الأسباب. وفي محالة مخالفة هذا البند، يحق للمالك طرد المستأجر بحكم قضائي، لأنه بذلك يخالف البند الثاني من العقد. كما يحق للمؤجر إلزام المستأجر بدفع التعويضات في حالة إلحاق الخسائر به، ويحق له دفع التعويضات عما خسر المالك.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند الثاني عشر: حدوث أمور مخلة بالعين المؤجرة</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              في حالة القيم بأعمال مخلة في العين المؤجرة يكون هذا العقد مفسوخ من تلقاء نفسه دون الحاجة إلى الرجوع للمستأجر، كما يلتزم المستأجر بدفع التعويضات.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند الثالث عشر: سداد المستحقات</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              يجب على المستأجر دفع مستحقات الفواتير طوال مدة الإيجار المتفق عليها في العقد.
            </p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-weight: bold; font-size: 18px; text-align: center; margin-bottom: 15px; color: black;">البند الرابع عشر: إنهاء العقد قبل نهاية مدته</h3>
            <p style="color: black; line-height: 1.6; text-align: right; margin: 10px 0;">
              إذا رغب المستأجر في إنهاء العقد قبل نهاية المدة المتفق عليها، يجب عليه إخطار المؤجر قبل انتهاء المدة.
            </p>
          </div>
        
        <div class="signature-section">
            <div style="text-align: center; margin-bottom: 20px;">
              <p style="font-size: 18px; font-weight: bold; color: black;">
                تم تحرير العقد بين السيد/${lease.landlordId?.name || 'غير محدد'} التوقيع/………………………….
              </p>
              <p style="font-size: 18px; font-weight: bold; color: black;">
                والسيد/${lease.tenantId?.name || 'غير محدد'} التوقيع/……………………
              </p>
            </div>
            
            <div class="signature-grid">
          <div class="signature-box">
                <div class="signature-title">توقيع الطرف الأول (المالك)</div>
            <div class="signature-line"></div>
                <div class="signature-name">${lease.landlordId?.name || 'غير محدد'}</div>
                <div class="signature-id">رقم الهوية: **********</div>
          </div>
          <div class="signature-box">
                <div class="signature-title">توقيع الطرف الثاني (المستأجر)</div>
            <div class="signature-line"></div>
                <div class="signature-name">${lease.tenantId?.name || 'غير محدد'}</div>
                <div class="signature-id">رقم الهوية: **********</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-text">تم تحرير هذا العقد بين الطرفين ويخضع لأحكام القانون المصري.</div>
            <div class="footer-note">
              <strong>بند فسخ العقد والإخلاء المبكر:</strong> لا يجوز لأي من الطرفين (المالك أو المستأجر) إنهاء عقد الإيجار أو طلب الإخلاء إلا بموجب إخطار كتابي مُسبق يُقدَّم للطرف الآخر قبل مدة لا تقل عن ثلاثين (30) يومًا من تاريخ الإخلاء المطلوب، مع توضيح الأسباب الداعية لذلك.
            </div>
            <div style="margin-top: 15px; font-size: 12px; color: black;">
              <p>تم التوقيع على هذا العقد في يوم ${new Date().toLocaleDateString('ar-EG')}</p>
              <p>ويعتبر ساري المفعول من تاريخ التوقيع</p>
            </div>
          </div>
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
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
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
    res.setHeader('Content-Disposition', `attachment; filename="lease-${leaseId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
  } catch (err) {
    console.error('Generate PDF error:', err);
    res.status(500).json({ message: 'فشل في توليد PDF', error: err.message });
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
