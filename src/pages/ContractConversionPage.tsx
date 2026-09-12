import ServiceRating from "@/components/ServiceRating";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

// ─────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────
const CYAN = "var(--info)";
const CYAN_DIM = "oklch(0.55 0.22 195 / 0.12)";
const CYAN_BORDER = "oklch(0.55 0.22 195 / 0.35)";
const GOLD = "var(--accent)";
const GOLD_DIM = "oklch(0.62 0.20 55 / 0.12)";
const GOLD_BORDER = "oklch(0.62 0.20 55 / 0.35)";
const GREEN = "var(--success)";
const GREEN_DIM = "oklch(0.60 0.18 145 / 0.12)";
const GREEN_BORDER = "oklch(0.60 0.18 145 / 0.35)";
const RED = "oklch(0.58 0.22 25)";
const RED_DIM = "oklch(0.58 0.22 25 / 0.12)";
const RED_BORDER = "oklch(0.58 0.22 25 / 0.35)";
const PURPLE = "var(--primary)";
const PURPLE_DIM = "color-mix(in oklch, var(--primary) 12%, transparent)";
const PURPLE_BORDER = "color-mix(in oklch, var(--primary) 35%, transparent)";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface RenewalPeriod {
  id: number;
  months: number;
}

type ConversionReason =
  | "stays_fixed_long"        // العقد > 4 سنوات → يبقى محدد المدة
  | "continued_no_auto"       // استمر الطرفان بعد النهاية بدون تجديد تلقائي
  | "three_renewals"          // 3 تجديدات سنوية
  | "four_years"              // إكمال 4 سنوات
  | "total_under_four_years"  // مجموع العقد + التجديدات < 4 سنوات → يتحول عند الانتهاء
  | "no_conversion";          // لا يوجد تحول

interface ConversionResult {
  willConvert: boolean;
  convertedAt: Date | null;
  reason: ConversionReason;
  reasonLabel: string;
  article: string;
  totalMonthsAtConversion: number;
  renewalCount: number;
  contractEndDate: Date;
  totalWithRenewals: Date;
  timeline: TimelineItem[];
  currentStatus: "active_original" | "active_renewal" | "converted" | "ended_fixed" | "continued_no_auto";
  isSaudi: boolean;
}

interface TimelineItem {
  label: string;
  date: Date;
  type: "start" | "end_original" | "renewal" | "conversion" | "four_years" | "today" | "continued";
  note?: string;
}

// ─────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function monthsBetween(a: Date, b: Date): number {
  return Math.round((b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() - a.getDate()) / 30);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ar-SA-u-ca-gregory", { day: "2-digit", month: "long", year: "numeric" });
}

function formatHijri(date: Date): string {
  try {
    return date.toLocaleDateString("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} شهر`;
  if (rem === 0) return `${years} ${years === 1 ? "سنة" : "سنوات"}`;
  return `${years} ${years === 1 ? "سنة" : "سنوات"} و${rem} شهر`;
}

// ─────────────────────────────────────────────
// Core calculation — Article 37 Saudi Labor Law
//
// القواعد:
// 1. غير سعودي: لا تحول تلقائي (العقد يبقى محدد المدة دائماً)
// 2. سعودي + عقد > 4 سنوات: يبقى محدد المدة حتى نهايته
// 3. سعودي + استمر الطرفان بعد النهاية بدون تجديد تلقائي: يتحول فوراً لغير محدد
// 4. سعودي + تجديد سنوي: بعد 3 تجديدات يتحول (نهاية التجديد الثالث)
// 5. سعودي + مجموع العقد + التجديدات ≤ 4 سنوات: يتحول عند انتهاء المجموع
// 6. أيهما أقرب: 4 سنوات أو 3 تجديدات
// ─────────────────────────────────────────────
function calculateConversion(
  startDate: Date,
  initialMonths: number,
  renewals: RenewalPeriod[],
  isSaudi: boolean,
  hasAutoRenewal: boolean,
  continuedAfterEnd: boolean,
  today: Date
): ConversionResult | null {
  if (!startDate || initialMonths <= 0) return null;

  const contractEndDate = addMonths(startDate, initialMonths);
  const validRenewals = renewals.filter(r => r.months > 0);
  const timeline: TimelineItem[] = [];

  timeline.push({ label: "بداية العقد", date: startDate, type: "start" });
  timeline.push({ label: "نهاية العقد الأصلي", date: contractEndDate, type: "end_original" });

  // ── غير سعودي: لا تحول ──
  if (!isSaudi) {
    timeline.push({ label: "اليوم", date: today, type: "today" });
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    const currentStatus = today < contractEndDate ? "active_original" : "ended_fixed";
    return {
      willConvert: false,
      convertedAt: null,
      reason: "no_conversion",
      reasonLabel: "العامل غير سعودي — لا يسري التحول التلقائي لعقد غير محدد المدة",
      article: "المادة 37 من نظام العمل (تسري على السعوديين فقط)",
      totalMonthsAtConversion: initialMonths,
      renewalCount: 0,
      contractEndDate,
      totalWithRenewals: contractEndDate,
      timeline,
      currentStatus,
      isSaudi: false,
    };
  }

  // ── سعودي + عقد > 4 سنوات: يبقى محدد المدة ──
  if (initialMonths > 48) {
    timeline.push({ label: "اليوم", date: today, type: "today" });
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    const currentStatus = today < contractEndDate ? "active_original" : "ended_fixed";
    return {
      willConvert: false,
      convertedAt: null,
      reason: "stays_fixed_long",
      reasonLabel: "مدة العقد الأصلية تتجاوز أربع سنوات — يستمر محدد المدة حتى نهايته",
      article: "المادة 37 من نظام العمل",
      totalMonthsAtConversion: initialMonths,
      renewalCount: 0,
      contractEndDate,
      totalWithRenewals: contractEndDate,
      timeline,
      currentStatus,
      isSaudi: true,
    };
  }

  // ── سعودي + استمر الطرفان بعد النهاية بدون تجديد تلقائي ──
  if (continuedAfterEnd && !hasAutoRenewal && today > contractEndDate) {
    timeline.push({
      label: "تحول فوري لعقد غير محدد المدة",
      date: contractEndDate,
      type: "conversion",
      note: "استمرار الطرفين بعد انتهاء العقد بدون بند تجديد تلقائي",
    });
    timeline.push({ label: "اليوم", date: today, type: "today" });
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    return {
      willConvert: true,
      convertedAt: contractEndDate,
      reason: "continued_no_auto",
      reasonLabel: "استمر الطرفان في تنفيذ العقد بعد انتهائه دون بند تجديد تلقائي",
      article: "المادة 37 من نظام العمل — الفقرة الثالثة",
      totalMonthsAtConversion: monthsBetween(startDate, contractEndDate),
      renewalCount: 0,
      contractEndDate,
      totalWithRenewals: contractEndDate,
      timeline,
      currentStatus: "continued_no_auto",
      isSaudi: true,
    };
  }

  // ── سعودي + عقد ≤ 4 سنوات: حساب التجديدات ──
  const fourYearMark = addMonths(startDate, 48);
  let currentEnd = contractEndDate;
  let threeRenewalsDate: Date | null = null;
  let fourYearsDate: Date | null = null;
  let totalRenewalMonths = 0;
  let lastRenewalEnd = contractEndDate;

  // هل تاريخ 4 سنوات يقع ضمن العقد الأصلي؟
  if (contractEndDate >= fourYearMark) {
    fourYearsDate = fourYearMark;
  }

  for (let i = 0; i < validRenewals.length; i++) {
    const r = validRenewals[i];
    const renewalStart = currentEnd;
    const renewalEnd = addMonths(renewalStart, r.months);
    totalRenewalMonths += r.months;
    lastRenewalEnd = renewalEnd;

    timeline.push({
      label: `تجديد ${i + 1}${r.months === 12 ? " (سنوي)" : ` (${r.months} شهر)`}`,
      date: renewalStart,
      type: "renewal",
    });

    // تحقق من 3 تجديدات — يتحول عند نهاية التجديد الثالث
    if (i + 1 === 3 && !threeRenewalsDate) {
      threeRenewalsDate = renewalEnd;
    }

    // تحقق من 4 سنوات
    if (!fourYearsDate && currentEnd < fourYearMark && renewalEnd >= fourYearMark) {
      fourYearsDate = fourYearMark;
    }

    currentEnd = renewalEnd;
  }

  // إذا لم تتحقق أي شروط التحول
  const candidates: { date: Date; reason: ConversionReason; label: string }[] = [];

  if (fourYearsDate) {
    candidates.push({
      date: fourYearsDate,
      reason: "four_years",
      label: "إكمال أربع سنوات من تاريخ المباشرة",
    });
  }

  if (threeRenewalsDate) {
    candidates.push({
      date: threeRenewalsDate,
      reason: "three_renewals",
      label: "انتهاء التجديد الثالث المتتالي",
    });
  }

  // إذا كان مجموع العقد + التجديدات < 4 سنوات → يتحول عند انتهاء المجموع
  const totalMonthsWithRenewals = initialMonths + totalRenewalMonths;
  if (totalMonthsWithRenewals > 0 && totalMonthsWithRenewals <= 48 && validRenewals.length > 0) {
    candidates.push({
      date: lastRenewalEnd,
      reason: "total_under_four_years",
      label: "انتهاء مجموع مدد العقد والتجديدات (أقل من أربع سنوات)",
    });
  }

  // إذا لم تتحقق أي شروط
  if (candidates.length === 0) {
    timeline.push({ label: "اليوم", date: today, type: "today" });
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    const currentStatus = today < contractEndDate ? "active_original" : "ended_fixed";
    return {
      willConvert: false,
      convertedAt: null,
      reason: "no_conversion",
      reasonLabel: "لم تتحقق شروط التحول — العقد ينتهي في تاريخه المحدد",
      article: "المادة 37 من نظام العمل",
      totalMonthsAtConversion: totalMonthsWithRenewals || initialMonths,
      renewalCount: validRenewals.length,
      contractEndDate,
      totalWithRenewals: lastRenewalEnd,
      timeline,
      currentStatus,
      isSaudi: true,
    };
  }

  // اختر الأسبق
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const winner = candidates[0];

  timeline.push({
    label: "تحول إلى عقد غير محدد المدة",
    date: winner.date,
    type: "conversion",
    note: winner.label,
  });
  timeline.push({ label: "اليوم", date: today, type: "today" });
  timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

  // تحديد الوضع الحالي
  let currentStatus: ConversionResult["currentStatus"] = "active_original";
  if (today >= winner.date) {
    currentStatus = "converted";
  } else if (today >= contractEndDate) {
    currentStatus = "active_renewal";
  }

  return {
    willConvert: true,
    convertedAt: winner.date,
    reason: winner.reason,
    reasonLabel: winner.label,
    article: "المادة 37 من نظام العمل",
    totalMonthsAtConversion: monthsBetween(startDate, winner.date),
    renewalCount: validRenewals.length,
    contractEndDate,
    totalWithRenewals: lastRenewalEnd,
    timeline,
    currentStatus,
    isSaudi: true,
  };
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function ContractConversionPage() {
  const [, navigate] = useLocation();
  const { t, lang, dir } = useLang();

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    marginBottom: "0.35rem",
    color: "var(--muted-foreground)",
    letterSpacing: "0.03em",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.75rem",
    borderRadius: "0.6rem",
    border: `1px solid ${"var(--border)"}`,
    background: "var(--input)",
    color: "var(--foreground)",
    fontSize: "0.9rem",
    outline: "none",
  };

  // ── State ──
  // الأداة مخصصة للسعوديين فقط — isSaudi ثابتة دائماً على true
  const isSaudi = true;
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [initialMonths, setInitialMonths] = useState<number | "">("");
  const [hasAutoRenewal, setHasAutoRenewal] = useState<boolean>(false);
  const [renewals, setRenewals] = useState<RenewalPeriod[]>([{ id: 1, months: 12 }]);
  const [renewalCount, setRenewalCount] = useState<number>(1);
  const [continuedAfterEnd, setContinuedAfterEnd] = useState<boolean>(false);
  const [todayStr, setTodayStr] = useState(() => new Date().toISOString().split("T")[0]);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [calculated, setCalculated] = useState(false);

  // ── Auto-fill months from start/end dates ──
  const handleStartDate = (val: string) => {
    setStartDateStr(val);
    if (val && endDateStr) {
      const s = new Date(val);
      const e = new Date(endDateStr);
      if (e > s) {
        const m = monthsBetween(s, e);
        if (m > 0) setInitialMonths(m);
      }
    }
  };
  const handleEndDate = (val: string) => {
    setEndDateStr(val);
    if (startDateStr && val) {
      const s = new Date(startDateStr);
      const e = new Date(val);
      if (e > s) {
        const m = monthsBetween(s, e);
        if (m > 0) setInitialMonths(m);
      }
    }
  };

  // ── Sync renewals array with count ──
  useEffect(() => {
    setRenewals(prev => {
      const arr = [...prev];
      while (arr.length < renewalCount) arr.push({ id: Date.now() + arr.length, months: 12 });
      return arr.slice(0, renewalCount);
    });
  }, [renewalCount]);

  const updateRenewal = (id: number, months: number) => {
    setRenewals(prev => prev.map(r => r.id === id ? { ...r, months } : r));
  };

  const handleCalculate = () => {
    if (!startDateStr || !initialMonths) return;
    const startDate = new Date(startDateStr);
    const months = Number(initialMonths);
    const today = new Date(todayStr);
    const res = calculateConversion(startDate, months, renewals, isSaudi, hasAutoRenewal, continuedAfterEnd, today);
    setResult(res);
    setCalculated(true);
  };

  const handleReset = () => {
    setStartDateStr("");
    setEndDateStr("");
    setInitialMonths("");
    setHasAutoRenewal(false);
    setRenewals([{ id: 1, months: 12 }]);
    setRenewalCount(1);
    setContinuedAfterEnd(false);
    setTodayStr(new Date().toISOString().split("T")[0]);
    setResult(null);
    setCalculated(false);
  };

  // ── Result colors ──
  const getResultColors = (reason: ConversionReason) => {
    switch (reason) {
      case "continued_no_auto": return { accent: RED, dim: RED_DIM, border: RED_BORDER };
      case "stays_fixed_long": return { accent: GOLD, dim: GOLD_DIM, border: GOLD_BORDER };
      case "no_conversion": return { accent: GOLD, dim: GOLD_DIM, border: GOLD_BORDER };
      case "three_renewals": return { accent: CYAN, dim: CYAN_DIM, border: CYAN_BORDER };
      case "four_years": return { accent: GREEN, dim: GREEN_DIM, border: GREEN_BORDER };
      case "total_under_four_years": return { accent: PURPLE, dim: PURPLE_DIM, border: PURPLE_BORDER };
      default: return { accent: CYAN, dim: CYAN_DIM, border: CYAN_BORDER };
    }
  };

  const getStatusLabel = (status: ConversionResult["currentStatus"]) => {
    switch (status) {
      case "active_original": return { label: "العقد ساري (المدة الأصلية)", color: GREEN };
      case "active_renewal": return { label: "العقد ساري (فترة التجديد)", color: CYAN };
      case "converted": return { label: "تحوّل إلى غير محدد المدة", color: GREEN };
      case "ended_fixed": return { label: "انتهى العقد محدد المدة", color: GOLD };
      case "continued_no_auto": return { label: "تحوّل فورياً (استمرار بدون تجديد)", color: RED };
      default: return { label: "غير محدد", color: "var(--muted-foreground)" };
    }
  };

  const getTimelineDotColor = (type: TimelineItem["type"]) => {
    switch (type) {
      case "start": return GREEN;
      case "end_original": return GOLD;
      case "renewal": return CYAN;
      case "conversion": return RED;
      case "four_years": return GREEN;
      case "today": return PURPLE;
      case "continued": return RED;
      default: return "var(--muted-foreground)";
    }
  };

  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "var(--background)",
          borderBottom: `1px solid ${"var(--border)"}`,
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "transparent",
            border: `1px solid ${"var(--border)"}`,
            borderRadius: "0.5rem",
            padding: "0.35rem 0.75rem",
            color: "var(--muted-foreground)",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          {lang === "ar" ? "← رجوع" : "← Back"}
        </button>
        <div>
          <h1 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
            {t("تحول العقد المحدد لغير محدد المدة", "Fixed-Term to Open-Ended Contract")}
          </h1>
          <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", margin: 0 }}>
            {t("المادة 37 من نظام العمل السعودي", "Article 37 — Saudi Labor Law")}
          </p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* ── Legal Cases Info ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}>
          {[
            { color: RED, icon: "⚡", title: "استمرار بعد النهاية", desc: "إذا استمر الطرفان بعد انتهاء العقد بدون بند تجديد تلقائي → يتحول فوراً" },
            { color: CYAN, icon: "🔄", title: "ثلاثة تجديدات سنوية", desc: "بعد انتهاء التجديد الثالث المتتالي → يتحول لغير محدد المدة" },
            { color: GREEN, icon: "📅", title: "إكمال أربع سنوات", desc: "عند بلوغ أربع سنوات من تاريخ المباشرة → يتحول (أيهما أقرب)" },
            { color: GOLD, icon: "📋", title: "عقد أكثر من 4 سنوات", desc: "إذا كانت مدة العقد الأصلية تتجاوز 4 سنوات → يبقى محدد المدة حتى نهايته" },
          ].map((item, i) => (
            <div key={i} style={{
              background: "var(--card)",
              border: `1px solid ${item.color}40`,
              borderRadius: "0.75rem",
              padding: "0.85rem",
              borderTop: `3px solid ${item.color}`,
            }}>
              <div style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>{item.icon}</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: item.color, marginBottom: "0.25rem" }}>{item.title}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Form + Result Layout ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "1.25rem",
        }}
          className="lg:grid-cols-2-contract"
        >
          {/* ── Form Card ── */}
          <div style={{
            background: "var(--card)",
            border: `1px solid ${"var(--border)"}`,
            borderRadius: "1rem",
            padding: "1.25rem",
          }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", color: "var(--foreground)" }}>
              بيانات العقد
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              {/* إشعار: الأداة للسعوديين فقط */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.6rem",
                  background: GREEN_DIM,
                  border: `1px solid ${GREEN_BORDER}`,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: GREEN,
                }}>
                  <span>🇸🇦</span>
                  <span>هذه الأداة مخصصة للعمال السعوديين فقط — المادة 37 من نظام العمل</span>
                </div>
              </div>

              {/* تاريخ المباشرة */}
              <div>
                <label style={labelStyle}>تاريخ المباشرة</label>
                <input
                  type="date"
                  value={startDateStr}
                  onChange={e => handleStartDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* تاريخ نهاية العقد */}
              <div>
                <label style={labelStyle}>تاريخ نهاية العقد</label>
                <input
                  type="date"
                  value={endDateStr}
                  onChange={e => handleEndDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* مدة العقد */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>مدة العقد الأصلية (بالأشهر)</label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={initialMonths}
                  onChange={e => setInitialMonths(e.target.value ? Number(e.target.value) : "")}
                  placeholder="مثال: 12 أو 24 أو 36"
                  style={inputStyle}
                />
                {initialMonths && Number(initialMonths) > 0 && (
                  <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                    = {formatDuration(Number(initialMonths))}
                    {Number(initialMonths) > 48 && (
                      <span style={{ color: GOLD, marginRight: "0.5rem" }}>⚠️ أكثر من 4 سنوات — يبقى محدد المدة</span>
                    )}
                  </div>
                )}
              </div>

              {/* تاريخ اليوم */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>تاريخ اليوم (لتحديد الوضع الحالي)</label>
                <input
                  type="date"
                  value={todayStr}
                  onChange={e => setTodayStr(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* بند التجديد التلقائي */}
            <div style={{
              background: "var(--secondary)",
              border: `1px solid ${"var(--border)"}`,
              borderRadius: "0.75rem",
              padding: "0.85rem",
              marginBottom: "0.75rem",
            }}>
              <label style={{ ...labelStyle, marginBottom: "0.5rem", fontSize: "0.8rem" }}>
                هل يوجد بند تجديد تلقائي في العقد؟
              </label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: hasAutoRenewal ? "0.75rem" : 0 }}>
                {[
                  { val: true, label: "✅ نعم" },
                  { val: false, label: "❌ لا" },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    onClick={() => setHasAutoRenewal(opt.val)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      borderRadius: "0.6rem",
                      border: `1px solid ${hasAutoRenewal === opt.val ? CYAN : "var(--border)"}`,
                      background: hasAutoRenewal === opt.val ? CYAN_DIM : "var(--input)",
                      color: hasAutoRenewal === opt.val ? CYAN : "var(--muted-foreground)",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      fontWeight: hasAutoRenewal === opt.val ? 700 : 400,
                      transition: "all 0.2s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {hasAutoRenewal && (
                <div>
                  <label style={{ ...labelStyle, marginBottom: "0.4rem" }}>
                    عدد مرات التجديد
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={renewalCount}
                    onChange={e => setRenewalCount(Math.max(1, Math.min(10, Number(e.target.value))))}
                    style={{ ...inputStyle, marginBottom: "0.5rem" }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {renewals.map((r, i) => (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", minWidth: "60px" }}>
                          تجديد {i + 1}:
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={r.months}
                          onChange={e => updateRenewal(r.id, Number(e.target.value))}
                          placeholder="مدة بالأشهر"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>شهر</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* هل استمر الطرفان بعد النهاية؟ */}
            <div style={{
              background: "var(--secondary)",
              border: `1px solid ${"var(--border)"}`,
              borderRadius: "0.75rem",
              padding: "0.85rem",
              marginBottom: "1rem",
            }}>
              <label style={{ ...labelStyle, marginBottom: "0.5rem", fontSize: "0.8rem" }}>
                هل استمر الطرفان في تنفيذ العقد بعد انتهائه؟
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[
                  { val: true, label: "✅ نعم" },
                  { val: false, label: "❌ لا" },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    onClick={() => setContinuedAfterEnd(opt.val)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      borderRadius: "0.6rem",
                      border: `1px solid ${continuedAfterEnd === opt.val ? RED : "var(--border)"}`,
                      background: continuedAfterEnd === opt.val ? RED_DIM : "var(--input)",
                      color: continuedAfterEnd === opt.val ? RED : "var(--muted-foreground)",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      fontWeight: continuedAfterEnd === opt.val ? 700 : 400,
                      transition: "all 0.2s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {continuedAfterEnd && !hasAutoRenewal && (
                <div style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  background: RED_DIM,
                  border: `1px solid ${RED_BORDER}`,
                  borderRadius: "0.5rem",
                  fontSize: "0.72rem",
                  color: RED,
                }}>
                  ⚠️ الاستمرار بدون بند تجديد تلقائي يُحوّل العقد فوراً لغير محدد المدة عند انتهاء المدة الأصلية
                </div>
              )}
            </div>

            {/* أزرار */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={handleCalculate}
                disabled={!startDateStr || !initialMonths}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: !startDateStr || !initialMonths ? "var(--border)" : CYAN,
                  color: !startDateStr || !initialMonths ? "var(--muted-foreground)" : "white",
                  cursor: !startDateStr || !initialMonths ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  transition: "all 0.2s",
                }}
              >
                احسب الآن
              </button>
              {calculated && (
                <button
                  onClick={handleReset}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    border: `1px solid ${"var(--border)"}`,
                    background: "transparent",
                    color: "var(--muted-foreground)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  إعادة
                </button>
              )}
            </div>
          </div>

          {/* ── Result Card ── */}
          <div>
            <AnimatePresence mode="wait">
              {calculated && result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Main result */}
                  {(() => {
                    const colors = getResultColors(result.reason);
                    const statusInfo = getStatusLabel(result.currentStatus);
                    return (
                      <div style={{
                        background: "var(--card)",
                        border: `2px solid ${colors.border}`,
                        borderRadius: "1rem",
                        padding: "1.25rem",
                        marginBottom: "1rem",
                      }}>
                        {/* Status badge */}
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.3rem 0.75rem",
                          borderRadius: "999px",
                          background: `${statusInfo.color}20`,
                          border: `1px solid ${statusInfo.color}50`,
                          color: statusInfo.color,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          marginBottom: "0.75rem",
                        }}>
                          <span>●</span>
                          <span>الوضع الحالي: {statusInfo.label}</span>
                        </div>

                        {/* Main verdict */}
                        <div style={{
                          padding: "1rem",
                          background: colors.dim,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "0.75rem",
                          marginBottom: "0.75rem",
                          textAlign: "center",
                        }}>
                          {result.willConvert ? (
                            <>
                              <div style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>🔄</div>
                              <div style={{ fontSize: "0.8rem", color: colors.accent, fontWeight: 700, marginBottom: "0.5rem" }}>
                                يتحول إلى عقد غير محدد المدة
                              </div>
                              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: colors.accent }}>
                                {formatDate(result.convertedAt!)}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                                {formatHijri(result.convertedAt!)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
                                {result.reason === "no_conversion" ? "📋" : result.reason === "stays_fixed_long" ? "⏳" : "🌍"}
                              </div>
                              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: colors.accent }}>
                                {result.reason === "no_conversion"
                                  ? "لا يتحول — العقد ينتهي في تاريخه"
                                  : result.reason === "stays_fixed_long"
                                  ? "يبقى محدد المدة حتى نهايته"
                                  : "لا يسري التحول التلقائي"}
                              </div>
                              <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "0.35rem" }}>
                                نهاية العقد: {formatDate(result.contractEndDate)}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Reason */}
                        <div style={{
                          padding: "0.6rem 0.85rem",
                          background: "var(--secondary)",
                          borderRadius: "0.6rem",
                          marginBottom: "0.75rem",
                          fontSize: "0.78rem",
                          color: "var(--foreground)",
                        }}>
                          <span style={{ color: "var(--muted-foreground)" }}>السبب القانوني: </span>
                          {result.reasonLabel}
                        </div>

                        {/* Article */}
                        <div style={{
                          padding: "0.5rem 0.85rem",
                          background: CYAN_DIM,
                          border: `1px solid ${CYAN_BORDER}`,
                          borderRadius: "0.6rem",
                          fontSize: "0.75rem",
                          color: CYAN,
                          marginBottom: "0.75rem",
                        }}>
                          📖 {result.article}
                        </div>

                        {/* Stats */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "0.5rem",
                        }}>
                          {[
                            { label: "مدة العقد الأصلية", value: formatDuration(Number(initialMonths)) },
                            { label: "عدد التجديدات", value: `${result.renewalCount} تجديد` },
                            { label: "المدة حتى التحول", value: result.willConvert ? formatDuration(result.totalMonthsAtConversion) : "—" },
                            { label: "الجنسية", value: "🇸🇦 سعودي" },
                          ].map((s, i) => (
                            <div key={i} style={{
                              padding: "0.5rem 0.65rem",
                              background: "var(--secondary)",
                              borderRadius: "0.5rem",
                              textAlign: "center",
                            }}>
                              <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.2rem" }}>{s.label}</div>
                              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--foreground)" }}>{s.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Timeline */}
                  <div style={{
                    background: "var(--card)",
                    border: `1px solid ${"var(--border)"}`,
                    borderRadius: "1rem",
                    padding: "1.25rem",
                  }}>
                    <h3 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: "1rem", color: "var(--foreground)" }}>
                      الجدول الزمني للعقد
                    </h3>
                    <div style={{ position: "relative" }}>
                      {/* Vertical line */}
                      <div style={{
                        position: "absolute",
                        right: lang === "ar" ? "8px" : "auto",
                        left: lang === "ar" ? "auto" : "8px",
                        top: "8px",
                        bottom: "8px",
                        width: "2px",
                        background: "var(--border)",
                      }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {result.timeline.map((item, i) => {
                          const dotColor = getTimelineDotColor(item.type);
                          const isToday = item.type === "today";
                          const isConversion = item.type === "conversion";
                          return (
                            <div key={i} style={{
                              display: "flex",
                              gap: "0.75rem",
                              alignItems: "flex-start",
                              paddingRight: lang === "ar" ? "1.5rem" : 0,
                              paddingLeft: lang === "ar" ? 0 : "1.5rem",
                              position: "relative",
                            }}>
                              {/* Dot */}
                              <div style={{
                                position: "absolute",
                                right: lang === "ar" ? "2px" : "auto",
                                left: lang === "ar" ? "auto" : "2px",
                                top: "4px",
                                width: "14px",
                                height: "14px",
                                borderRadius: "50%",
                                background: dotColor,
                                border: `2px solid ${"var(--background)"}`,
                                flexShrink: 0,
                                boxShadow: isConversion || isToday ? `0 0 8px ${dotColor}` : "none",
                              }} />
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: "0.78rem",
                                  fontWeight: isConversion || isToday ? 700 : 500,
                                  color: isConversion ? dotColor : isToday ? PURPLE : "var(--foreground)",
                                }}>
                                  {item.label}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
                                  {formatDate(item.date)} — {formatHijri(item.date)}
                                </div>
                                {item.note && (
                                  <div style={{ fontSize: "0.68rem", color: dotColor, marginTop: "0.15rem" }}>
                                    {item.note}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    background: "var(--card)",
                    border: `1px dashed ${"var(--border)"}`,
                    borderRadius: "1rem",
                    padding: "3rem 1.5rem",
                    textAlign: "center",
                    color: "var(--muted-foreground)",
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📄</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                    أدخل بيانات العقد واضغط "احسب الآن"
                  </div>
                  <div style={{ fontSize: "0.78rem" }}>
                    ستظهر هنا النتيجة والجدول الزمني للعقد
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Legal Note ── */}
        <div style={{
          marginTop: "1.5rem",
          padding: "0.85rem 1rem",
          background: "var(--background)",
          border: `1px solid ${GOLD_BORDER}`,
          borderRadius: "0.75rem",
          fontSize: "0.75rem",
          color: GOLD,
          lineHeight: 1.6,
        }}>
          <strong>⚖️ ملاحظة قانونية:</strong> تسري أحكام المادة 37 من نظام العمل على العمال السعوديين فقط. هذه الأداة للاسترشاد فقط ولا تُعدّ استشارة قانونية.
        </div>
      </div>
      <ServiceRating serviceId="contract-conversion" serviceName="تحول العقد المحدد لغير محدد" />
    </div>
  );
}