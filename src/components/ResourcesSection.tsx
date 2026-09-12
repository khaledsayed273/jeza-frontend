import { FileText, ExternalLink, BookOpen, Scale, Building2, Stethoscope, Wrench, ShoppingBag, Send, GraduationCap, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";
import { api } from "../lib/api";

/**
 * MUWAKABA - Resources Section
 * Design: Pure Black + White, smaller fonts
 * قرارات التوطين 2020-2026 + برنامج نطاقات المحدث + قناة تلقرام
 */

// قرارات التوطين من 2020 إلى 2026

const years = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

const ICON_MAP: Record<string, typeof FileText> = {
  "100%": Building2,
  "30%": Wrench,
  "55%": Stethoscope,
  "60%": ShoppingBag,
  "70%": Building2,
  "نطاقات": Scale,
  "توطين": Building2,
  "تصنيف": FileText,
  "عقود": FileText,
  "حقوق": FileText,
  "تدريب": GraduationCap,
  "أكاديمي": BookOpen,
  "هندسة": Wrench,
  "موارد بشرية": BookOpen,
  "صحة": Stethoscope,
  "تجزئة": ShoppingBag,
  "إداري": Building2,
  "تقنية": FileText,
};

// ملفات قناة تلقرام
const telegramResources = [
  {
    icon: GraduationCap,
    title: "دورة نظام العمل السعودي",
    description: "محتوى تدريبي متخصص في نظام العمل السعودي والتوطين من قناة جزاء البقمي",
    href: "https://t.me/jzaaalbqamy",
  },
  {
    icon: Briefcase,
    title: "إرشادات الالتزام بالتوطين",
    description: "نصائح وإرشادات عملية للمنشآت للالتزام بنسب التوطين المطلوبة",
    href: "https://t.me/jzaaalbqamy",
  },
  {
    icon: FileText,
    title: "آخر مستجدات التوطين",
    description: "تحديثات فورية بأحدث قرارات وزارة الموارد البشرية المتعلقة بالتوطين",
    href: "https://t.me/jzaaalbqamy",
  },
];

const quickLinks = [
  { label: "وزارة الموارد البشرية", href: "https://hrsd.gov.sa/ar", icon: Building2 },
  { label: "منصة قوى", href: "https://www.qiwa.sa/ar", icon: FileText },
  { label: "منصة مسار", href: "https://musaned.com.sa", icon: BookOpen },
  { label: "التأمينات الاجتماعية", href: "https://www.gosi.gov.sa", icon: Scale },
];

export default function ResourcesSection() {
  const [selectedYear, setSelectedYear] = useState("2026");
  const [showAll, setShowAll] = useState(false);

  const { data: resourcesData } = api.resources.getAll.useQuery();
  const allDecisions = useMemo(() => {
    const grouped = resourcesData?.decisions as Record<string, Array<{ title: string; badge: string; desc: string; date: string; href: string }>> | undefined;
    if (!grouped) return [];
    const flat: Array<{ year: string; icon: typeof FileText; title: string; description: string; badge: string; href: string; date: string }> = [];
    for (const [year, items] of Object.entries(grouped)) {
      for (const item of items) {
        flat.push({
          year,
          icon: ICON_MAP[item.badge] ?? FileText,
          title: item.title,
          description: item.desc,
          badge: item.badge,
          href: item.href,
          date: item.date,
        });
      }
    }
    return flat;
  }, [resourcesData]);

  const filtered = allDecisions.filter(d => d.year === selectedYear);
  const displayed = showAll ? filtered : filtered.slice(0, 4);

  return (
    <section id="resources" className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0D0D0D]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative z-10 max-w-4xl mx-auto px-4">

        {/* Section Header */}
        <div className="text-center mb-8">
          <p className="text-white/30 text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ fontFamily: 'Cairo, sans-serif' }}>
            ملفات وإرشادات
          </p>
          <h2 className="text-xl md:text-2xl font-black text-white mb-2" style={{ fontFamily: 'Tajawal, sans-serif' }}>
            قرارات التوطين
          </h2>
          <p className="text-gray-500 text-xs max-w-md mx-auto" style={{ fontFamily: 'Cairo, sans-serif' }}>
            جميع قرارات التوطين من وزارة الموارد البشرية 2020 إلى أبريل 2026
          </p>
        </div>

        {/* Year Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {years.map(year => (
            <button
              key={year}
              onClick={() => { setSelectedYear(year); setShowAll(false); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                selectedYear === year
                  ? "bg-white text-black"
                  : "bg-white/8 text-white/50 border border-white/15 hover:bg-white/15 hover:text-white"
              }`}
              style={{ fontFamily: 'Cairo, sans-serif' }}
            >
              {year}
              {year === "2026" && (
                <span className="mr-1 text-[9px] opacity-70">محدث</span>
              )}
            </button>
          ))}
        </div>

        {/* Decisions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {displayed.map(({ icon: Icon, title, description, badge, href, date }, i) => (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-4 hover:border-white/20 transition-all duration-300 group hover:-translate-y-0.5 block border border-white/8"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/8 border border-white/10 mt-0.5">
                  <Icon size={17} className="text-white/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-white font-bold text-xs leading-relaxed group-hover:text-white/80 transition-colors" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                      {title}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15 flex-shrink-0" style={{ fontFamily: 'Cairo, sans-serif' }}>
                      {badge}
                    </span>
                  </div>
                  <p className="text-gray-500 text-[11px] leading-relaxed mb-2" style={{ fontFamily: 'Cairo, sans-serif' }}>
                    {description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-white/30 text-[10px]" style={{ fontFamily: 'Cairo, sans-serif' }}>{date}</span>
                    <div className="flex items-center gap-1 text-white/30 group-hover:text-white/60 transition-colors">
                      <ExternalLink size={11} />
                      <span className="text-[10px]" style={{ fontFamily: 'Cairo, sans-serif' }}>فتح</span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Show more/less */}
        {filtered.length > 4 && (
          <div className="text-center mb-8">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-white/8 border border-white/15 text-white/60 text-xs hover:bg-white/15 hover:text-white transition-all"
              style={{ fontFamily: 'Cairo, sans-serif' }}
            >
              {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showAll ? "عرض أقل" : `عرض ${filtered.length - 4} قرارات إضافية`}
            </button>
          </div>
        )}

        {/* نطاقات 2026 المحدث */}
        <div className="mb-8 p-5 rounded-xl border border-white/15 bg-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
              <Scale size={15} className="text-white/70" />
            </div>
            <div>
              <p className="text-white font-bold text-sm" style={{ fontFamily: 'Tajawal, sans-serif' }}>برنامج نطاقات المطور 2026</p>
              <p className="text-white/40 text-[10px]" style={{ fontFamily: 'Cairo, sans-serif' }}>التحديثات الأخيرة - مارس 2026</p>
            </div>
            <a
              href="https://www.hrsd.gov.sa/knowledge-centre/decisions-and-regulations/regulation-and-procedures/%D8%A7%D9%84%D8%AF%D9%84%D9%8A%D9%84-%D8%A7%D9%84%D8%A5%D8%AC%D8%B1%D8%A7%D8%A6%D9%8A-%D9%84%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D8%AC-%D9%86%D8%B7%D8%A7%D9%82%D8%A7%D8%AA-%D8%A7%D9%84%D9%85%D8%B7%D9%88%D8%B1"
              target="_blank"
              rel="noopener noreferrer"
              className="mr-auto px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white text-xs font-semibold hover:bg-white/20 transition-colors flex items-center gap-1.5"
              style={{ fontFamily: 'Cairo, sans-serif' }}
            >
              <ExternalLink size={12} />
              الدليل الرسمي
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: "تحديث آلية الاحتساب", desc: "يُحتسب التوطين فقط للموظفين السعوديين الذين وُثِّقت عقودهم عبر منصة قوى - مارس 2026" },
              { title: "دمج الأنشطة الاقتصادية", desc: "إعادة هيكلة الأنشطة الاقتصادية ودمجها لتبسيط احتساب نسب التوطين" },
              { title: "خطة توطين ثابتة", desc: "اعتماد خطة توطين ثابتة تربط نسبة التوطين بعدد العاملين في المنشأة" },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white font-bold text-xs mb-1" style={{ fontFamily: 'Tajawal, sans-serif' }}>{item.title}</p>
                <p className="text-gray-500 text-[10px] leading-relaxed" style={{ fontFamily: 'Cairo, sans-serif' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Telegram Channel */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
              <Send size={14} className="text-white/70" />
            </div>
            <div>
              <p className="text-white font-bold text-sm" style={{ fontFamily: 'Tajawal, sans-serif' }}>قناة جزاء البقمي على تلقرام</p>
              <p className="text-white/40 text-[10px]" style={{ fontFamily: 'Cairo, sans-serif' }}>إرشادات وملفات تدريبية متخصصة في التوطين</p>
            </div>
            <a
              href="https://t.me/jzaaalbqamy"
              target="_blank"
              rel="noopener noreferrer"
              className="mr-auto px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white text-xs font-semibold hover:bg-white/15 transition-colors flex items-center gap-1.5"
              style={{ fontFamily: 'Cairo, sans-serif' }}
            >
              <Send size={12} />
              انضم للقناة
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {telegramResources.map(({ icon: Icon, title, description, href }, i) => (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card p-4 hover:border-white/20 transition-all duration-300 group hover:-translate-y-0.5 block border border-white/8"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/8 border border-white/10">
                    <Icon size={15} className="text-white/60" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/15" style={{ fontFamily: 'Cairo, sans-serif' }}>
                    تلقرام
                  </span>
                </div>
                <h3 className="text-white font-bold text-xs mb-1.5 leading-relaxed" style={{ fontFamily: 'Tajawal, sans-serif' }}>{title}</h3>
                <p className="text-gray-500 text-[10px] leading-relaxed mb-2" style={{ fontFamily: 'Cairo, sans-serif' }}>{description}</p>
                <div className="flex items-center gap-1 text-white/30 group-hover:text-white/60 transition-colors">
                  <Send size={10} />
                  <span className="text-[10px]" style={{ fontFamily: 'Cairo, sans-serif' }}>فتح في تلقرام</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="glass-card p-4 border border-white/10 mb-6">
          <p className="text-white/50 text-xs font-bold mb-3 flex items-center gap-2" style={{ fontFamily: 'Cairo, sans-serif' }}>
            <span className="w-1 h-3 bg-white/40 rounded-full inline-block" />
            روابط المنصات الرسمية
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickLinks.map(({ label, href, icon: Icon }, i) => (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-center group"
              >
                <Icon size={16} className="text-white/40 group-hover:text-white group-hover:scale-110 transition-all" />
                <span className="text-gray-400 text-[10px] group-hover:text-white transition-colors" style={{ fontFamily: 'Cairo, sans-serif' }}>{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText size={11} className="text-white/50" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-bold mb-1" style={{ fontFamily: 'Tajawal, sans-serif' }}>تنبيه مهم</p>
              <p className="text-gray-500 text-[10px] leading-relaxed" style={{ fontFamily: 'Cairo, sans-serif' }}>
                جميع القرارات والأدلة الإجرائية مستندة إلى الإصدارات الرسمية من موقع وزارة الموارد البشرية والتنمية الاجتماعية. يُنصح بالتحقق من الموقع الرسمي للاطلاع على آخر التحديثات.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
