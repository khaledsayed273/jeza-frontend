import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/api";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type NationalityId =
  | "bangladeshi" | "indian" | "yemeni" | "ethiopian" | "other";

interface NationalityOption {
  id: NationalityId;
  labelAr: string;
  labelEn: string;
  maxRatio: number | null; // null = مفتوح (لا حد أقصى)
  isRestricted: boolean;
  color: string;
  flag: string;
}

interface RatioResult {
  currentRatio: number;           // النسبة الحالية %
  maxAllowed: number | null;      // الحد الأقصى المسموح %
  count: number;                  // عدد العمال من هذه الجنسية
  totalWorkers: number;           // إجمالي العمال
  isAllowed: boolean;             // هل النسبة ضمن الحد؟
  isOpen: boolean;                // هل النسبة مفتوحة؟
  remainingAllowed: number;       // العدد المتبقي المسموح إضافته
  excessCount: number;            // العدد الزائد عن الحد
  sizeCategory: "small" | "medium" | "large";
  explanation: string;
  explanationEn: string;
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Calculation Logic
// ─────────────────────────────────────────────
function getEffectiveMaxRatio(
  nationality: NationalityOption,
  totalWorkers: number
): number | null {
  // الجنسيات المقيدة: نسبتها الخاصة بغض النظر عن حجم المنشأة
  if (nationality.isRestricted) return nationality.maxRatio;

  // الجنسيات غير المقيدة: تعتمد على حجم المنشأة
  if (totalWorkers <= 19) return null;       // مفتوح
  if (totalWorkers <= 49) return 70;         // 70%
  return 40;                                 // 40% (ماعدا السعودية)
}

function getSizeCategory(totalWorkers: number): "small" | "medium" | "large" {
  if (totalWorkers <= 19) return "small";
  if (totalWorkers <= 49) return "medium";
  return "large";
}

function calculateNationalityRatio(
  totalWorkers: number,
  nationalityCount: number,
  nationality: NationalityOption
): RatioResult {
  const sizeCategory = getSizeCategory(totalWorkers);
  const effectiveMax = getEffectiveMaxRatio(nationality, totalWorkers);
  const currentRatio = totalWorkers > 0 ? (nationalityCount / totalWorkers) * 100 : 0;
  const isOpen = effectiveMax === null;
  const isAllowed = isOpen || currentRatio <= effectiveMax!;

  // العدد المتبقي المسموح إضافته
  const maxCount = effectiveMax !== null ? Math.floor((effectiveMax / 100) * totalWorkers) : Infinity;
  const remainingAllowed = isOpen ? Infinity : Math.max(0, maxCount - nationalityCount);
  const excessCount = isOpen ? 0 : Math.max(0, nationalityCount - maxCount);

  // الشرح
  let explanation = "";
  let explanationEn = "";

  if (isOpen) {
    explanation = `المنشأة صغيرة (${totalWorkers} عامل) — النسبة مفتوحة لهذه الجنسية`;
    explanationEn = `Small establishment (${totalWorkers} workers) — ratio is open for this nationality`;
  } else if (isAllowed) {
    explanation = `النسبة الحالية (${currentRatio.toFixed(1)}%) ضمن الحد المسموح (${effectiveMax}%)`;
    explanationEn = `Current ratio (${currentRatio.toFixed(1)}%) is within the allowed limit (${effectiveMax}%)`;
  } else {
    explanation = `النسبة الحالية (${currentRatio.toFixed(1)}%) تتجاوز الحد المسموح (${effectiveMax}%) — يجب تخفيض ${excessCount} عامل`;
    explanationEn = `Current ratio (${currentRatio.toFixed(1)}%) exceeds the allowed limit (${effectiveMax}%) — reduce by ${excessCount} workers`;
  }

  return {
    currentRatio,
    maxAllowed: effectiveMax,
    count: nationalityCount,
    totalWorkers,
    isAllowed,
    isOpen,
    remainingAllowed,
    excessCount,
    sizeCategory,
    explanation,
    explanationEn,
  };
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function NationalityRatioPage() {
  const [, navigate] = useLocation();
  const { t, lang, dir } = useLang();

  const { data: calculatorData } = api.calculator.getAll.useQuery();
  const nationalityRulesData = calculatorData?.nationalityRules;
  const NATIONALITIES: NationalityOption[] = nationalityRulesData?.nationalities ?? [];

  const inputStyle: React.CSSProperties = {
    background: "var(--input)",
    border: `1.5px solid ${"var(--border)"}`,
    color: "var(--foreground)",
    borderRadius: "0.75rem",
    padding: "0.65rem 1rem",
    fontSize: "0.95rem",
    fontFamily: "'Cairo', sans-serif",
    width: "100%",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "var(--muted-foreground)",
    fontFamily: "'Cairo', sans-serif",
    marginBottom: "0.3rem",
    display: "block",
  };

  // ── State ──
  const [totalWorkers, setTotalWorkers] = useState("");
  const [nationalityCount, setNationalityCount] = useState("");
  const [selectedNationality, setSelectedNationality] = useState<NationalityId | "">("");
  const [result, setResult] = useState<RatioResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedNationalityObj = NATIONALITIES.find(n => n.id === selectedNationality) ?? null;

  function validate(): boolean {
    const e: Record<string, string> = {};
    const total = Number(totalWorkers);
    const count = Number(nationalityCount);
    if (!totalWorkers || isNaN(total) || total < 1)
      e.total = t("يرجى إدخال عدد صحيح للعمال (1 فأكثر)", "Please enter a valid total worker count (1+)");
    if (!nationalityCount || isNaN(count) || count < 0)
      e.count = t("يرجى إدخال عدد صحيح للجنسية", "Please enter a valid nationality count");
    if (count > total)
      e.count = t("عدد الجنسية لا يمكن أن يتجاوز إجمالي العمال", "Nationality count cannot exceed total workers");
    if (!selectedNationality)
      e.nationality = t("يرجى اختيار الجنسية", "Please select a nationality");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleCalculate() {
    if (!validate()) return;
    const nat = NATIONALITIES.find(n => n.id === selectedNationality)!;
    const res = calculateNationalityRatio(Number(totalWorkers), Number(nationalityCount), nat);
    setResult(res);
    setTimeout(() => document.getElementById("ratio-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function handleReset() {
    setTotalWorkers(""); setNationalityCount(""); setSelectedNationality(""); setResult(null); setErrors({});
  }

  const sizeLabel = (cat: "small" | "medium" | "large") => {
    if (cat === "small") return t("منشأة صغيرة (1–19 عامل)", "Small (1–19 workers)");
    if (cat === "medium") return t("منشأة متوسطة (20–49 عامل)", "Medium (20–49 workers)");
    return t("منشأة كبيرة (50+ عامل)", "Large (50+ workers)");
  };

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }}>
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-5 py-3"
        style={{ background: "var(--background)", borderBottom: `1px solid ${"var(--border)"}`, backdropFilter: "blur(12px)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: `1px solid ${"var(--border)"}`, color: "var(--primary)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            {dir === "rtl" ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
          </svg>
        </button>
        <div>
          <h1 className="font-black text-base leading-tight" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: "var(--primary)" }}>
            {t("حاسبة نسب الجنسيات", "Nationality Ratio Calculator")}
          </h1>
          <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("وفق نظام نطاقات ولوائح التوطين", "Per Nitaqat & Saudization Regulations")}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-5 pb-10">
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">

        {/* ── Legal Notice ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl px-4 py-3 mb-5 flex items-start gap-3"
          style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: `1px solid ${"var(--border)"}` }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: "var(--primary)" }}>
            {t(
              "تُحسب نسبة الجنسية بقسمة عدد العمال من تلك الجنسية على إجمالي عمال المنشأة مضروباً في 100. النتائج استرشادية.",
              "Nationality ratio = (nationality count ÷ total workers) × 100. Results are indicative."
            )}
          </p>
        </motion.div>

        {/* ── Size Reference Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-4 mb-5"
          style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}
        >
          <h3 className="text-sm font-black mb-3" style={{ color: "var(--foreground)", fontFamily: "'Noto Naskh Arabic', serif" }}>
            {t("جدول الحدود المسموحة حسب حجم المنشأة", "Allowed Limits by Establishment Size")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--secondary)" }}>
                  <th className="py-2 px-3 text-right font-bold" style={{ color: "var(--muted-foreground)", borderBottom: `1px solid ${"var(--border)"}` }}>{t("حجم المنشأة", "Size")}</th>
                  <th className="py-2 px-3 text-center font-bold" style={{ color: "var(--muted-foreground)", borderBottom: `1px solid ${"var(--border)"}` }}>{t("الجنسيات غير المقيدة", "Non-restricted")}</th>
                  <th className="py-2 px-3 text-center font-bold" style={{ color: "var(--muted-foreground)", borderBottom: `1px solid ${"var(--border)"}` }}>{t("بنقالية / هندية", "Bangladeshi / Indian")}</th>
                  <th className="py-2 px-3 text-center font-bold" style={{ color: "var(--muted-foreground)", borderBottom: `1px solid ${"var(--border)"}` }}>{t("يمنية", "Yemeni")}</th>
                  <th className="py-2 px-3 text-center font-bold" style={{ color: "var(--muted-foreground)", borderBottom: `1px solid ${"var(--border)"}` }}>{t("إثيوبية", "Ethiopian")}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { size: "1–19", sizeEn: "1–19", nonRestricted: t("مفتوح", "Open"), bangladeshi: "40%", yemeni: "25%", ethiopian: "1%", highlight: false },
                  { size: "20–49", sizeEn: "20–49", nonRestricted: "70%", bangladeshi: "40%", yemeni: "25%", ethiopian: "1%", highlight: false },
                  { size: "50+", sizeEn: "50+", nonRestricted: "40%", bangladeshi: "40%", yemeni: "25%", ethiopian: "1%", highlight: false },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                    <td className="py-2 px-3 font-bold" style={{ color: "var(--foreground)" }}>{lang === "ar" ? row.size : row.sizeEn}</td>
                    <td className="py-2 px-3 text-center font-semibold" style={{ color: row.nonRestricted === t("مفتوح", "Open") ? "var(--success)" : "oklch(0.55 0.22 220)" }}>{row.nonRestricted}</td>
                    <td className="py-2 px-3 text-center font-semibold" style={{ color: "oklch(0.55 0.22 220)" }}>{row.bangladeshi}</td>
                    <td className="py-2 px-3 text-center font-semibold" style={{ color: "oklch(0.55 0.22 220)" }}>{row.yemeni}</td>
                    <td className="py-2 px-3 text-center font-semibold" style={{ color: "oklch(0.58 0.20 25)" }}>{row.ethiopian}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── Calculator Form ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 mb-5"
          style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}
        >
          <h2 className="text-base font-black mb-4" style={{ color: "var(--foreground)", fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif" }}>
            {t("بيانات الحساب", "Calculation Data")}
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {/* إجمالي العمال */}
            <div>
              <label style={labelStyle}>{t("إجمالي عدد العاملين في المنشأة", "Total Workers in Establishment")}</label>
              <input
                type="number"
                min="1"
                value={totalWorkers}
                onChange={e => setTotalWorkers(e.target.value)}
                placeholder={t("مثال: 50", "e.g. 50")}
                style={{ ...inputStyle, borderColor: errors.total ? "oklch(0.58 0.20 25)" : "var(--border)" }}
              />
              {errors.total && <p className="text-[10px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{errors.total}</p>}
              {totalWorkers && !errors.total && (
                <p className="text-[10px] mt-1 font-semibold" style={{ color: "var(--primary)" }}>
                  {sizeLabel(getSizeCategory(Number(totalWorkers)))}
                </p>
              )}
            </div>

            {/* الجنسية */}
            <div>
              <label style={labelStyle}>{t("الجنسية المراد حسابها", "Nationality to Calculate")}</label>
              <select
                value={selectedNationality}
                onChange={e => { setSelectedNationality(e.target.value as NationalityId); setResult(null); }}
                style={{ ...inputStyle, borderColor: errors.nationality ? "oklch(0.58 0.20 25)" : "var(--border)" }}
              >
                <option value="">{t("— اختر الجنسية —", "— Select Nationality —")}</option>
                <optgroup label={t("الجنسيات المقيدة", "Restricted Nationalities")}>
                  {NATIONALITIES.filter(n => n.isRestricted).map(n => (
                    <option key={n.id} value={n.id}>
                      {n.flag} {lang === "ar" ? n.labelAr : n.labelEn}
                      {n.maxRatio !== null ? ` — ${t("حد أقصى", "max")} ${n.maxRatio}%` : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t("الجنسيات غير المقيدة", "Non-restricted Nationalities")}>
                  {NATIONALITIES.filter(n => !n.isRestricted).map(n => (
                    <option key={n.id} value={n.id}>
                      {n.flag} {lang === "ar" ? n.labelAr : n.labelEn}
                    </option>
                  ))}
                </optgroup>
              </select>
              {errors.nationality && <p className="text-[10px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{errors.nationality}</p>}
              {selectedNationalityObj && (
                <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold px-3 py-1.5 rounded-xl w-fit"
                  style={{ background: `${selectedNationalityObj.color}15`, border: `1px solid ${selectedNationalityObj.color}30`, color: selectedNationalityObj.color }}>
                  <span>{selectedNationalityObj.flag}</span>
                  <span>
                    {selectedNationalityObj.isRestricted
                      ? `${t("جنسية مقيدة — حد أقصى", "Restricted — max")} ${selectedNationalityObj.maxRatio}%`
                      : t("جنسية غير مقيدة — تعتمد على حجم المنشأة", "Non-restricted — depends on establishment size")
                    }
                  </span>
                </div>
              )}
            </div>

            {/* عدد العمال من هذه الجنسية */}
            <div>
              <label style={labelStyle}>{t("عدد العاملين من هذه الجنسية", "Workers of This Nationality")}</label>
              <input
                type="number"
                min="0"
                value={nationalityCount}
                onChange={e => setNationalityCount(e.target.value)}
                placeholder={t("مثال: 15", "e.g. 15")}
                style={{ ...inputStyle, borderColor: errors.count ? "oklch(0.58 0.20 25)" : "var(--border)" }}
              />
              {errors.count && <p className="text-[10px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{errors.count}</p>}
            </div>
          </div>

          {/* Formula Preview */}
          {totalWorkers && nationalityCount && !errors.total && !errors.count && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 rounded-xl px-4 py-3"
              style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: `1px solid ${"var(--border)"}` }}
            >
              <p className="text-xs font-bold" style={{ color: "var(--primary)" }}>
                {t("معادلة الحساب:", "Formula:")}
              </p>
              <p className="text-sm font-black mt-1" style={{ color: "var(--primary)", fontFamily: "'Cairo', sans-serif" }}>
                ({nationalityCount} ÷ {totalWorkers}) × 100 = {((Number(nationalityCount) / Number(totalWorkers)) * 100).toFixed(2)}%
              </p>
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-5">
            <motion.button
              onClick={handleCalculate}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3 rounded-xl font-black text-sm"
              style={{ background: "var(--primary)", color: "white", fontFamily: "'Cairo', sans-serif", boxShadow: `0 4px 16px ${"var(--primary)"}35` }}
            >
              {t("احسب النسبة", "Calculate Ratio")}
            </motion.button>
            <motion.button
              onClick={handleReset}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-3 rounded-xl font-bold text-sm"
              style={{ background: "var(--input)", color: "var(--muted-foreground)", border: `1.5px solid ${"var(--border)"}`, fontFamily: "'Cairo', sans-serif" }}
            >
              {t("مسح", "Reset")}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Result ── */}
        <AnimatePresence>
          {result && (
            <motion.div
              id="ratio-result"
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl p-5 mb-5"
              style={{
                background: "var(--card)",
                border: `2px solid ${result.isOpen ? "oklch(0.55 0.22 220 / 0.35)" : result.isAllowed ? "oklch(0.60 0.18 145 / 0.35)" : "oklch(0.58 0.20 25 / 0.35)"}`,
              }}
            >
              {/* Status Badge */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: result.isOpen ? "oklch(0.55 0.22 220 / 0.12)" : result.isAllowed ? "oklch(0.60 0.18 145 / 0.12)" : "oklch(0.58 0.20 25 / 0.12)" }}
                >
                  {result.isOpen ? "📂" : result.isAllowed ? "✅" : "⚠️"}
                </div>
                <div>
                  <h3 className="font-black text-base" style={{ color: result.isOpen ? "oklch(0.55 0.22 220)" : result.isAllowed ? "var(--success)" : "oklch(0.58 0.20 25)", fontFamily: "'Noto Naskh Arabic', serif" }}>
                    {result.isOpen
                      ? t("النسبة مفتوحة", "Open Ratio")
                      : result.isAllowed
                        ? t("النسبة ضمن الحد المسموح", "Within Allowed Limit")
                        : t("النسبة تتجاوز الحد المسموح", "Exceeds Allowed Limit")
                    }
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {lang === "ar" ? result.explanation : result.explanationEn}
                  </p>
                </div>
              </div>

              {/* Key Numbers */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  {
                    label: t("النسبة الحالية", "Current Ratio"),
                    value: `${result.currentRatio.toFixed(2)}%`,
                    color: result.isOpen ? "oklch(0.55 0.22 220)" : result.isAllowed ? "var(--success)" : "oklch(0.58 0.20 25)",
                  },
                  {
                    label: t("الحد الأقصى", "Max Allowed"),
                    value: result.isOpen ? t("مفتوح", "Open") : `${result.maxAllowed}%`,
                    color: "oklch(0.55 0.22 220)",
                  },
                  {
                    label: result.isOpen
                      ? t("حجم المنشأة", "Est. Size")
                      : result.isAllowed
                        ? t("المتبقي المسموح", "Remaining Allowed")
                        : t("العدد الزائد", "Excess Count"),
                    value: result.isOpen
                      ? sizeLabel(result.sizeCategory).split("(")[0].trim()
                      : result.isAllowed
                        ? result.remainingAllowed === Infinity ? "∞" : `${result.remainingAllowed} ${t("عامل", "workers")}`
                        : `${result.excessCount} ${t("عامل", "workers")}`,
                    color: result.isOpen ? "oklch(0.55 0.22 220)" : result.isAllowed ? "var(--success)" : "oklch(0.58 0.20 25)",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3 text-center"
                    style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}
                  >
                    <p className="text-[9px] font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>{item.label}</p>
                    <p className="text-lg font-black leading-tight" style={{ color: item.color, fontFamily: "'Cairo', sans-serif" }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Details Table */}
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${"var(--border)"}` }}>
                <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    {[
                      { label: t("إجمالي عمال المنشأة", "Total Workers"), value: result.totalWorkers.toLocaleString("ar-SA") },
                      { label: t("عدد العمال من الجنسية المحددة", "Workers of Selected Nationality"), value: result.count.toLocaleString("ar-SA") },
                      { label: t("النسبة الحالية", "Current Ratio"), value: `${result.currentRatio.toFixed(2)}%` },
                      { label: t("الحد الأقصى المسموح", "Maximum Allowed"), value: result.isOpen ? t("مفتوح (لا حد أقصى)", "Open (no limit)") : `${result.maxAllowed}%` },
                      { label: t("تصنيف المنشأة", "Establishment Category"), value: sizeLabel(result.sizeCategory) },
                      ...(!result.isOpen && result.isAllowed ? [{ label: t("العدد المتبقي المسموح إضافته", "Remaining Allowed to Add"), value: `${result.remainingAllowed} ${t("عامل", "workers")}` }] : []),
                      ...(!result.isOpen && !result.isAllowed ? [{ label: t("العدد الزائد عن الحد", "Excess Count"), value: `${result.excessCount} ${t("عامل", "workers")}` }] : []),
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                        <td className="py-2 px-3 font-semibold" style={{ color: "var(--muted-foreground)", background: "var(--secondary)", width: "55%" }}>{row.label}</td>
                        <td className="py-2 px-3 font-black" style={{ color: "var(--foreground)" }}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Recommendation */}
              {!result.isOpen && !result.isAllowed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 rounded-xl px-4 py-3 flex items-start gap-2"
                  style={{ background: "oklch(0.58 0.20 25 / 0.12)", border: `1px solid ${"oklch(0.58 0.20 25 / 0.35)"}` }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.58 0.20 25)" }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p className="text-xs leading-relaxed" style={{ color: "oklch(0.58 0.20 25)" }}>
                    {t(
                      `تجاوز الحد المسموح يُعرّض المنشأة لعقوبات نظامية. يُنصح بمراجعة وضع ${result.excessCount} عامل وإعادة تنظيم القوى العاملة.`,
                      `Exceeding the limit exposes the establishment to regulatory penalties. Review ${result.excessCount} workers and restructure the workforce.`
                    )}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Restricted Nationalities Reference ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-4"
          style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}
        >
          <h3 className="text-sm font-black mb-3" style={{ color: "var(--foreground)", fontFamily: "'Noto Naskh Arabic', serif" }}>
            {t("الجنسيات المقيدة — الحدود الثابتة", "Restricted Nationalities — Fixed Limits")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {NATIONALITIES.filter(n => n.isRestricted).map(n => (
              <div
                key={n.id}
                className="rounded-xl p-3 flex items-center gap-2"
                style={{ background: `${n.color}10`, border: `1px solid ${n.color}25` }}
              >
                <span className="text-xl">{n.flag}</span>
                <div>
                  <p className="text-xs font-black" style={{ color: n.color }}>
                    {lang === "ar" ? n.labelAr : n.labelEn}
                  </p>
                  <p className="text-[10px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
                    {t("حد أقصى", "Max")} {n.maxRatio}%
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-3 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            {t(
              "* الجنسيات المقيدة لها حد أقصى ثابت بغض النظر عن حجم المنشأة. الجنسيات غير المقيدة تخضع لنسب حجم المنشأة.",
              "* Restricted nationalities have a fixed cap regardless of establishment size. Non-restricted nationalities follow establishment-size ratios."
            )}
          </p>
         </motion.div>
        </div>{/* نهاية lg:grid */}
      </div>
    </div>
  );
}
