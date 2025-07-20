const Lease = require("../models/lease.model");
const BookingRequest = require("../models/booking-request.model");
const puppeteer = require('puppeteer');
const Unit = require("../models/unit.model");

const createLease = async (req, res) => {
  console.log("=== CREATE LEASE DEBUG ===");
  console.log("URL:", req.url);
  console.log("Method:", req.method);
  console.log("Params:", req.params);
  console.log("Body:", req.body);
  console.log("User:", req.user);
  console.log("==========================");
  
  try {
    const { bookingId } = req.params;
    const {
      rentAmount,
      depositAmount,
      startDate,
      endDate,
      paymentTerms
    } = req.body;

    console.log("BookingId:", bookingId);
    console.log("Lease data:", { rentAmount, depositAmount, startDate, endDate, paymentTerms });

    const booking = await BookingRequest.findById(bookingId).populate("unitId");

    if (!booking || booking.status !== "pending") {
      return res.status(400).json({ message: "Invalid booking." });
    }

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
      paymentTerms
    });

    await lease.save();

    // ربط العقد بالـBookingRequest (اختياري)
    booking.leaseId = lease._id;
    await booking.save();

    // تحديث حالة الوحدة إلى 'booked'
    await Unit.findByIdAndUpdate(booking.unitId._id, { status: "booked" });

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
    const leases = await Lease.find(query)
      .populate('tenantId', 'name phone')
      .populate('landlordId', 'name phone')
      .populate('unitId');
    res.json({ status: 'success', data: { leases } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// توليد وتحميل عقد الإيجار PDF
const generateLeasePDF = async (req, res) => {
  try {
    console.log('=== GENERATE PDF START ===');
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

    console.log('Lease found:', lease._id);
    console.log('Landlord:', lease.landlordId?.name);
    console.log('Tenant:', lease.tenantId?.name);

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

module.exports = {
  createLease,
  getMyLease,
  generateLeasePDF,
  getMyLeases
};
