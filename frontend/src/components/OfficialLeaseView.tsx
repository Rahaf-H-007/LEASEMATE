import React from 'react';

interface OfficialLeaseViewProps {
  lease: any;
  onPrint: () => void;
  onDownload: () => void;
}

const OfficialLeaseView: React.FC<OfficialLeaseViewProps> = ({
  lease,
  onPrint,
  onDownload
}) => {
  const getStatusText = (status: string, endDate?: string) => {
    const now = new Date();
    if (status === "rejected") return "مرفوض";
    if (status === "pending") return "قيد الانتظار";
    if (endDate && new Date(endDate) < now) return "منتهي";
    if (status === "active") return "نشط";
    return status || "-";
  };

  return (
    <div className="bg-white border-2 border-black rounded-none shadow-none overflow-hidden text-right relative" dir="rtl">
     
     
      {/* رأس العقد الرسمي */}
      <div className="bg-white text-black p-8 text-center relative border-b-2 border-black">
      
        <div className="border-t-2 border-black pt-6">
          <div className="text-3xl font-bold text-black">عقد إيجار وحدة سكنية</div>
          <div className="text-lg mt-2 text-black">رقم العقد: {lease._id}</div>
          <div className="text-lg mt-1 text-black">تاريخ التحرير: {new Date().toLocaleDateString("ar-EG")}</div>
        </div>
      </div>

      <div className="p-8 bg-white text-black">
        {/* مقدمة العقد */}
        <div className="mb-8 text-center">
          <p className="text-2xl leading-relaxed text-black">
            أنه في يوم {new Date().toLocaleDateString("ar-EG")} الموافق {new Date().toLocaleDateString("ar-EG")} تم تحرير عقد إيجار الشقة بين كل من:
          </p>
        </div>

        {/* الطرفين */}
        <div className="mb-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-black mb-4 text-center">
              أولاً: السيد/…………………..المقيم/……………….رقم البطاقة الشخصية/………………….(طرف العقد الأول وهو المالك).
            </h3>
            <div className="space-y-3 text-right">
              <p className="text-black">
                <span className="font-bold text-black">الاسم:</span>{" "}
                {lease.landlordId?.name}
              </p>
              <p className="text-black">
                <span className="font-bold text-black">رقم الهاتف:</span>{" "}
                {lease.landlordId?.phone}
              </p>
              <p className="text-black">
                <span className="font-bold text-black">الجنسية:</span>{" "}
                مصري
              </p>
             
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-black mb-4 text-center">
              ثانيًا: السيد/………………المقيم/…………………..رقم الرقم القومي/……………….(طرف ثاني وهو المستأجر).
            </h3>
            <div className="space-y-3 text-right">
              <p className="text-black">
                <span className="font-bold text-black">الاسم:</span>{" "}
                {lease.tenantId?.name}
              </p>
              <p className="text-black">
                <span className="font-bold text-black">رقم الهاتف:</span>{" "}
                {lease.tenantId?.phone}
              </p>
              <p className="text-black">
                <span className="font-bold text-black">الجنسية:</span>{" "}
                مصري
              </p>
              
            </div>
          </div>
        </div>

        {/* إقرار الأهلية */}
        <div className="mb-8 text-center">
          <p className="text-lg leading-relaxed text-black">
            وبعد إقرار الطرفين بالأهلية الكاملة، اتفقوا على الآتي:
          </p>
        </div>

        {/* البند الأول: وصف العين المؤجرة */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند الأول: وصف العين المؤجرة
          </h3>
          <p className="text-black leading-relaxed text-right">
            قام طرف العقد الأول بوصف العين المؤجرة إلى طرف العقد الثاني وعنوان الشقة {lease.unitId?.name} الكائنة ب{lease.unitId?.address} شارع {lease.unitId?.address} قسم {lease.unitId?.city} محافظة {lease.unitId?.governorate}.
          </p>
        </div>

        {/* البند الثاني: مدة التعاقد */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند الثاني: مدة التعاقد
          </h3>
          <p className="text-black leading-relaxed text-right">
            مدة العقد تبدأ من {lease.startDate ? new Date(lease.startDate).toLocaleDateString("ar-EG") : "…………………"} وينتهي العقد في {lease.endDate ? new Date(lease.endDate).toLocaleDateString("ar-EG") : "…………………………"}، وللعلم ينتهي مدة العقد خلال المدة المحددة، ولا يشترط إرسال إنذار طرف العقد الثاني، وهذا العقد غير قابل للتجديد ويجب كتابة عقد جديد في حالة الرغبة.
          </p>
        </div>

        {/* البند الثالث: قيمة الإيجار */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند الثالث: قيمة الإيجار
          </h3>
          <p className="text-black leading-relaxed text-right">
            قيمة الإيجار المتفق عليه بين الطرف الأول والثاني للعقد تبلغ {lease.rentAmount?.toLocaleString()} جنيه مصري، وهذا المبلغ يتم دفعه شهريًا مقدمًا خلال أول الشهر، وذمة الطرف الثاني لا تبرأ من الدفع إلا بموجب إيصال إثبات السداد.
          </p>
        </div>

        {/* البند الرابع: مبلغ التأمين */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند الرابع: مبلغ التأمين
          </h3>
          <p className="text-black leading-relaxed text-right">
            قام الطرف الثاني بدفع قيمة تأمينية للعين المؤجرة تبلغ {lease.depositAmount?.toLocaleString()} جنيه مصري، ويرد هذا المبلغ إلى المستأجر في نهاية مدة العقد إذا كان يحق له ذلك.
          </p>
        </div>

        {/* البند الخامس: عدم سداد الإيجار */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند الخامس: عدم سداد الإيجار
          </h3>
          <p className="text-black leading-relaxed text-right">
            في حالة عدم سداد قيمة الإيجار خلال مدة شهرين ويتم تحديد المدة بالعقد، وفي حالة التأخير يتم اعتبار العقد مفسوخ من تلقاء نفسه، ولا داعي لإنذار المستأجر، وكذلك لا يوجد داعي للحصول على حكم قضائي بالفسخ. يحق للمؤجر أن يقوم بطرد المستأجر من العين المؤجرة إلا بسداد القيمة الإجمالية للمتأخرات، كما يحق له المطالبة بالتعويضات في حالة الحاجة لذلك.
          </p>
        </div>

        {/* البند السادس: عدم إمكانية التأجير من الباطن */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند السادس: عدم إمكانية التأجير من الباطن
          </h3>
          <p className="text-black leading-relaxed text-right">
            لا يحق للمستأجر تأجير العين المؤجرة من الباطن، وكذلك لا يحق التنازل عنها للغير بدون الحصول على أذن من المالك الأول للشقة. يشترط الحفاظ على الشقة، ويجب أن يراعيها المستأجر ويحافظ عليها. وفي حالة مخالفة المستأجر والامتناع عن الحفاظ على الشقة يكون هذا العقد مفسوخًا من تلقاء نفسه، ولا يشترط إرسال انذار، وكذلك لا يشترط الحصول على أذن قضائي.
          </p>
        </div>

        {/* البند السابع: عدم جواز تغيير غرض التأجير */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند السابع: عدم جواز تغيير غرض التأجير
          </h3>
          <p className="text-black leading-relaxed text-right">
            لا يجوز لمستأجر العين المؤجرة تغيير غرض التأجير الأساسي وهو المعيشة والسكن، والامتناع عن لقيام بالأنشطة الأخرى. وفي حالة الإخلال بهذا البند يكون العقد مفسوخ من تلقاء نفسه دون الحصول على أذن قانوني، أو إنذار سابق.
          </p>
        </div>

        {/* البند الثامن: الانفاق على العين المؤجرة */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند الثامن: الانفاق على العين المؤجرة
          </h3>
          <p className="text-black leading-relaxed text-right">
            جميع المصاريف التي ينفقها المستأجر على العين المؤجرة بعد الاستلام ومنها الدهانات، أو لصق الورق، وخلافه من الديكورات لا يحق للمالك دفعها، وكذلك لا يحق للمستأجر المطالبة بهذا المصاريف.
          </p>
        </div>

        {/* البند التاسع: الحفاظ على العين المؤجرة */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند التاسع: الحفاظ على العين المؤجرة
          </h3>
          <p className="text-black leading-relaxed text-right">
            ينبغي على المستأجر القيام بكافة الترميمات في العين المؤجرة الناتجة عن الاستخدام طوال مدة العقد.
          </p>
        </div>

        {/* البند العاشر: رد العين المؤجرة */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند العاشر: رد العين المؤجرة
          </h3>
          <p className="text-black leading-relaxed text-right">
            يجب على المستأجر رد العين المؤجرة بعد انتهاء مدة الإيجار بحالتها كما استلمها المستأجر في بداية مدة العقد، وفي حالة حدوث تلفيات في العين المؤجرة، يتحمل المستأجر تكاليف الإصلاح إذا كان الخطأ من المستخدم.
          </p>
        </div>

        {/* البند الحادي عشر: التسليم بعد انتهاء مدة العقد */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند الحادي عشر: التسليم بعد انتهاء مدة العقد
          </h3>
          <p className="text-black leading-relaxed text-right">
            لا يجوز للمستأجر المماطلة في تسليم العين المؤجرة بعد انتهاء مدة العقد المتفق عليها بين المؤجر والمستأجر لأي سبب من الأسباب. وفي محالة مخالفة هذا البند، يحق للمالك طرد المستأجر بحكم قضائي، لأنه بذلك يخالف البند الثاني من العقد. كما يحق للمؤجر إلزام المستأجر بدفع التعويضات في حالة إلحاق الخسائر به، ويحق له دفع التعويضات عما خسر المالك.
          </p>
        </div>

        {/* البند الثاني عشر: حدوث أمور مخلة بالعين المؤجرة */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند الثاني عشر: حدوث أمور مخلة بالعين المؤجرة
          </h3>
          <p className="text-black leading-relaxed text-right">
            في حالة القيم بأعمال مخلة في العين المؤجرة يكون هذا العقد مفسوخ من تلقاء نفسه دون الحاجة إلى الرجوع للمستأجر، كما يلتزم المستأجر بدفع التعويضات.
          </p>
        </div>

        {/* البند الثالث عشر: سداد المستحقات */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند الثالث عشر: سداد المستحقات
          </h3>
          <p className="text-black leading-relaxed text-right">
            يجب على المستأجر دفع مستحقات الفواتير طوال مدة الإيجار المتفق عليها في العقد.
          </p>
        </div>

        {/* البند الرابع عشر: إنهاء العقد قبل نهاية مدته */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-black mb-4 text-center">
            البند الرابع عشر: إنهاء العقد قبل نهاية مدته
          </h3>
          <p className="text-black leading-relaxed text-right">
            إذا رغب المستأجر في إنهاء العقد قبل نهاية المدة المتفق عليها، يجب عليه إخطار المؤجر قبل انتهاء المدة.
          </p>
        </div>

      
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <h4 className="font-bold mb-6 text-lg text-black">توقيع الطرف الأول (المالك)</h4>
              <div className="border-b-2 border-black w-64 mx-auto h-12 mb-4"></div>
              <p className="text-sm text-black font-semibold">{lease.landlordId?.name}</p>
              <p className="text-xs text-black mt-1">رقم الهوية: **********</p>
            </div>
            <div className="text-center">
              <h4 className="font-bold mb-6 text-lg text-black">
                توقيع الطرف الثاني (المستأجر)
              </h4>
              <div className="border-b-2 border-black w-64 mx-auto h-12 mb-4"></div>
              <p className="text-sm text-black font-semibold">{lease.tenantId?.name}</p>
              <p className="text-xs text-black mt-1">رقم الهوية: **********</p>
            </div>
          </div>
        </div>

        {/* الخلاصة الرسمية */}
        <div className="text-center mt-8 p-6 bg-white border-2 border-black">
          <p className="text-black font-bold text-lg mb-4">
            تم تحرير هذا العقد بين الطرفين ويخضع لأحكام القانون المصري.
          </p>
          <p className="text-black text-sm leading-relaxed">
            <strong>بند فسخ العقد والإخلاء المبكر:</strong> لا يجوز لأي من الطرفين (المالك أو المستأجر) إنهاء عقد الإيجار أو طلب الإخلاء إلا بموجب إخطار كتابي مُسبق يُقدَّم للطرف الآخر قبل مدة لا تقل عن ثلاثين (30) يومًا من تاريخ الإخلاء المطلوب، مع توضيح الأسباب الداعية لذلك.
          </p>
          <div className="mt-4 text-sm text-black">
            <p>تم التوقيع على هذا العقد في يوم {new Date().toLocaleDateString("ar-EG")}</p>
            <p>ويعتبر ساري المفعول من تاريخ التوقيع</p>
          </div>
        </div>

      
      </div>
  
  );
};

export default OfficialLeaseView; 