import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Download, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "@/lib/api";
import * as XLSX from "xlsx";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "var(--background)",
  card: "var(--background)",
  inner: "var(--background)",
  border: "var(--background)",
  primary: "var(--primary)",
  text: "var(--foreground)",
  sub: "var(--muted-foreground)",
  muted: "var(--muted-foreground)",
  green: "var(--success)",
  amber: "oklch(0.72 0.15 55)",
  rose: "oklch(0.60 0.20 15)",
  cyan: "var(--info-strong)",
};
const F = "'Cairo', sans-serif";
const FS = "'Noto Naskh Arabic', serif";

function fmtD(n: number, d = 2) {
  if (!n || isNaN(n)) return "0";
  return n.toLocaleString("ar-SA", { maximumFractionDigits: d });
}
function num(v: string) { return parseFloat(v) || 0; }

// ── Benchmark Data ────────────────────────────────────────────────────────────
// معدلات الدوران العالمية السنوية حسب القطاع (%)

// معدلات الدوران حسب الوظيفة (%)

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface MonthRow {
  leavers: string;  // عدد المغادرين
  avgEmp: string;   // متوسط الموظفين
}

function emptyRows(): MonthRow[] {
  return Array.from({ length: 12 }, () => ({ leavers: "", avgEmp: "" }));
}

// ── Recommendations ───────────────────────────────────────────────────────────
function getRecommendations(annualRate: number, benchmark: number, sector: string, job: string, lang: "ar" | "en"): string[] {
  const isAr = lang === "ar";
  const recs: string[] = [];

  if (annualRate <= benchmark * 0.7) {
    recs.push(isAr ? "معدلك ممتاز — حافظ على برامج الاحتفاظ الحالية وطوّرها" : "Excellent rate — maintain and enhance current retention programs");
    recs.push(isAr ? "وثّق ممارسات الاحتفاظ الناجحة لديك ونشرها داخلياً" : "Document and share successful retention practices internally");
    recs.push(isAr ? "استخدم معدلك المنخفض كميزة تنافسية في استقطاب الكفاءات" : "Use your low rate as a competitive advantage in talent acquisition");
    return recs;
  }

  // توصيات عامة
  recs.push(isAr ? "أجرِ مقابلات الخروج (Exit Interviews) لكل موظف مغادر لفهم الأسباب الحقيقية" : "Conduct exit interviews for every departing employee to understand root causes");
  recs.push(isAr ? "راجع هيكل الرواتب والمزايا مقارنةً بالسوق كل 6 أشهر" : "Review salary and benefits structure vs market every 6 months");
  recs.push(isAr ? "طبّق برنامج onboarding منظماً للموظفين الجدد لمدة 90 يوماً" : "Implement a structured 90-day onboarding program for new hires");

  // توصيات حسب المعدل
  if (annualRate > benchmark * 1.5) {
    recs.push(isAr ? "معدلك مرتفع جداً — ابدأ بمراجعة فورية لبيئة العمل وأسلوب الإدارة" : "Your rate is very high — start with an immediate review of work environment and management style");
    recs.push(isAr ? "طبّق استبيانات رضا الموظفين (Pulse Surveys) شهرياً" : "Implement monthly employee satisfaction pulse surveys");
    recs.push(isAr ? "راجع أحمال العمل وتوزيع المهام لتجنب الإرهاق الوظيفي" : "Review workloads and task distribution to avoid burnout");
  }

  // توصيات حسب القطاع
  if (sector === "retail" || sector === "hospitality") {
    recs.push(isAr ? "فعّل برامج التقدير والمكافآت الفورية لتحفيز الموظفين الميدانيين" : "Activate instant recognition and reward programs for frontline staff");
    recs.push(isAr ? "وفّر مرونة في الجداول الزمنية وخيارات الورديات" : "Provide schedule flexibility and shift options");
  }
  if (sector === "tech") {
    recs.push(isAr ? "استثمر في التطوير المهني والشهادات التقنية لرفع الولاء" : "Invest in professional development and technical certifications to boost loyalty");
    recs.push(isAr ? "وفّر بيئة عمل مرنة (remote/hybrid) للكفاءات التقنية" : "Offer flexible work arrangements (remote/hybrid) for technical talent");
  }
  if (sector === "healthcare") {
    recs.push(isAr ? "راجع أنظمة الورديات وضمان التوازن بين العمل والحياة للكوادر الصحية" : "Review shift systems and ensure work-life balance for healthcare staff");
    recs.push(isAr ? "وفّر دعماً نفسياً وبرامج إدارة الإجهاد للعاملين في الرعاية" : "Provide psychological support and stress management programs for care workers");
  }

  // توصيات حسب الوظيفة
  if (job === "sales" || job === "customer_svc") {
    recs.push(isAr ? "طوّر هيكل العمولات والحوافز ليكون أكثر تنافسية وشفافية" : "Develop a more competitive and transparent commission and incentive structure");
    recs.push(isAr ? "وفّر مسارات واضحة للترقي من المبيعات إلى الإدارة" : "Provide clear career paths from sales to management");
  }
  if (job === "it_dev") {
    recs.push(isAr ? "خصّص ميزانية للتدريب التقني والمؤتمرات السنوية" : "Allocate budget for technical training and annual conferences");
  }
  if (job === "management") {
    recs.push(isAr ? "راجع صلاحيات القيادة وتفويض السلطة لرفع الرضا الوظيفي" : "Review leadership authority and delegation to improve job satisfaction");
  }

  // توصيات استراتيجية
  recs.push(isAr ? "طوّر برنامج مسار وظيفي واضح (Career Path) لكل مستوى وظيفي" : "Develop a clear career path program for each job level");
  recs.push(isAr ? "فعّل برنامج الإرشاد والتوجيه (Mentoring) بين الموظفين القدامى والجدد" : "Activate a mentoring program between senior and new employees");

  return recs.slice(0, 7);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TurnoverRatePage() {
  const [, navigate] = useLocation();
  const { t, lang } = useLang();

  const isAr = lang === "ar";

  const { data: turnoverData } = api.turnover.getAll.useQuery();

  const SECTOR_BENCHMARKS = useMemo(() => (turnoverData?.sectorBenchmarks ?? {}) as Record<string, any>, [turnoverData]);
  const JOB_BENCHMARKS = useMemo(() => (turnoverData?.jobBenchmarks ?? {}) as Record<string, any>, [turnoverData]);

  const [sector, setSector] = useState("retail");
  const [job, setJob] = useState("sales");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [orgName, setOrgName] = useState("");
  const [rows, setRows] = useState<MonthRow[]>(emptyRows());

  // ── Calculations ──────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    return rows.map((r, i) => {
      const leavers = num(r.leavers);
      const avgEmp = num(r.avgEmp);
      const rate = avgEmp > 0 ? (leavers / avgEmp) * 100 : 0;
      return { month: i, leavers, avgEmp, rate };
    });
  }, [rows]);

  const totalLeavers = useMemo(() => monthlyData.reduce((s, r) => s + r.leavers, 0), [monthlyData]);
  const avgEmpYear = useMemo(() => {
    const filled = monthlyData.filter(r => r.avgEmp > 0);
    return filled.length > 0 ? filled.reduce((s, r) => s + r.avgEmp, 0) / filled.length : 0;
  }, [monthlyData]);

  const annualRate = useMemo(() => {
    return avgEmpYear > 0 ? (totalLeavers / avgEmpYear) * 100 : 0;
  }, [totalLeavers, avgEmpYear]);

  const sectorBench = SECTOR_BENCHMARKS[sector];
  const jobBench = JOB_BENCHMARKS[job];
  const sectorAnnual = sectorBench?.annual ?? 20;
  const jobAnnual = jobBench?.annual ?? 20;
  const combinedBench = (sectorAnnual + jobAnnual) / 2;

  const status = annualRate === 0 ? "neutral"
    : annualRate <= combinedBench * 0.7 ? "excellent"
    : annualRate <= combinedBench ? "good"
    : annualRate <= combinedBench * 1.3 ? "warning"
    : "critical";

  const statusLabel = {
    neutral: isAr ? "لم يتم الإدخال بعد" : "No data yet",
    excellent: isAr ? "ممتاز — أقل من المعدل العالمي بكثير" : "Excellent — well below global benchmark",
    good: isAr ? "جيد — ضمن المعدل العالمي" : "Good — within global benchmark",
    warning: isAr ? "تحذير — يتجاوز المعدل العالمي" : "Warning — exceeds global benchmark",
    critical: isAr ? "حرج — يتجاوز المعدل العالمي بشكل كبير" : "Critical — significantly above benchmark",
  }[status];

  const statusColor = {
    neutral: C.muted, excellent: C.green, good: C.cyan, warning: C.amber, critical: C.rose,
  }[status];

  const recommendations = useMemo(
    () => getRecommendations(annualRate, combinedBench, sector, job, isAr ? "ar" : "en"),
    [annualRate, combinedBench, sector, job, isAr]
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  function updateRow(i: number, field: keyof MonthRow, val: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function resetAll() {
    setRows(emptyRows());
  }

  // ── Export Excel ──────────────────────────────────────────────────────────
  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const monthNames = isAr ? MONTHS_AR : MONTHS_EN;
    const sectorLabel = isAr ? sectorBench?.ar : sectorBench?.en;
    const jobLabel = isAr ? jobBench?.ar : jobBench?.en;

    // ── Sheet 1: الجدول الشهري ──
    const monthlyRows: (string | number)[][] = [
      [isAr ? "حاسبة معدل دوران الموظفين — مواكبة للموارد البشرية" : "Employee Turnover Rate Calculator — Muwakaba HR"],
      [],
      [
        isAr ? "المنشأة" : "Organization", orgName || "—",
        isAr ? "القطاع" : "Sector", sectorLabel || "—",
        isAr ? "الوظيفة" : "Job", jobLabel || "—",
        isAr ? "السنة" : "Year", year,
      ],
      [],
      [
        isAr ? "الشهر" : "Month",
        isAr ? "عدد المغادرين (طوعي)" : "Voluntary Leavers",
        isAr ? "متوسط الموظفين" : "Avg Employees",
        isAr ? "معدل الدوران الشهري %" : "Monthly Turnover Rate %",
        isAr ? "الحالة" : "Status",
      ],
    ];

    monthlyData.forEach((r, i) => {
      const rateStatus = r.rate === 0 ? "—"
        : r.rate <= sectorAnnual / 12 ? (isAr ? "ضمن المعدل" : "Within Benchmark")
        : (isAr ? "يتجاوز المعدل" : "Above Benchmark");
      monthlyRows.push([
        monthNames[i],
        r.leavers || "—",
        r.avgEmp || "—",
        r.rate > 0 ? parseFloat(r.rate.toFixed(2)) : "—",
        rateStatus,
      ]);
    });

    monthlyRows.push([]);
    monthlyRows.push([
      isAr ? "الإجمالي السنوي" : "Annual Total",
      totalLeavers,
      parseFloat(avgEmpYear.toFixed(1)),
      parseFloat(annualRate.toFixed(2)),
      statusLabel,
    ]);

    const ws1 = XLSX.utils.aoa_to_sheet(monthlyRows);
    ws1["!cols"] = [{ wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws1, isAr ? "الجدول الشهري" : "Monthly Data");

    // ── Sheet 2: الملخص والمقارنة ──
    const summaryRows: (string | number)[][] = [
      [isAr ? "ملخص معدل الدوران السنوي" : "Annual Turnover Rate Summary"],
      [],
      [isAr ? "البند" : "Item", isAr ? "القيمة" : "Value"],
      [isAr ? "اسم المنشأة" : "Organization", orgName || "—"],
      [isAr ? "القطاع" : "Sector", sectorLabel || "—"],
      [isAr ? "الوظيفة" : "Job", jobLabel || "—"],
      [isAr ? "السنة" : "Year", year],
      [],
      [isAr ? "إجمالي المغادرين" : "Total Leavers", totalLeavers],
      [isAr ? "متوسط الموظفين السنوي" : "Annual Avg Employees", parseFloat(avgEmpYear.toFixed(1))],
      [isAr ? "معدل الدوران السنوي %" : "Annual Turnover Rate %", parseFloat(annualRate.toFixed(2))],
      [],
      [isAr ? "المقارنة بالمعدلات العالمية" : "Global Benchmark Comparison"],
      [isAr ? "المعدل العالمي للقطاع %" : "Sector Global Benchmark %", sectorAnnual],
      [isAr ? "المعدل العالمي للوظيفة %" : "Job Global Benchmark %", jobAnnual],
      [isAr ? "المعدل المرجعي المدمج %" : "Combined Benchmark %", parseFloat(combinedBench.toFixed(1))],
      [isAr ? "الفرق عن المعدل المرجعي" : "Gap vs Benchmark", parseFloat((annualRate - combinedBench).toFixed(2))],
      [isAr ? "التقييم" : "Assessment", statusLabel],
      [],
      [isAr ? "وصف القطاع" : "Sector Description", sectorBench?.desc || "—"],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws2["!cols"] = [{ wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws2, isAr ? "الملخص والمقارنة" : "Summary & Comparison");

    // ── Sheet 3: التوصيات ──
    const recRows: (string | number)[][] = [
      [isAr ? "توصيات تقليل معدل الدوران" : "Turnover Reduction Recommendations"],
      [],
      [isAr ? "رقم" : "#", isAr ? "التوصية" : "Recommendation"],
      ...recommendations.map((r, i) => [i + 1, r]),
    ];

    const ws3 = XLSX.utils.aoa_to_sheet(recRows);
    ws3["!cols"] = [{ wch: 6 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, ws3, isAr ? "التوصيات" : "Recommendations");

    const fileName = `معدل_الدوران_${orgName || "المنشأة"}_${year}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const monthNames = isAr ? MONTHS_AR : MONTHS_EN;

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F }}>
      {/* ── Header ── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80" style={{ background: C.inner, color: C.sub }}>
            <ArrowRight className="w-3.5 h-3.5" style={{ transform: isAr ? "none" : "rotate(180deg)" }} />
            <span style={{ fontFamily: F }}>{t("الرئيسية", "Home")}</span>
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black" style={{ fontFamily: FS, color: C.text }}>
              {t("حاسبة معدل دوران الموظفين", "Employee Turnover Rate Calculator")}
            </h1>
            <p className="text-[10px]" style={{ color: C.sub }}>
              {t("احسب معدل الدوران الشهري والسنوي وقارنه بالمعدلات العالمية", "Calculate monthly & annual turnover rate vs global benchmarks")}
            </p>
          </div>
          <button onClick={exportExcel} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-bold transition-all hover:opacity-80" style={{ background: C.green, color: "white" }}>
            <Download className="w-3.5 h-3.5" />
            <span>{t("تصدير Excel", "Export Excel")}</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">

        {/* ── Formula Card ── */}
        <div className="rounded-xl p-4" style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}40` }}>
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.primary }} />
            <div>
              <p className="text-xs font-bold mb-1" style={{ fontFamily: FS, color: C.primary }}>
                {t("معادلة الحساب", "Calculation Formula")}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: C.text }}>
                {t(
                  "معدل الدوران الشهري = (عدد المغادرين طوعياً ÷ متوسط عدد الموظفين) × 100",
                  "Monthly Turnover Rate = (Voluntary Leavers ÷ Average Employees) × 100"
                )}
              </p>
              <p className="text-[10px] mt-1" style={{ color: C.sub }}>
                {t(
                  "يُحتسب فقط المغادرون بإرادتهم (استقالة / إنهاء من طرف العامل). لا يشمل الفصل من صاحب العمل أو التقاعد.",
                  "Counts only voluntary departures (resignation / employee-initiated termination). Excludes employer-initiated terminations or retirement."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Settings Row ── */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-xs font-bold" style={{ fontFamily: FS, color: C.primary }}>
            {t("إعدادات الحاسبة", "Calculator Settings")}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* اسم المنشأة */}
            <div>
              <label className="text-[10px] block mb-1" style={{ color: C.sub }}>{t("اسم المنشأة (اختياري)", "Organization (optional)")}</label>
              <input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder={t("مثال: شركة الخليج", "e.g. Gulf Company")}
                className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                style={{ background: C.inner, border: `1px solid ${C.border}`, color: C.text, fontFamily: F }}
              />
            </div>
            {/* السنة */}
            <div>
              <label className="text-[10px] block mb-1" style={{ color: C.sub }}>{t("السنة", "Year")}</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                style={{ background: C.inner, border: `1px solid ${C.border}`, color: C.text, fontFamily: F }}
              />
            </div>
            {/* القطاع */}
            <div>
              <label className="text-[10px] block mb-1" style={{ color: C.sub }}>{t("القطاع", "Sector")}</label>
              <select
                value={sector}
                onChange={e => setSector(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                style={{ background: C.inner, border: `1px solid ${C.border}`, color: C.text, fontFamily: F }}
              >
                {Object.entries(SECTOR_BENCHMARKS).map(([k, v]) => (
                  <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
                ))}
              </select>
            </div>
            {/* الوظيفة */}
            <div>
              <label className="text-[10px] block mb-1" style={{ color: C.sub }}>{t("الوظيفة / الفئة الوظيفية", "Job / Job Category")}</label>
              <select
                value={job}
                onChange={e => setJob(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                style={{ background: C.inner, border: `1px solid ${C.border}`, color: C.text, fontFamily: F }}
              >
                {Object.entries(JOB_BENCHMARKS).map(([k, v]) => (
                  <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Monthly Table ── */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: C.card }}>
            <p className="text-xs font-bold" style={{ fontFamily: FS, color: C.text }}>
              {t("الجدول الشهري", "Monthly Table")} — {year}
            </p>
            <button onClick={resetAll} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: C.inner, color: C.sub }}>
              {t("مسح الكل", "Clear All")}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ background: C.inner }}>
              <thead>
                <tr style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
                  <th className="px-3 py-2 text-right font-bold" style={{ color: C.sub, fontFamily: F, width: "90px" }}>{t("الشهر", "Month")}</th>
                  <th className="px-3 py-2 text-center font-bold" style={{ color: C.sub, fontFamily: F }}>{t("عدد المغادرين (طوعي)", "Voluntary Leavers")}</th>
                  <th className="px-3 py-2 text-center font-bold" style={{ color: C.sub, fontFamily: F }}>{t("متوسط الموظفين", "Avg Employees")}</th>
                  <th className="px-3 py-2 text-center font-bold" style={{ color: C.sub, fontFamily: F }}>{t("معدل الدوران %", "Turnover Rate %")}</th>
                  <th className="px-3 py-2 text-center font-bold" style={{ color: C.sub, fontFamily: F }}>{t("الحالة", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((r, i) => {
                  const monthBench = sectorAnnual / 12;
                  const rowStatus = r.rate === 0 ? "neutral"
                    : r.rate <= monthBench * 0.7 ? "excellent"
                    : r.rate <= monthBench ? "good"
                    : r.rate <= monthBench * 1.5 ? "warning"
                    : "critical";
                  const rowColor = { neutral: C.muted, excellent: C.green, good: C.cyan, warning: C.amber, critical: C.rose }[rowStatus];
                  const rowLabel = {
                    neutral: "—",
                    excellent: isAr ? "ممتاز" : "Excellent",
                    good: isAr ? "جيد" : "Good",
                    warning: isAr ? "تحذير" : "Warning",
                    critical: isAr ? "حرج" : "Critical",
                  }[rowStatus];

                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}40` }}>
                      <td className="px-3 py-2 font-bold text-xs" style={{ color: C.text, fontFamily: F }}>{monthNames[i]}</td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={rows[i].leavers}
                          onChange={e => updateRow(i, "leavers", e.target.value)}
                          placeholder="0"
                          className="w-24 text-center text-xs px-2 py-1 rounded-lg outline-none"
                          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, fontFamily: F }}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={rows[i].avgEmp}
                          onChange={e => updateRow(i, "avgEmp", e.target.value)}
                          placeholder="0"
                          className="w-24 text-center text-xs px-2 py-1 rounded-lg outline-none"
                          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, fontFamily: F }}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-bold text-sm" style={{ color: r.rate > 0 ? rowColor : C.muted }}>
                          {r.rate > 0 ? `${fmtD(r.rate)}%` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${rowColor}20`, color: rowColor }}>
                          {rowLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals Row */}
              <tfoot>
                <tr style={{ background: C.card, borderTop: `2px solid ${C.border}` }}>
                  <td className="px-3 py-2 font-black text-xs" style={{ color: C.text, fontFamily: FS }}>{t("الإجمالي السنوي", "Annual Total")}</td>
                  <td className="px-3 py-2 text-center font-bold text-sm" style={{ color: C.amber }}>{totalLeavers > 0 ? totalLeavers : "—"}</td>
                  <td className="px-3 py-2 text-center font-bold text-sm" style={{ color: C.sub }}>{avgEmpYear > 0 ? fmtD(avgEmpYear, 1) : "—"}</td>
                  <td className="px-3 py-2 text-center font-black text-base" style={{ color: statusColor }}>{annualRate > 0 ? `${fmtD(annualRate)}%` : "—"}</td>
                  <td className="px-3 py-2 text-center">
                    {annualRate > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor}20`, color: statusColor }}>
                        {statusLabel}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Benchmark Comparison ── */}
        {annualRate > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* معدلك */}
            <div className="rounded-xl p-4 text-center" style={{ background: C.card, border: `2px solid ${statusColor}60` }}>
              <p className="text-[10px] mb-1" style={{ color: C.sub, fontFamily: F }}>{t("معدل دورانك السنوي", "Your Annual Turnover Rate")}</p>
              <p className="text-3xl font-black" style={{ color: statusColor, fontFamily: FS }}>{fmtD(annualRate)}%</p>
              <p className="text-[10px] mt-1 font-bold" style={{ color: statusColor }}>{statusLabel}</p>
            </div>
            {/* معدل القطاع */}
            <div className="rounded-xl p-4 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <p className="text-[10px] mb-1" style={{ color: C.sub, fontFamily: F }}>{t("المعدل العالمي للقطاع", "Sector Global Benchmark")}</p>
              <p className="text-3xl font-black" style={{ color: C.cyan, fontFamily: FS }}>{sectorAnnual}%</p>
              <p className="text-[10px] mt-1" style={{ color: C.sub }}>{isAr ? sectorBench?.ar : sectorBench?.en}</p>
            </div>
            {/* معدل الوظيفة */}
            <div className="rounded-xl p-4 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <p className="text-[10px] mb-1" style={{ color: C.sub, fontFamily: F }}>{t("المعدل العالمي للوظيفة", "Job Global Benchmark")}</p>
              <p className="text-3xl font-black" style={{ color: C.amber, fontFamily: FS }}>{jobAnnual}%</p>
              <p className="text-[10px] mt-1" style={{ color: C.sub }}>{isAr ? jobBench?.ar : jobBench?.en}</p>
            </div>
          </div>
        )}

        {/* ── Sector Description ── */}
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.cyan }} />
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: C.cyan, fontFamily: FS }}>
                {t("عن قطاع", "About Sector:")} {isAr ? sectorBench?.ar : sectorBench?.en}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: C.sub }}>{sectorBench?.desc}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${C.cyan}20`, color: C.cyan }}>
                  {t("المعدل العالمي للقطاع:", "Sector Benchmark:")} {sectorAnnual}%
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${C.amber}20`, color: C.amber }}>
                  {t("المعدل العالمي للوظيفة:", "Job Benchmark:")} {jobAnnual}%
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${C.primary}20`, color: C.primary }}>
                  {t("المعدل المرجعي المدمج:", "Combined Benchmark:")} {fmtD(combinedBench)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recommendations ── */}
        {annualRate > 0 && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2">
              {status === "excellent" || status === "good"
                ? <CheckCircle className="w-4 h-4" style={{ color: C.green }} />
                : <AlertTriangle className="w-4 h-4" style={{ color: C.amber }} />
              }
              <p className="text-xs font-bold" style={{ fontFamily: FS, color: C.text }}>
                {t("توصيات لتحسين معدل الدوران", "Recommendations to Improve Turnover Rate")}
              </p>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: C.inner }}>
                  <span className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${C.primary}30`, color: C.primary }}>
                    {i + 1}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: C.text }}>{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Annual Summary Bar ── */}
        {annualRate > 0 && (
          <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-xs font-bold mb-3" style={{ fontFamily: FS, color: C.text }}>
              {t("مقارنة بصرية — معدلك مقابل المعدل العالمي", "Visual Comparison — Your Rate vs Global Benchmark")}
            </p>
            <div className="space-y-3">
              {/* معدلك */}
              <div>
                <div className="flex justify-between text-[10px] mb-1" style={{ color: C.sub }}>
                  <span>{t("معدل دورانك", "Your Rate")}</span>
                  <span className="font-bold" style={{ color: statusColor }}>{fmtD(annualRate)}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: C.inner }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(annualRate / Math.max(annualRate, combinedBench * 1.5) * 100, 100)}%`, background: statusColor }} />
                </div>
              </div>
              {/* المعدل المرجعي */}
              <div>
                <div className="flex justify-between text-[10px] mb-1" style={{ color: C.sub }}>
                  <span>{t("المعدل المرجعي المدمج", "Combined Benchmark")}</span>
                  <span className="font-bold" style={{ color: C.cyan }}>{fmtD(combinedBench)}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: C.inner }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(combinedBench / Math.max(annualRate, combinedBench * 1.5) * 100, 100)}%`, background: C.cyan }} />
                </div>
              </div>
            </div>
            {/* Gap */}
            <div className="mt-3 flex items-center gap-2">
              {annualRate > combinedBench
                ? <TrendingUp className="w-3.5 h-3.5" style={{ color: C.rose }} />
                : <TrendingDown className="w-3.5 h-3.5" style={{ color: C.green }} />
              }
              <p className="text-[10px]" style={{ color: C.sub }}>
                {annualRate > combinedBench
                  ? t(`معدلك أعلى من المعدل المرجعي بـ ${fmtD(annualRate - combinedBench)}%`, `Your rate is ${fmtD(annualRate - combinedBench)}% above benchmark`)
                  : t(`معدلك أقل من المعدل المرجعي بـ ${fmtD(combinedBench - annualRate)}% — ممتاز!`, `Your rate is ${fmtD(combinedBench - annualRate)}% below benchmark — Excellent!`)
                }
              </p>
            </div>
          </div>
        )}

        {/* ── Export Button (bottom) ── */}
        <div className="flex justify-center pb-4">
          <button onClick={exportExcel} className="flex items-center gap-2 text-sm px-6 py-3 rounded-xl font-bold transition-all hover:opacity-80" style={{ background: C.green, color: "white" }}>
            <Download className="w-4 h-4" />
            {t("تصدير تقرير Excel الكامل", "Export Full Excel Report")}
          </button>
        </div>
      </div>
    </div>
  );
}
