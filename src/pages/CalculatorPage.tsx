import ServiceRating from "@/components/ServiceRating";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Calculator, Info, TrendingUp, CheckCircle, XCircle, ChevronDown, Scale, AlertTriangle } from "lucide-react";
import { useLang } from "../contexts/LanguageContext";
import { api } from "../lib/api";

/**
 * MUWAKABA — Calculator Page
 * Design: Dark background + Lavender/Khuzami accent
 * Font: Noto Naskh Arabic (headings) + Cairo (body)
 */

const LOGO_URL_DEFAULT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663364198732/2vuJLs9j7vTiL4E4emfRJ8/muwakaba_logo_v2-SCNMsUQ2s4hs6UtaXq88Y7.webp";

interface ProfessionJob {
  name: string;
  minWage: number | null;
}

interface ProfessionCategory {
  id: string;
  label: string;
  required: number | null;
  note: string;
  examples: string;
  minWage: string | null;
  jobs?: ProfessionJob[];
  phases?: { date: string; rate: number; label: string }[];
}

interface NitaqatResult {
  percentage: number;
  band: string;
  bandColor: string;
  description: string;
  icon: React.ReactNode;
  recommendation: string;
}

function getNitaqatBand(percentage: number, required: number | null): NitaqatResult {
  if (required === null) {
    if (percentage >= 40) return { percentage, band: "البلاتيني", bandColor: "var(--primary)", description: "أعلى مستوى في التوطين - مزايا استثنائية", icon: <CheckCircle size={16} />, recommendation: "منشأتك في أعلى مستوى توطين. تستحق مزايا نطاقات البلاتيني." };
    if (percentage >= 30) return { percentage, band: "الأخضر المرتفع", bandColor: "var(--success)", description: "نسبة توطين مرتفعة - مزايا ممتازة", icon: <CheckCircle size={16} />, recommendation: "أداء ممتاز. منشأتك في النطاق الأخضر المرتفع." };
    if (percentage >= 20) return { percentage, band: "الأخضر المتوسط", bandColor: "var(--success)", description: "نسبة توطين متوسطة - مقبول", icon: <CheckCircle size={16} />, recommendation: "منشأتك في النطاق الأخضر المتوسط. يمكن تحسين النسبة." };
    if (percentage >= 10) return { percentage, band: "الأخضر المنخفض", bandColor: "var(--success)", description: "الحد الأدنى المقبول", icon: <AlertTriangle size={16} />, recommendation: "منشأتك في الحد الأدنى. يُنصح برفع نسبة التوطين." };
    return { percentage, band: "الأحمر", bandColor: "var(--danger)", description: "مخالف - عقوبات وقيود", icon: <XCircle size={16} />, recommendation: "منشأتك في النطاق الأحمر. يجب اتخاذ إجراءات فورية." };
  }
  const diff = percentage - required;
  if (diff >= 10) return { percentage, band: "ممتاز - فائق الالتزام", bandColor: "var(--primary)", description: `تجاوزت النسبة المطلوبة (${required}%) بفارق ${diff.toFixed(1)}%`, icon: <CheckCircle size={16} />, recommendation: "منشأتك تتجاوز النسبة المطلوبة. أداء استثنائي في التوطين." };
  if (diff >= 0) return { percentage, band: "ملتزم", bandColor: "var(--success)", description: `تحقق الحد الأدنى المطلوب (${required}%)`, icon: <CheckCircle size={16} />, recommendation: "منشأتك ملتزمة بالنسبة المطلوبة. استمر في المحافظة على هذا المستوى." };
  if (diff >= -10) return { percentage, band: "قريب من الالتزام", bandColor: "var(--warning)", description: `أقل من النسبة المطلوبة (${required}%) بفارق ${Math.abs(diff).toFixed(1)}%`, icon: <AlertTriangle size={16} />, recommendation: `تحتاج إلى توظيف ${Math.ceil(Math.abs(diff) / 100 * 10)} سعودي/ة إضافي/ة تقريباً لكل 10 موظفين.` };
  return { percentage, band: "مخالف", bandColor: "var(--danger)", description: `أقل من النسبة المطلوبة (${required}%) بفارق ${Math.abs(diff).toFixed(1)}%`, icon: <XCircle size={16} />, recommendation: "منشأتك مخالفة. يجب اتخاذ إجراءات عاجلة. تواصل مع جزاء البقمي للمساعدة." };
}

// جدول الأنشطة الاقتصادية من دليل نطاقات المطور 2026
// القيم الثابتة من الدليل الإجرائي لبرنامج نطاقات المطور 2026 (قرار 182495)
// المعادلة: ص = م × ln(س) + ث  حيث س = إجمالي الموظفين (ln = اللوغاريتم الطبيعي)
// القيم المستخدمة هي قيم عام 2026 - متطابقة مع حاسبة الوزارة الرسمية

function calcNitaqatBand(pct: number, totalEmp: number, activity: any) {
  // المعادلة: ص = م × ln(س) + ث  (اللوغاريتم الطبيعي كما تستخدمه حاسبة الوزارة الرسمية)
  const logS = Math.log(totalEmp); // اللوغاريتم الطبيعي (ln) - متطابق مع حاسبة الوزارة
  const thresholds = {
    low: activity.m.low * logS + activity.th.low,
    mid: activity.m.mid * logS + activity.th.mid,
    high: activity.m.high * logS + activity.th.high,
    plat: activity.m.plat * logS + activity.th.plat,
  };
  if (pct >= thresholds.plat) return { band: "البلاتيني", bandColor: "var(--primary)", mdaRange: `${thresholds.plat.toFixed(1)}%+`, thresholds };
  if (pct >= thresholds.high) return { band: "الأخضر المرتفع", bandColor: "var(--success)", mdaRange: `${thresholds.high.toFixed(1)}% - ${thresholds.plat.toFixed(1)}%`, thresholds };
  if (pct >= thresholds.mid) return { band: "الأخضر المتوسط", bandColor: "var(--success)", mdaRange: `${thresholds.mid.toFixed(1)}% - ${thresholds.high.toFixed(1)}%`, thresholds };
  if (pct >= thresholds.low) return { band: "الأخضر المنخفض", bandColor: "var(--success)", mdaRange: `${thresholds.low.toFixed(1)}% - ${thresholds.mid.toFixed(1)}%`, thresholds };
  return { band: "الأحمر", bandColor: "var(--danger)", mdaRange: `أقل من ${thresholds.low.toFixed(1)}%`, thresholds };
}

function RecruitmentBalanceCalculator({ activities2026 }: { activities2026: any[] }) {
  const [totalEmp, setTotalEmp] = useState("");
  const [saudiEmp, setSaudiEmp] = useState("");
  const [selectedActivity, setSelectedActivity] = useState(activities2026[0]);
  const [targetBand, setTargetBand] = useState<"low" | "mid" | "high" | "plat">("mid");
  const [result, setResult] = useState<null | {
    currentPct: number;
    currentBand: string;
    currentBandColor: string;
    maxNonSaudi: number;
    maxNonSaudiPct: number;
    requiredSaudi: number;
    targetThreshold: number;
    canHireMore: number;
    mustHireSaudi: number;
  }>(null);

  const bandLabels: Record<string, string> = {
    low: "الأخضر المنخفض",
    mid: "الأخضر المتوسط",
    high: "الأخضر المرتفع",
    plat: "البلاتيني",
  };
  const bandColors: Record<string, string> = {
    low: "var(--success)",
    mid: "var(--success)",
    high: "var(--success)",
    plat: "var(--primary)",
  };

  const calcRecruitment = () => {
    const s = parseFloat(totalEmp);
    const sa = parseFloat(saudiEmp);
    if (!s || s <= 0 || sa < 0 || sa > s) return;
    const logS = Math.log(s); // الدليل الإجرائي الرسمي يستخدم اللوغاريتم الطبيعي (ln)
    const threshold = selectedActivity.m[targetBand] * logS + selectedActivity.th[targetBand];
    const requiredSaudi = Math.ceil((threshold / 100) * s);
    const maxNonSaudi = Math.floor(s - requiredSaudi);
    const maxNonSaudiPct = ((maxNonSaudi / s) * 100);
    const currentPct = (sa / s) * 100;
    const currentRes = calcNitaqatBand(currentPct, s, selectedActivity);
    const canHireMore = Math.max(0, maxNonSaudi - (s - sa));
    const mustHireSaudi = Math.max(0, requiredSaudi - sa);
    setResult({
      currentPct,
      currentBand: currentRes.band,
      currentBandColor: currentRes.bandColor,
      maxNonSaudi,
      maxNonSaudiPct,
      requiredSaudi,
      targetThreshold: threshold,
      canHireMore,
      mustHireSaudi,
    });
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--primary)" }}>
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-primary-foreground">
            <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="11" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M12 9c1.5.5 3 1.5 3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-base" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>رصيد الاستقطاب المتوقع</h3>
          <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>الحد الأقصى للعمالة غير السعودية وفق نطاقات المطور 2026</p>
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl p-3 mb-4 text-base leading-relaxed" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>
        يحسب هذا القسم الحد الأقصى المسموح به من العمالة الوافدة (غير السعودية) بناءً على نشاط المنشأة وحجمها والنطاق المستهدف، وفق معادلة نطاقات المطور الرسمية 2026.
      </div>

      {/* Activity */}
      <div className="mb-3">
        <label className="block text-base font-semibold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>النشاط الاقتصادي</label>
        <select value={selectedActivity.name} onChange={e => { const act = activities2026.find(a => a.name === e.target.value); if (act) setSelectedActivity(act); setResult(null); }}
          className="muw-input text-base py-2 w-full" style={{ fontFamily: "'Cairo', sans-serif" }}>
          {activities2026.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
      </div>

      {/* Target Band */}
      <div className="mb-3">
        <label className="block text-base font-semibold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>النطاق المستهدف</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(["low", "mid", "high", "plat"] as const).map(b => (
            <button key={b} onClick={() => { setTargetBand(b); setResult(null); }}
              className="py-2 rounded-lg text-base font-bold transition-all"
              style={{ fontFamily: "'Cairo', sans-serif", background: targetBand === b ? bandColors[b] : "var(--secondary)", color: targetBand === b ? "var(--foreground)" : "var(--muted-foreground)", border: `1px solid ${targetBand === b ? bandColors[b] : "var(--border)"}` }}>
              {bandLabels[b]}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-base font-semibold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>إجمالي الموظفين</label>
          <input type="number" min="1" value={totalEmp} onChange={e => { setTotalEmp(e.target.value); setResult(null); }}
            placeholder="مثال: 20" className="muw-input text-base py-2" style={{ fontFamily: "'Cairo', sans-serif" }} />
        </div>
        <div>
          <label className="block text-base font-semibold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>الموظفون السعوديون الحاليون</label>
          <input type="number" min="0" value={saudiEmp} onChange={e => { setSaudiEmp(e.target.value); setResult(null); }}
            placeholder="مثال: 4" className="muw-input text-base py-2" style={{ fontFamily: "'Cairo', sans-serif" }} />
        </div>
      </div>

      <button onClick={calcRecruitment}
        className="w-full py-2.5 rounded-xl font-bold text-base mb-4 transition-all"
        style={{ fontFamily: "'Cairo', sans-serif", background: "var(--primary)", color: "var(--primary-foreground)" }}>
        احسب رصيد الاستقطاب
      </button>

      {result && (
        <div className="space-y-3">
          {/* Current Status */}
          <div className="rounded-xl p-3" style={{ background: "var(--secondary)", border: `1px solid ${result.currentBandColor}40` }}>
            <p className="text-base font-bold mb-2" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>الوضع الحالي</p>
            <div className="flex items-center justify-between">
              <span className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>نسبة التوطين الحالية: <strong style={{ color: "var(--foreground)" }}>{result.currentPct.toFixed(1)}%</strong></span>
              <span className="text-base font-bold px-2 py-0.5 rounded-full" style={{ background: `${result.currentBandColor}30`, color: result.currentBandColor }}>{result.currentBand}</span>
            </div>
          </div>

          {/* Main Result */}
          <div className="rounded-xl p-4" style={{ background: "var(--secondary)", border: `1px solid ${bandColors[targetBand]}50` }}>
            <p className="text-base font-bold mb-3" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>للوصول إلى نطاق <span style={{ color: bandColors[targetBand] }}>{bandLabels[targetBand]}</span> (حد أدنى {result.targetThreshold.toFixed(1)}%)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg" style={{ background: "var(--card)" }}>
                <p className="text-2xl font-black" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--danger)" }}>{result.maxNonSaudi}</p>
                <p className="text-base mt-0.5" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>الحد الأقصى للوافدين</p>
                <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>({result.maxNonSaudiPct.toFixed(1)}% من الإجمالي)</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: "var(--card)" }}>
                <p className="text-2xl font-black" style={{ fontFamily: "'Cairo', sans-serif", color: bandColors[targetBand] }}>{result.requiredSaudi}</p>
                <p className="text-base mt-0.5" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>الحد الأدنى للسعوديين</p>
                <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>({result.targetThreshold.toFixed(1)}% من الإجمالي)</p>
              </div>
            </div>
          </div>

          {/* Action Required */}
          <div className="rounded-xl p-3" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
            {result.mustHireSaudi > 0 ? (
              <div className="flex items-start gap-2">
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--warning)" }}>
                  <path d="M8 2L14 14H2L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="text-base font-bold mb-0.5" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--warning)" }}>يلزم توطين {result.mustHireSaudi} موظف إضافي</p>
                  <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>لتحقيق النطاق المستهدف، يجب تعيين {result.mustHireSaudi} سعودي إضافي قبل استقطاب عمالة وافدة جديدة.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }}>
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="text-base font-bold mb-0.5" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--success)" }}>يمكن استقطاب {result.canHireMore} وافد إضافي</p>
                  <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>المنشأة تحقق النطاق المستهدف حالياً ويمكنها استقطاب {result.canHireMore} موظف وافد إضافي مع الحفاظ على النطاق.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NitaqatMutawarCalculator({ activities2026 }: { activities2026: any[] }) {
  const [totalEmp, setTotalEmp] = useState("");
  const [saudiEmp, setSaudiEmp] = useState("");
  const [selectedActivity, setSelectedActivity] = useState(activities2026[0]);
  const [nitaqatResult, setNitaqatResult] = useState<null | { percentage: number; band: string; bandColor: string; mdaRange: string; thresholds: { low: number; mid: number; high: number; plat: number } }>(null);

  const calcNitaqat = () => {
    const s = parseFloat(totalEmp);
    const sa = parseFloat(saudiEmp);
    if (!s || s <= 0 || sa < 0 || sa > s) return;
    const pct = (sa / s) * 100;
    const res = calcNitaqatBand(pct, s, selectedActivity);
    setNitaqatResult({ percentage: pct, ...res });
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--primary)" }}>
          <Scale size={14} className="text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-bold text-base" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>معادلة احتساب نطاقات المطور 2026</h3>
          <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>وفق الدليل الإجرائي لبرنامج نطاقات المطور - قرار 182495</p>
        </div>
      </div>

      {/* Formula */}
      <div className="rounded-xl p-4 mb-4" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
        <p className="text-base font-bold mb-3 text-center" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>معادلة الاحتساب الأساسية</p>
        <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
          <div className="rounded-lg px-3 py-2" style={{ background: "var(--secondary)" }}>
            <p className="font-black text-base" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>نسبة التوطين (%)</p>
          </div>
          <span style={{ color: "var(--muted-foreground)" }}>=</span>
          <div className="rounded-lg px-3 py-2 text-center" style={{ background: "var(--secondary)" }}>
            <div className="pb-1 mb-1" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
              <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>عدد السعوديين</p>
            </div>
            <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>إجمالي الموظفين</p>
          </div>
          <span style={{ color: "var(--muted-foreground)" }}>×</span>
          <div className="rounded-lg px-3 py-2" style={{ background: "var(--secondary)" }}>
            <p className="font-black text-base" style={{ color: "var(--foreground)" }}>100</p>
          </div>
        </div>
        <p className="text-base text-center" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>
          * تُحتسب فقط عقود العمل الموثقة عبر منصة قوى (تحديث مارس 2026)
        </p>
      </div>

      {/* Activity Selector */}
      <div className="mb-3">
        <label className="block text-base font-semibold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>النشاط الاقتصادي</label>
        <select
          value={selectedActivity.name}
          onChange={e => { const act = activities2026.find(a => a.name === e.target.value); if (act) setSelectedActivity(act); setNitaqatResult(null); }}
          className="muw-input text-base py-2 w-full" style={{ fontFamily: "'Cairo', sans-serif" }}>
          {activities2026.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-base font-semibold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>إجمالي الموظفين</label>
          <input type="number" min="1" value={totalEmp} onChange={e => { setTotalEmp(e.target.value); setNitaqatResult(null); }}
            placeholder="مثال: 20" className="muw-input text-base py-2" style={{ fontFamily: "'Cairo', sans-serif" }} />
        </div>
        <div>
          <label className="block text-base font-semibold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>الموظفون السعوديون</label>
          <input type="number" min="0" value={saudiEmp} onChange={e => { setSaudiEmp(e.target.value); setNitaqatResult(null); }}
            placeholder="مثال: 5" className="muw-input text-base py-2" style={{ fontFamily: "'Cairo', sans-serif" }} />
        </div>
      </div>

      <button onClick={calcNitaqat} disabled={!totalEmp || !saudiEmp}
        className="w-full py-2.5 font-bold text-base rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ fontFamily: "'Cairo', sans-serif", background: "var(--primary)", color: "var(--primary-foreground)" }}>
        <Scale size={13} />احسب النطاق
      </button>

      {nitaqatResult && (
        <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: `${nitaqatResult.bandColor}40`, background: `${nitaqatResult.bandColor}10` }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${nitaqatResult.bandColor}20` }}>
              <span className="font-black text-base" style={{ color: nitaqatResult.bandColor, fontFamily: "'Cairo', sans-serif" }}>{nitaqatResult.percentage.toFixed(1)}%</span>
            </div>
            <div>
              <p className="font-bold text-base" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>
                نطاق: <span style={{ color: nitaqatResult.bandColor }}>{nitaqatResult.band}</span>
              </p>
              <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>مدى النطاق: {nitaqatResult.mdaRange}</p>
            </div>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(nitaqatResult.percentage, 100)}%`, background: nitaqatResult.bandColor }} />
          </div>
        </div>
      )}

      {/* Dynamic Bands Reference - based on selected activity and employee count */}
      {nitaqatResult && nitaqatResult.thresholds && (
        <div className="mt-4">
          <p className="text-base font-bold mb-2" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>حدود النطاقات لنشاط "{selectedActivity.name}" بعدد موظفين {totalEmp}</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {[
              { band: "بلاتيني", color: "var(--primary)", desc: `${nitaqatResult.thresholds.plat.toFixed(1)}%+` },
              { band: "أخضر↑", color: "var(--success)", desc: `${nitaqatResult.thresholds.high.toFixed(1)}%` },
              { band: "أخضر", color: "var(--success)", desc: `${nitaqatResult.thresholds.mid.toFixed(1)}%` },
              { band: "أخضر↓", color: "var(--success)", desc: `${nitaqatResult.thresholds.low.toFixed(1)}%` },
              { band: "أحمر", color: "var(--danger)", desc: `<${nitaqatResult.thresholds.low.toFixed(1)}%` },
            ].map(({ band, color, desc }) => (
              <div key={band} className="flex flex-col items-center gap-1 p-2 rounded-lg" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <p className="text-base font-bold" style={{ color, fontFamily: "'Cairo', sans-serif" }}>{band}</p>
                <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {!nitaqatResult && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {[
            { band: "بلاتيني", color: "var(--primary)", desc: "أعلى" },
            { band: "أخضر↑", color: "var(--success)", desc: "مرتفع" },
            { band: "أخضر", color: "var(--success)", desc: "متوسط" },
            { band: "أخضر↓", color: "var(--success)", desc: "منخفض" },
            { band: "أحمر", color: "var(--danger)", desc: "مخالف" },
          ].map(({ band, color, desc }) => (
            <div key={band} className="flex flex-col items-center gap-1 p-2 rounded-lg" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <p className="text-base font-bold" style={{ color, fontFamily: "'Cairo', sans-serif" }}>{band}</p>
              <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CalculatorPage() {
  const [, navigate] = useLocation();
  const { t, lang, dir, toggleLang } = useLang();

  // ── Fetch data from DB ──
  const { data: siteConfig   } = api.config.getAll.useQuery();
  const LOGO_URL = siteConfig?.logo_url ?? LOGO_URL_DEFAULT;
  const { data: calculatorData, isLoading: isCalcLoading } = api.calculator.getAll.useQuery();
  const professionCategories: ProfessionCategory[] = useMemo(() => calculatorData?.professionCategories ?? [], [calculatorData]);
  const activities2026 = useMemo(() => calculatorData?.activities2026 ?? [], [calculatorData]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedProfession = professionCategories.find(p => p.id === selectedId) ?? professionCategories[0] ?? null;
  const [totalEmployees, setTotalEmployees] = useState("");
  const [saudiEmployees, setSaudiEmployees] = useState("");
  const [result, setResult] = useState<NitaqatResult | null>(null);
  const [showFormula, setShowFormula] = useState(false);
  const [activeTab, setActiveTab] = useState<"professions" | "nitaqat" | "recruitment">("professions");

  const calculate = () => {
    const total = parseFloat(totalEmployees);
    const saudi = parseFloat(saudiEmployees);
    if (!total || !saudi || total <= 0 || saudi < 0 || saudi > total) return;
    const percentage = (saudi / total) * 100;
    setResult(getNitaqatBand(percentage, selectedProfession?.required ?? null));
  };

  const reset = () => { setTotalEmployees(""); setSaudiEmployees(""); setResult(null); };

  const neededSaudi = () => {
    if (!totalEmployees || !selectedProfession?.required) return null;
    return Math.ceil((selectedProfession?.required / 100) * parseFloat(totalEmployees));
  };

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b bg-background/95 border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-base font-semibold transition-colors"
            style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}>
            <ArrowRight size={18} style={{ transform: dir === "ltr" ? "rotate(180deg)" : "none" }} />{t("رجوع", "Back")}
          </button>
          <div className="flex items-center gap-3">
            <button onClick={toggleLang} className="px-3 py-1 rounded-md text-base font-bold border transition-all" style={{ fontFamily: "'Cairo', sans-serif", background: "transparent", borderColor: "var(--border)", color: "var(--muted-foreground)" }} title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}>{lang === "ar" ? "EN" : "ع"}</button>
            <img src={LOGO_URL} alt="مواكبة" className="w-8 h-8 object-contain" />
            <span className="font-black text-lg" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: "var(--foreground)" }}>{t("مواكبة", "Muwakaba")}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <p className="text-base tracking-widest uppercase mb-3 font-semibold" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>{t("مواكبة للتوطين", "Muwakaba Saudization")}</p>
          <h1 className="text-4xl font-black mb-3" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: "var(--foreground)" }}>{t("حاسبة التوطين", "Saudization Calculator")}</h1>
          <p className="text-lg" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>{t("احسب نسبة التوطين وفق أحدث قرارات وزارة الموارد البشرية 2026", "Calculate Saudization ratio per latest HRSD decisions 2026")}</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-8 p-2 rounded-2xl max-w-2xl mx-auto lg:max-w-none" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
          <button onClick={() => setActiveTab("professions")}
            className="py-3 rounded-xl text-base font-bold transition-all"
            style={{ fontFamily: "'Cairo', sans-serif", background: activeTab === "professions" ? "var(--primary)" : "transparent", color: activeTab === "professions" ? "var(--primary-foreground)" : "var(--muted-foreground)" }}>
            {t("حاسبة المهن", "Professions")}
          </button>
          <button onClick={() => setActiveTab("nitaqat")}
            className="py-3 rounded-xl text-base font-bold transition-all"
            style={{ fontFamily: "'Cairo', sans-serif", background: activeTab === "nitaqat" ? "var(--primary)" : "transparent", color: activeTab === "nitaqat" ? "var(--primary-foreground)" : "var(--muted-foreground)" }}>
            {t("نطاقات", "Nitaqat")}
          </button>
          <button onClick={() => setActiveTab("recruitment")}
            className="py-3 rounded-xl text-base font-bold transition-all"
            style={{ fontFamily: "'Cairo', sans-serif", background: activeTab === "recruitment" ? "var(--primary)" : "transparent", color: activeTab === "recruitment" ? "var(--primary-foreground)" : "var(--muted-foreground)" }}>
            {t("الاستقطاب", "Recruitment")}
          </button>
        </div>

        {activeTab === "professions" && (
          <div className="lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Formula Toggle */}
            <div className="mb-4">
              <button onClick={() => setShowFormula(!showFormula)}
                className="w-full rounded-xl p-3 flex items-center justify-between transition-colors"
                style={{ border: `1px solid ${"var(--border)"}`, background: "var(--card)" }}>
                <div className="flex items-center gap-2">
                  <Info size={13} style={{ color: "var(--muted-foreground)" }} />
                  <span className="text-base font-semibold" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>معادلة احتساب نسبة التوطين</span>
                </div>
                <ChevronDown size={13} style={{ color: "var(--muted-foreground)", transform: showFormula ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>

              {showFormula && (
                <div className="rounded-xl p-4 mt-1" style={{ border: `1px solid ${"var(--border)"}`, background: "var(--card)" }}>
                  <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
                    <span className="text-base font-black" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>نسبة التوطين (%)</span>
                    <span style={{ color: "var(--muted-foreground)" }}>=</span>
                    <div className="text-center">
                      <div className="pb-0.5 mb-0.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                        <span className="text-base font-bold" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>عدد الموظفين السعوديين</span>
                      </div>
                      <span className="text-base font-bold" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>إجمالي الموظفين</span>
                    </div>
                    <span style={{ color: "var(--muted-foreground)" }}>×</span>
                    <span className="text-base font-black" style={{ color: "var(--foreground)" }}>100</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { title: "شرط الاحتساب", desc: "مسجل في التأمينات وعقده موثق في قوى" },
                      { title: "الحد الأدنى للأجر", desc: "5,500 ريال للتسويق والمبيعات معاً" },
                      { title: "نطاق التطبيق", desc: "المنشآت ذات 3 موظفين فأكثر" },
                    ].map((item, i) => (
                      <div key={i} className="rounded-lg p-2" style={{ background: "var(--secondary)" }}>
                        <p className="text-base font-bold mb-0.5" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>{item.title}</p>
                        <p className="text-base leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Calculator Card */}
            {isCalcLoading || !selectedProfession ? (
              <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p style={{ color: "var(--muted-foreground)", fontFamily: "'Cairo', sans-serif" }}>{t("جاري التحميل…", "Loading…")}</p>
              </div>
            ) : (
              <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--primary)" }}>
                  <Calculator size={14} className="text-primary-foreground" />
                </div>
                <h3 className="text-base font-bold" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>احسب نسبة التوطين</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-base font-semibold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>نوع المهنة / القطاع</label>
                  <select value={selectedProfession?.id ?? ""}
                    onChange={(e) => { setSelectedId(e.target.value); setResult(null); }}
                    className="muw-select text-base" style={{ fontFamily: "'Cairo', sans-serif" }}>
                    {professionCategories.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} {p.required ? `(${p.required}%)` : "(نطاقات)"}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 p-2 rounded-lg" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
                    <p className="text-base font-semibold" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>{selectedProfession?.note}</p>
                    <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>أمثلة: {selectedProfession?.examples}</p>
                    {selectedProfession?.minWage && (
                      <div className="mt-1.5 flex items-center gap-1.5 pt-1.5" style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                        <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3 flex-shrink-0" style={{ color: "var(--warning)" }}>
                          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                        <p className="text-base font-bold" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--warning)" }}>
                          الحد الأدنى للأجر: <span style={{ color: "var(--foreground)" }}>{selectedProfession?.minWage}</span>
                        </p>
                      </div>
                    )}
                    {selectedProfession?.jobs && selectedProfession?.jobs.length > 0 && (
                      <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                        <p className="text-base font-bold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>الوظائف الموطنة والحد الأدنى لكل وظيفة:</p>
                        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${"var(--border)"}` }}>
                          <table className="w-full text-base" style={{ fontFamily: "'Cairo', sans-serif" }}>
                            <thead>
                              <tr style={{ background: "var(--secondary)" }}>
                                <th className="text-right px-2 py-1.5 font-bold" style={{ color: "var(--muted-foreground)" }}>#</th>
                                <th className="text-right px-2 py-1.5 font-bold" style={{ color: "var(--muted-foreground)" }}>المسمى الوظيفي</th>
                                <th className="text-right px-2 py-1.5 font-bold" style={{ color: "var(--warning)" }}>الحد الأدنى</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedProfession?.jobs.map((job, idx) => (
                                <tr key={idx} style={{ background: idx % 2 === 0 ? "var(--secondary)" : "transparent", borderTop: `1px solid ${"var(--border)"}` }}>
                                  <td className="px-2 py-1.5" style={{ color: "var(--muted-foreground)" }}>{idx + 1}</td>
                                  <td className="px-2 py-1.5 font-semibold" style={{ color: "var(--foreground)" }}>{job.name}</td>
                                  <td className="px-2 py-1.5 font-bold" style={{ color: "oklch(0.75 0.18 145)" }}>{job.minWage?.toLocaleString()} ريال</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-base font-semibold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>إجمالي الموظفين</label>
                    <input type="number" min="1" value={totalEmployees}
                      onChange={(e) => { setTotalEmployees(e.target.value); setResult(null); }}
                      placeholder="مثال: 10" className="muw-input text-base" style={{ fontFamily: "'Cairo', sans-serif" }} />
                  </div>
                  <div>
                    <label className="block text-base font-semibold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>الموظفون السعوديون</label>
                    <input type="number" min="0" value={saudiEmployees}
                      onChange={(e) => { setSaudiEmployees(e.target.value); setResult(null); }}
                      placeholder="مثال: 6" className="muw-input text-base" style={{ fontFamily: "'Cairo', sans-serif" }} />
                  </div>
                </div>

                {totalEmployees && selectedProfession?.required && (
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
                    <TrendingUp size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>
                      النسبة المطلوبة ({selectedProfession?.required}%) تستلزم{" "}
                      <span className="font-bold" style={{ color: "var(--foreground)" }}>{neededSaudi()}</span> موظف/ة سعودي/ة على الأقل
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={calculate} disabled={!totalEmployees || !saudiEmployees}
                    className="flex-1 py-2.5 font-bold text-base rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ fontFamily: "'Cairo', sans-serif", background: "var(--primary)", color: "var(--primary-foreground)" }}>
                    <Calculator size={13} />احسب الآن
                  </button>
                  {result && (
                    <button onClick={reset} className="px-4 py-2.5 text-base rounded-xl transition-all"
                      style={{ fontFamily: "'Cairo', sans-serif", border: `1px solid ${"var(--border)"}`, color: "var(--muted-foreground)" }}>
                      إعادة
                    </button>
                  )}
                </div>
              </div>

              {result && (
                <div className="mt-4 p-4 rounded-xl border lg:mt-0" style={{ borderColor: `${result.bandColor}35`, background: `${result.bandColor}08` }}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${result.bandColor}20`, color: result.bandColor }}>
                      {result.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base px-2 py-0.5 rounded-full font-bold" style={{ background: `${result.bandColor}20`, color: result.bandColor }}>{result.band}</span>
                        <span className="text-2xl font-black" style={{ color: result.bandColor, fontFamily: "'Cairo', sans-serif" }}>{result.percentage.toFixed(1)}%</span>
                      </div>
                      <p className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>{result.description}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-base mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>
                      <span>0%</span>
                      {selectedProfession?.required && <span>المطلوب: {selectedProfession?.required}%</span>}
                      <span>100%</span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(result.percentage, 100)}%`, background: result.bandColor }} />
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
                    <p className="text-base font-bold mb-0.5" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>التوصية:</p>
                    <p className="text-base leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>{result.recommendation}</p>
                  </div>

                  {/* مؤشر التدريج الزمني */}
                  {selectedProfession?.phases && selectedProfession?.phases.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
                      <p className="text-base font-bold mb-2" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>مسار التدريج الزمني</p>
                      <div className="space-y-1.5">
                        {selectedProfession?.phases.map((phase: { date: string; rate: number; label: string }, idx: number) => {
                          const now = new Date();
                          const phaseDate = new Date(phase.date);
                          const isPast = phaseDate <= now;
                          const isNext = !isPast && selectedProfession?.phases!.filter((p: { date: string }) => new Date(p.date) <= now).length === idx;
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: isPast ? "var(--primary)" : isNext ? "var(--warning-strong)" : "var(--muted-foreground)" }} />
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-base" style={{ fontFamily: "'Cairo', sans-serif", color: isPast ? "var(--muted-foreground)" : isNext ? "var(--warning-strong)" : "var(--muted-foreground)" }}>{phase.label}</span>
                                <span className="text-base font-bold" style={{ fontFamily: "'Cairo', sans-serif", color: isPast ? "var(--primary)" : isNext ? "var(--warning-strong)" : "var(--muted-foreground)" }}>{phase.rate}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {activeTab === "nitaqat" && <NitaqatMutawarCalculator activities2026={activities2026} />}
        {activeTab === "recruitment" && <RecruitmentBalanceCalculator activities2026={activities2026} />}
      </main>
      <ServiceRating serviceId="calculator" serviceName="حاسبة التوطين ونطاقات" />
    </div>
  );
}
