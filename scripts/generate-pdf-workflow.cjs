const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const FONT_REG = 'C:\\Windows\\Fonts\\tahoma.ttf';
const FONT_BOLD = 'C:\\Windows\\Fonts\\tahomabd.ttf';

const C = {
  bg: '#E2E8F0',
  card: '#FFFFFF',
  border: '#CBD5E1',
  text: '#0F172A',
  textSoft: '#334155',
  textDim: '#64748B',
  white: '#FFFFFF',
  whiteSoft: '#E2E8F0',
  green: '#047857',
  blue: '#1D4ED8',
  purple: '#6D28D9',
  orange: '#C2410C',
  amber: '#B45309',
  slate: '#334155',
};

const doc = new PDFDocument({
  size: 'A4',
  margin: 0,
  layout: 'portrait',
  info: { Title: 'خارطة تطوير موقع مواكبة', Author: 'Muwakaba' }
});

const out = path.join(__dirname, '..', 'workflow-plan-v4.pdf');
const stream = fs.createWriteStream(out);
doc.pipe(stream);

const W = doc.page.width;   // 595.28
const H = doc.page.height;  // 841.89

function bg(c) { doc.rect(0, 0, W, H).fill(c); }
function rect(x, y, w, h, c) { doc.rect(x, y, w, h).fill(c); }
function rrect(x, y, w, h, r, c) { doc.roundedRect(x, y, w, h, r).fill(c); }
function stroke(x, y, w, h, color, lw=1) {
  doc.roundedRect(x, y, w, h, 8).lineWidth(lw).strokeColor(color);
}
function line(x1, y1, x2, y2, color, lw=1) {
  doc.moveTo(x1, y1).lineTo(x2, y2).lineWidth(lw).strokeColor(color);
}
function txt(t, x, y, size, c, font=FONT_REG, align='right', w=300) {
  doc.font(font).fontSize(size).fillColor(c).text(t, x, y, { align, width: w, features: ['rtla'] });
}
function circle(x, y, r, c) { doc.circle(x, y, r).fill(c); }

// ════════════════════════════════════════════════════
// PAGE 1 — COVER (Light, elegant)
// ════════════════════════════════════════════════════
function cover() {
  bg(C.bg);

  // Top accent bar
  rect(0, 0, W, 8, C.blue);

  // Logo: circle with "م"
  const cx = W / 2, cy = 140;
  circle(cx, cy, 44, C.blue);
  circle(cx, cy, 42, C.card);
  doc.circle(cx, cy, 44).lineWidth(2.5).strokeColor(C.blue);
  txt('م', cx - 16, cy - 18, 36, C.blue, FONT_BOLD, 'center', 32);

  // Title block
  txt('خارطة التطوير', W/2 - 200, 215, 32, C.text, FONT_BOLD, 'center', 400);
  txt('موقع مواكبة للموارد البشرية', W/2 - 200, 260, 18, C.blue, FONT_BOLD, 'center', 400);

  // Divider
  rect(W/2 - 40, 300, 80, 2, C.border);

  // Intro
  txt('خطة شاملة لتحويل المنصة إلى نظام اشتراكات متكامل', W/2 - 220, 320, 13, C.textSoft, FONT_REG, 'center', 440);

  // Phase summary cards (horizontal row)
  const phases = [
    { num: '١', name: 'تحصين\nالأمان', c: C.green },
    { num: '٢', name: 'نظام\nالحسابات', c: C.blue },
    { num: '٣', name: 'منع\nالمشاركة', c: C.purple },
    { num: '٤', name: 'الاشتراكات', c: C.orange },
    { num: '٥', name: 'الدعم\nالفني', c: C.amber },
    { num: '٦', name: 'الاختبارات', c: C.slate },
  ];

  const pillW = 78, pillH = 82, gap = 10;
  const totalW = phases.length * pillW + (phases.length - 1) * gap;
  let px = W/2 - totalW/2;
  const py = 390;

  phases.forEach((p) => {
    rrect(px, py, pillW, pillH, 10, p.c);
    circle(px + pillW/2, py + 32, 15, C.white);
    txt(p.num, px + pillW/2 - 12, py + 24, 14, p.c, FONT_BOLD, 'center', 24);
    txt(p.name, px + 2, py + 54, 10, C.white, FONT_BOLD, 'center', pillW - 4);
    px += pillW + gap;
  });

  // Key points
  rect(60, 510, W - 120, 1, C.border);
  txt('ماذا ستقدم هذه الخطة؟', W/2 - 150, 530, 15, C.text, FONT_BOLD, 'center', 300);

  const points = [
    'حساب خاص وآمن لكل مشترك',
    'منع مشاركة الحساب بين الأشخاص',
    'لوحة تحكم لإدارة الاشتراكات يدوياً',
    'نظام تذاكر لخدمة العملاء والدعم الفني',
  ];

  let yy = 565;
  points.forEach((p) => {
    // checkmark — solid green circle + white check
    circle(95, yy + 7, 9, C.green);
    doc.moveTo(91, yy + 7).lineTo(94, yy + 10).lineTo(100, yy + 3).lineWidth(2).strokeColor('#FFFFFF');
    txt(p, 115, yy, 12, C.text, FONT_REG, 'right', W - 175);
    yy += 32;
  });

  // Footer
  rect(60, H - 70, W - 120, 1, C.border);
  txt('مواكبة · المملكة العربية السعودية · 2026', W/2 - 150, H - 50, 11, C.textDim, FONT_REG, 'center', 300);
}

// ════════════════════════════════════════════════════
// FLOW PAGE — How phases connect
// ════════════════════════════════════════════════════
function flowPage() {
  bg(C.bg);

  // Header
  rect(0, 0, W, 90, C.card);
  rect(0, 88, W, 2, C.border);
  txt('مسار العمل', W/2 - 150, 35, 24, C.text, FONT_BOLD, 'center', 300);
  txt('كيف تترابط المراحل الست', W/2 - 180, 62, 12, C.textSoft, FONT_REG, 'center', 360);

  const steps = [
    { title: 'تحصين الأمان', desc: 'حماية الموقع من الاختراقات وتشفير البيانات', c: C.green },
    { title: 'نظام الحسابات', desc: 'إنشاء حساب لكل مشترك بكلمة مرور مشفّرة', c: C.blue },
    { title: 'منع المشاركة', desc: 'كل حساب لجهاز واحد فقط دون إمكانية إعطائه للآخرين', c: C.purple },
    { title: 'الاشتراكات', desc: 'تفعيل اشتراك شهري يدوي عبر لوحة التحكم', c: C.orange },
    { title: 'الدعم الفني', desc: 'تذاكر داخلية لخدمة العملاء والرد على الاستفسارات', c: C.amber },
    { title: 'الاختبارات', desc: 'فحص شامل وضمان جودة الموقع قبل الإطلاق', c: C.slate },
  ];

  const cardX = 60;
  const cardW = W - 120;
  const cardH = 80;
  const gap = 16;
  let y = 115;

  steps.forEach((s, i) => {
    rrect(cardX, y, cardW, cardH, 10, s.c);

    const icX = cardX + 38;
    const icY = y + cardH/2;
    circle(icX, icY, 20, C.white);
    doc.font(FONT_BOLD).fontSize(16).fillColor(s.c).text(String(i+1), icX - 10, icY - 8, { width: 20, align: 'center' });

    const textX = cardX + 72;
    const textW = W - textX - 80;
    txt(s.title, textX, y + 16, 15, C.white, FONT_BOLD, 'right', textW);
    txt(s.desc, textX, y + 42, 12, C.whiteSoft, FONT_REG, 'right', textW);

    if (i < steps.length - 1) {
      line(icX, y + cardH + 2, icX, y + cardH + gap - 2, s.c, 1.5);
      doc.moveTo(icX - 5, y + cardH + gap - 5).lineTo(icX, y + cardH + gap + 1).lineTo(icX + 5, y + cardH + gap - 5).lineWidth(1.5).strokeColor(s.c);
    }

    y += cardH + gap;
  });
}

// ════════════════════════════════════════════════════
// PHASE PAGE
// ════════════════════════════════════════════════════
function phasePage(num, numAr, title, subtitle, items, color, colorBg) {
  bg(C.bg);

  rect(0, 0, W, 125, color);

  const bx = 50, by = 40;
  circle(bx, by, 26, C.white);
  txt(numAr, bx - 14, by - 12, 20, color, FONT_BOLD, 'center', 28);

  txt(title, 90, 30, 24, C.white, FONT_BOLD, 'right', W - 140);
  txt(subtitle, 90, 62, 13, C.whiteSoft, FONT_REG, 'right', W - 140);

  const itemsStartY = 145;
  const cardH = 70;
  const gap = 12;
  let y = itemsStartY;

  items.forEach((item, i) => {
    rrect(50, y, W - 100, cardH, 8, color);

    const nx = 78, ny = y + cardH/2;
    circle(nx, ny, 15, C.white);
    txt(String(i + 1), nx - 8, ny - 8, 13, color, FONT_BOLD, 'center', 16);

    const tx = 105;
    const tw = W - tx - 55;
    txt(item, tx, y + 22, 13, C.white, FONT_REG, 'right', tw);

    y += cardH + gap;
  });

  rect(50, H - 55, W - 100, 1, C.border);
  txt(`المرحلة ${numAr} من ٦`, W/2 - 100, H - 42, 10, C.textDim, FONT_REG, 'center', 200);
}

// ════════════════════════════════════════════════════
// SUMMARY PAGE
// ════════════════════════════════════════════════════
function summaryPage() {
  bg(C.bg);

  // Header
  rect(0, 0, W, 90, C.card);
  rect(0, 88, W, 2, C.border);
  txt('الخلاصة', W/2 - 100, 35, 24, C.text, FONT_BOLD, 'center', 200);
  txt('ماذا سيحصل بعد تنفيذ الخطة', W/2 - 180, 62, 12, C.textSoft, FONT_REG, 'center', 360);

  const features = [
    { title: 'حساب خاص لكل مشترك', desc: 'كل مشترك يحصل على بريد إلكتروني وكلمة مرور خاصة به، مشفّرة بالكامل.', c: C.blue, icon: '◈' },
    { title: 'حماية كاملة للبيانات', desc: 'كل مستخدم يرى بياناته فقط، ولا يمكنه الوصول لبيانات أو تقارير غيره.', c: C.green, icon: '◈' },
    { title: 'منع مشاركة الحساب', desc: 'كل حساب يعمل من جهاز واحد. أي دخول جديد يُنهي الجلسة القديمة فوراً.', c: C.purple, icon: '◈' },
    { title: 'لوحة تحكم للأدمن', desc: 'صفحة خاصة لإدارة المشتركين وتفعيل أو إلغاء الاشتراكات يدوياً.', c: C.orange, icon: '◈' },
    { title: 'نظام تذاكر للدعم', desc: 'المشترك يفتح تذكرة دعم، والأدمن يرد عليها ويقفلها بسهولة.', c: C.amber, icon: '◈' },
    { title: 'حماية من الاختراق', desc: 'تشفير الاتصالات، تحديد المحاولات، أمان الجلسات، ومنع الوصول غير المصرّح.', c: C.slate, icon: '◈' },
  ];

  const cardW = (W - 120 - 16) / 2;
  const cardH = 140;
  const gapX = 16;
  const gapY = 14;
  let idx = 0;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const f = features[idx++];
      if (!f) break;
      const x = 40 + col * (cardW + gapX);
      const y = 115 + row * (cardH + gapY);

      rrect(x, y, cardW, cardH, 10, f.c);

      circle(x + 36, y + 36, 16, C.white);
      txt(f.icon, x + 24, y + 28, 14, f.c, FONT_BOLD, 'center', 24);

      const tx = x + 60;
      const tw = cardW - 76;
      txt(f.title, tx, y + 26, 14, C.white, FONT_BOLD, 'right', tw);

      const dx = x + 20;
      const dw = cardW - 40;
      txt(f.desc, dx, y + 68, 11, C.whiteSoft, FONT_REG, 'right', dw);
    }
  }

  // Footer
  rect(60, H - 65, W - 120, 1, C.border);
  txt('مواكبة · خطة تطوير المنصة', W/2 - 150, H - 48, 11, C.textDim, FONT_REG, 'center', 300);
}

// ════════════════════════════════════════
// BUILD
// ════════════════════════════════════════
cover();
doc.addPage(); flowPage();
doc.addPage();
phasePage('1', '١', 'تحصين الأمان', 'حماية الموقع وبيانات المستخدمين من الاختراقات',
  [
    'تفعيل درع حماية الموقع من الهجمات الإلكترونية المعروفة',
    'تحديد عدد الطلبات المسموحة لكل مستخدم لمنع التخمين والهجمات',
    'إصلاح إعدادات ملفات تعريف الارتباط لحماية جلسات المستخدمين',
    'كل مستخدم يرى بياناته فقط ولا يمكنه الوصول لبيانات غيره',
    'تأمين مسارات تحميل التقارير والملفات لتكون خاصة بصاحبها',
  ], C.green, C.greenBg);

doc.addPage();
phasePage('2', '٢', 'نظام الحسابات', 'إنشاء حساب آمن لكل مشترك بكلمة مرور مشفّرة',
  [
    'كل مشترك يحصل على بريد إلكتروني واسم مستخدم وكلمة مرور خاصة',
    'كلمات المرور مشفّرة بالكامل في قاعدة البيانات ولا أحد يمكنه رؤيتها',
    'صفحة إنشاء حساب جديدة مع تأكيد البريد الإلكتروني للتأكد من صاحبه',
    'صفحة تسجيل دخول آمنة مع حماية من محاولات التخمين',
    'خاصية استعادة كلمة المرور في حال نسيانها عبر البريد الإلكتروني',
    'تسجيل خروج آمن ينهي الجلسة لحماية الحساب',
  ], C.blue, C.blueBg);

doc.addPage();
phasePage('3', '٣', 'منع مشاركة الحساب', 'ضمان أن كل حساب يستخدمه صاحبه فقط',
  [
    'كل حساب يعمل من جهاز واحد فقط في نفس الوقت',
    'عند الدخول من جهاز جديد تنتهي جلسة الجهاز القديم تلقائياً',
    'الجهاز القديم يظهر له تنبيه فوري: تم الدخول من جهاز آخر',
    'صلاحية الدخول محدودة بمدة قصيرة لزيادة الأمان',
    'إمكانية عرض الأجهزة النشطة من صفحة الحساب الخاص',
  ], C.purple, C.purpleBg);

doc.addPage();
phasePage('4', '٤', 'نظام الاشتراكات', 'تفعيل الاشتراكات الشهرية وإدارتها يدوياً',
  [
    'إنشاء خطط اشتراك شهرية وسنوية من لوحة التحكم',
    'قائمة بكل المشتركين مع حالتهم: نشط أو منتهي أو ملغي',
    'تفعيل أو إلغاء أو تمديد اشتراك أي مشترك بضغطة زر',
    'إضافة مشترك جديد يدوياً للحالات الورقية والتحويل البنكي',
    'الخدمات محمية ولا يمكن استخدامها بدون اشتراك نشط',
    'إشعار فوري للمالك عند طلب اشتراك جديد',
  ], C.orange, C.orangeBg);

doc.addPage();
phasePage('5', '٥', 'خدمة العملاء والدعم', 'نظام دعم متكامل داخل الموقع',
  [
    'المشترك يفتح تذكرة دعم من داخل الموقع: مشكلة أو استفسار أو شكوى',
    'التذاكر مصنّفة حسب النوع والأولوية لتنظيم العمل',
    'المشترك يتابع تذكرته ويرد عليها بسهولة',
    'لوحة الأدمن تعرض كل التذاكر مع إمكانية الرد والإغلاق',
    'إشعار فوري للمالك عند فتح تذكرة جديدة',
    'واتساب يبقى متاحاً كخيار دعم إضافي',
  ], C.amber, C.amberBg);

doc.addPage();
phasePage('6', '٦', 'الاختبارات والإطلاق', 'فحص شامل وضمان جودة الموقع قبل التشغيل',
  [
    'ترتيب قاعدة البيانات وربط الجداول بشكل صحيح',
    'اختبار شامل لجميع أنظمة الأمان والمصادقة والاشتراكات',
    'التحقق من عدم وجود ثغرات أمنية في الموقع',
    'نسخ احتياطي كامل لقاعدة البيانات قبل الإطلاق',
    'تحضير البيئة الإنتاجية للنشر',
  ], C.slate, C.slateBg);

doc.addPage(); summaryPage();

doc.end();

stream.on('finish', () => console.log(`✅ PDF generated: ${out}`));
stream.on('error', (err) => { console.error('❌', err); process.exit(1); });