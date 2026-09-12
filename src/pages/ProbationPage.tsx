import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

// ─────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────
const TEAL = "oklch(0.52 0.18 195)";
const TEAL_DIM = "oklch(0.52 0.18 195 / 0.12)";
const TEAL_BORDER = "oklch(0.52 0.18 195 / 0.35)";
const TEAL_GLOW = "0 4px 20px oklch(0.52 0.18 195 / 0.40)";

interface ProbResult {
  startDate: Date;
  endDateWithout: Date;
  endDateWith: Date;
  totalProbDays: number;
  totalExtension: number;
  eidDays: number;
  sickDays: number;
  natDays: number;
  probDaysRequested: number;
  cappedAt180: boolean;
}

function formatGregorianAr(date: Date): string {
  return date.toLocaleDateString("ar-SA-u-ca-gregory", { day: "2-digit", month: "long", year: "numeric" });
}
function formatGregorianEn(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
function formatHijri(date: Date): string {
  try {
    return date.toLocaleDateString("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export default function ProbationPage() {
  const [, navigate] = useLocation();
  const { t, lang, dir } = useLang();

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.4rem",
    color: "var(--muted-foreground)", fontFamily: "'Cairo', sans-serif",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.7rem 0.9rem", borderRadius: "0.85rem",
    border: `1.5px solid ${"var(--border)"}`, background: "var(--input)",
    color: "var(--foreground)", fontSize: "0.9rem", fontFamily: "'Cairo', sans-serif",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };
  const errStyle: React.CSSProperties = {
    fontSize: "0.68rem", color: "oklch(0.60 0.22 25)", marginTop: "0.25rem",
    fontFamily: "'Cairo', sans-serif",
  };

  // ── State ──
  const [probDays, setProbDays] = useState("");
  const [probStart, setProbStart] = useState("");
  const [probEidDays, setProbEidDays] = useState("");
  const [probSickDays, setProbSickDays] = useState("");
  const [probNatDays, setProbNatDays] = useState("");
  const [result, setResult] = useState<ProbResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleCalculate() {
    const errs: Record<string, string> = {};
    const days = parseInt(probDays) || 0;
    if (!probDays || days <= 0) errs.days = t("أدخل عدد أيام فترة التجربة", "Enter probation days");
    if (!probStart) errs.start = t("أدخل تاريخ البداية", "Enter start date");
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    const cappedAt180 = days > 180;
    const actualDays = Math.min(days, 180);

    const eid = parseInt(probEidDays) || 0;
    const sick = parseInt(probSickDays) || 0;
    const nat = parseInt(probNatDays) || 0;
    const totalExtension = eid + sick + nat;

    const startDate = new Date(probStart);
    startDate.setHours(0, 0, 0, 0);

    const endWithout = new Date(startDate);
    endWithout.setDate(endWithout.getDate() + actualDays - 1);

    const endWith = new Date(startDate);
    endWith.setDate(endWith.getDate() + actualDays - 1 + totalExtension);

    setResult({
      startDate, endDateWithout: endWithout, endDateWith: endWith,
      totalProbDays: actualDays, totalExtension,
      eidDays: eid, sickDays: sick, natDays: nat,
      probDaysRequested: days, cappedAt180,
    });
    setTimeout(() => document.getElementById("prob-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function handleReset() {
    setProbDays(""); setProbStart(""); setProbEidDays(""); setProbSickDays(""); setProbNatDays("");
    setResult(null); setErrors({});
  }

  // ── مكوّن بطاقة التاريخ ──
  const DateCard = ({ label, date, accent = false }: { label: string; date: Date; accent?: boolean }) => (
    <div
      className="rounded-2xl p-4"
      style={{
        background: accent ? "oklch(0.52 0.18 195 / 0.15)" : "var(--card)",
        border: `${accent ? "1.5px" : "1px"} solid ${accent ? TEAL_BORDER : "var(--border)"}`,
      }}
    >
      <p className="text-[10px] font-bold mb-2" style={{ color: accent ? TEAL : "var(--muted-foreground)" }}>{label}</p>
      <div className="space-y-2">
        <div>
          <p className="text-[9px] font-bold mb-0.5 uppercase tracking-wide" style={{ color: accent ? "oklch(0.75 0.15 195)" : "var(--muted-foreground)" }}>
            {t("ميلادي", "Gregorian")}
          </p>
          <p className={`font-black ${accent ? "text-2xl" : "text-xl"}`} style={{ color: accent ? TEAL : "var(--foreground)", fontFamily: "'Cairo', sans-serif" }}>
            {lang === "ar" ? formatGregorianAr(date) : formatGregorianEn(date)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold mb-0.5 uppercase tracking-wide" style={{ color: accent ? "oklch(0.75 0.15 195)" : "var(--muted-foreground)" }}>
            {t("هجري", "Hijri")}
          </p>
          <p className={`font-black ${accent ? "text-base" : "text-sm"}`} style={{ color: accent ? "oklch(0.85 0.12 195)" : TEAL, fontFamily: "'Cairo', sans-serif" }}>
            {formatHijri(date)}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }}>

      {/* ══════════════════════════════════════════
          HEADER — sticky top bar
      ══════════════════════════════════════════ */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5"
        style={{ background: "var(--background)", borderBottom: `1px solid ${"var(--border)"}`, backdropFilter: "blur(12px)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm font-bold transition-opacity hover:opacity-70"
          style={{ color: "var(--muted-foreground)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">{t("رجوع للرئيسية", "Back to Home")}</span>
          <span className="sm:hidden">{t("رجوع", "Back")}</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}` }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke={TEAL} strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
              <circle cx="12" cy="16" r="2" fill={TEAL} />
            </svg>
          </div>
          <span className="text-sm font-black" style={{ color: TEAL }}>
            {t("حاسبة فترة التجربة", "Probation Calculator")}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          HERO BANNER — desktop only
      ══════════════════════════════════════════ */}
      <div
        className="hidden lg:block px-8 py-8"
        style={{ background: `linear-gradient(135deg, oklch(0.52 0.18 195 / 0.08) 0%, oklch(0.52 0.18 195 / 0.02) 100%)`, borderBottom: `1px solid ${TEAL_BORDER}` }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          <div>
            <h1 className="text-3xl font-black mb-2" style={{ color: TEAL, fontFamily: "'Noto Naskh Arabic', serif" }}>
              {t("حاسبة فترة التجربة", "Probation Period Calculator")}
            </h1>
            <p className="text-sm leading-relaxed max-w-lg" style={{ color: "var(--muted-foreground)" }}>
              {t(
                "احسب تاريخ انتهاء فترة التجربة مع مراعاة الإجازات الممدِّدة وفق المادة 53 من نظام العمل السعودي",
                "Calculate the probation end date accounting for extending leaves per Article 53 of Saudi Labor Law"
              )}
            </p>
          </div>
          {/* بطاقة إحصائية صغيرة */}
          <div className="flex gap-4 flex-shrink-0">
            {[
              { label: t("الحد الأقصى", "Max Duration"), value: "180", unit: t("يوم", "days") },
              { label: t("أنواع الإجازات", "Leave Types"), value: "3", unit: t("أنواع", "types") },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl px-5 py-4 text-center" style={{ background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}` }}>
                <p className="text-2xl font-black" style={{ color: TEAL }}>{stat.value}</p>
                <p className="text-xs font-bold" style={{ color: TEAL }}>{stat.unit}</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MAIN CONTENT — two-column on desktop, single on mobile
      ══════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── تنبيه قانوني ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl p-4 mb-6 flex items-start gap-3"
          style={{ background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}` }}
        >
          <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: "oklch(0.52 0.18 195 / 0.20)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke={TEAL} strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold mb-0.5" style={{ color: TEAL }}>
              {t("المادة 53 — نظام العمل السعودي", "Article 53 — Saudi Labor Law")}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              {t(
                "لا تتجاوز فترة التجربة 180 يوماً. أيام الإجازات (العيدين، المرضية، المناسبات الوطنية) لا تُحتسب ضمن أيام فترة التجربة وتُمدِّد تاريخ انتهائها.",
                "Probation period shall not exceed 180 days. Holiday periods (Eid, sick leave, national occasions) are excluded from the probation count and extend the end date accordingly."
              )}
            </p>
          </div>
        </motion.div>

        {/* ── تخطيط ثنائي العمود ── */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

          {/* ════════════════════════════
              العمود الأيسر — نموذج الإدخال
          ════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: dir === "rtl" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="rounded-3xl p-6 mb-5 lg:mb-0" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>

              {/* عنوان القسم */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 rounded-full" style={{ background: TEAL }} />
                <h2 className="text-base font-black" style={{ color: "var(--foreground)" }}>
                  {t("بيانات فترة التجربة", "Probation Details")}
                </h2>
              </div>

              {/* ── الصف الأول: أيام + تاريخ ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* عدد الأيام */}
                <div>
                  <label style={labelStyle}>
                    {t("عدد أيام فترة التجربة", "Probation Days")}
                  </label>
                  <input
                    type="number" min="1" max="180" step="1"
                    value={probDays}
                    onChange={e => setProbDays(e.target.value)}
                    placeholder={t("مثال: 90", "e.g. 90")}
                    style={{ ...inputStyle, borderColor: errors.days ? "oklch(0.60 0.22 25)" : "var(--border)" }}
                  />
                  {errors.days && <p style={errStyle}>{errors.days}</p>}
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                    {t("الحد الأقصى 180 يوم", "Max 180 days")}
                  </p>
                  {/* أمثلة سريعة */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {["60", "90", "180"].map(d => (
                      <button
                        key={d}
                        onClick={() => setProbDays(d)}
                        className="py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                        style={{ background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`, color: TEAL }}
                      >
                        {d} {t("يوم", "d")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* تاريخ البداية */}
                <div>
                  <label style={labelStyle}>
                    {t("تاريخ بداية العمل", "Start Date")}
                  </label>
                  <input
                    type="date"
                    value={probStart}
                    onChange={e => setProbStart(e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.start ? "oklch(0.60 0.22 25)" : "var(--border)" }}
                  />
                  {errors.start && <p style={errStyle}>{errors.start}</p>}
                  {probStart && (
                    <div className="mt-2 rounded-xl px-3 py-2" style={{ background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}` }}>
                      <p className="text-[10px] font-bold" style={{ color: TEAL }}>
                        {lang === "ar" ? formatGregorianAr(new Date(probStart)) : formatGregorianEn(new Date(probStart))}
                      </p>
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: "oklch(0.75 0.15 195)" }}>
                        {formatHijri(new Date(probStart))}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── فاصل الإجازات ── */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-[10px] font-bold px-2 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                  {t("الإجازات الممدِّدة (اختياري)", "Extending Leaves (optional)")}
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>

              {/* ── الإجازات الثلاث ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {/* العيدان */}
                <div>
                  <label style={labelStyle}>
                    <span className="flex items-center gap-1">
                      <span>🕌</span>
                      {t("أيام العيدين", "Eid Holidays")}
                    </span>
                  </label>
                  <input
                    type="number" min="0" step="1"
                    value={probEidDays}
                    onChange={e => setProbEidDays(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                    {t("الفطر + الأضحى", "Eid Al-Fitr + Al-Adha")}
                  </p>
                </div>

                {/* المرضية */}
                <div>
                  <label style={labelStyle}>
                    <span className="flex items-center gap-1">
                      <span>🏥</span>
                      {t("الإجازة المرضية", "Sick Leave")}
                    </span>
                  </label>
                  <input
                    type="number" min="0" step="1"
                    value={probSickDays}
                    onChange={e => setProbSickDays(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                    {t("بموجب تقرير طبي", "With medical report")}
                  </p>
                </div>

                {/* الوطنية */}
                <div>
                  <label style={labelStyle}>
                    <span className="flex items-center gap-1">
                      <span>🇸🇦</span>
                      {t("المناسبات الوطنية", "National Occasions")}
                    </span>
                  </label>
                  <input
                    type="number" min="0" step="1"
                    value={probNatDays}
                    onChange={e => setProbNatDays(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                    {t("التأسيس + اليوم الوطني", "Founding + National Day")}
                  </p>
                </div>
              </div>

              {/* ── أزرار الحساب ── */}
              <div className="flex gap-3">
                <button
                  onClick={handleCalculate}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: TEAL, color: "white", boxShadow: TEAL_GLOW }}
                >
                  {t("احسب تاريخ الانتهاء", "Calculate End Date")}
                </button>
                <button
                  onClick={handleReset}
                  className="px-5 py-3.5 rounded-2xl font-bold text-sm transition-all hover:opacity-70"
                  style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, color: "var(--muted-foreground)" }}
                >
                  {t("مسح", "Reset")}
                </button>
              </div>
            </div>
          </motion.div>

          {/* ════════════════════════════
              العمود الأيمن — النتائج
          ════════════════════════════ */}
          <div id="prob-result">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: dir === "rtl" ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  {/* تنبيه التقليص إلى 180 */}
                  {result.cappedAt180 && (
                    <div
                      className="rounded-2xl p-4 flex items-start gap-3"
                      style={{ background: "oklch(0.65 0.20 55 / 0.12)", border: "1px solid oklch(0.65 0.20 55 / 0.40)" }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 flex-shrink-0 mt-0.5" stroke="oklch(0.65 0.20 55)" strokeWidth={2}>
                        <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <p className="text-xs leading-relaxed" style={{ color: "oklch(0.65 0.20 55)", fontFamily: "'Cairo', sans-serif" }}>
                        {t(
                          `أدخلت ${result.probDaysRequested} يوماً، تم تقليصها إلى الحد الأقصى القانوني 180 يوماً.`,
                          `You entered ${result.probDaysRequested} days, capped at the legal maximum of 180 days.`
                        )}
                      </p>
                    </div>
                  )}

                  {/* ── بطاقة تواريخ الانتهاء ── */}
                  <div className="rounded-3xl p-5" style={{ background: TEAL_DIM, border: `2px solid ${TEAL_BORDER}` }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 rounded-full" style={{ background: TEAL }} />
                      <p className="text-sm font-black" style={{ color: TEAL }}>
                        {t("تاريخ انتهاء فترة التجربة", "Probation End Date")}
                      </p>
                    </div>

                    {/* بدون تمديد */}
                    <DateCard
                      label={t("بدون إجازات ممدِّدة", "Without extending leaves")}
                      date={result.endDateWithout}
                    />

                    {/* بعد التمديد */}
                    {result.totalExtension > 0 && (
                      <div className="mt-3">
                        <DateCard
                          label={t(`بعد إضافة ${result.totalExtension} يوم تمديد`, `After adding ${result.totalExtension} extension days`)}
                          date={result.endDateWith}
                          accent
                        />
                      </div>
                    )}
                  </div>

                  {/* ── تفصيل الحساب ── */}
                  <div className="rounded-3xl p-5" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 rounded-full" style={{ background: "var(--muted-foreground)" }} />
                      <h4 className="text-sm font-black" style={{ color: "var(--muted-foreground)" }}>
                        {t("تفصيل الحساب", "Calculation Breakdown")}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {/* تاريخ البداية */}
                      <div className="py-2.5 px-3 rounded-xl" style={{ background: "var(--secondary)" }}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("تاريخ بداية العمل", "Start Date")}</span>
                          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                            {lang === "ar" ? formatGregorianAr(result.startDate) : formatGregorianEn(result.startDate)}
                          </span>
                        </div>
                        <div className="flex justify-end mt-0.5">
                          <span className="text-[10px] font-bold" style={{ color: TEAL }}>{formatHijri(result.startDate)}</span>
                        </div>
                      </div>

                      {/* أيام التجربة */}
                      <div className="flex justify-between items-center py-2.5 px-3 rounded-xl" style={{ background: "var(--secondary)" }}>
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("أيام فترة التجربة", "Probation Days")}</span>
                        <span className="text-sm font-bold" style={{ color: TEAL }}>{result.totalProbDays} {t("يوم", "days")}</span>
                      </div>

                      {/* الإجازات الممدِّدة */}
                      {result.eidDays > 0 && (
                        <div className="flex justify-between items-center py-2.5 px-3 rounded-xl" style={{ background: "var(--secondary)" }}>
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>🕌 {t("أيام العيدين (ممدِّدة)", "Eid Holidays (extending)")}</span>
                          <span className="text-sm font-bold" style={{ color: "oklch(0.60 0.22 25)" }}>+{result.eidDays} {t("يوم", "days")}</span>
                        </div>
                      )}
                      {result.sickDays > 0 && (
                        <div className="flex justify-between items-center py-2.5 px-3 rounded-xl" style={{ background: "var(--secondary)" }}>
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>🏥 {t("الإجازة المرضية (ممدِّدة)", "Sick Leave (extending)")}</span>
                          <span className="text-sm font-bold" style={{ color: "oklch(0.60 0.22 25)" }}>+{result.sickDays} {t("يوم", "days")}</span>
                        </div>
                      )}
                      {result.natDays > 0 && (
                        <div className="flex justify-between items-center py-2.5 px-3 rounded-xl" style={{ background: "var(--secondary)" }}>
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>🇸🇦 {t("المناسبات الوطنية (ممدِّدة)", "National Occasions (extending)")}</span>
                          <span className="text-sm font-bold" style={{ color: "oklch(0.60 0.22 25)" }}>+{result.natDays} {t("يوم", "days")}</span>
                        </div>
                      )}

                      {/* إجمالي التمديد */}
                      {result.totalExtension > 0 && (
                        <div
                          className="flex justify-between items-center py-2.5 px-3 rounded-xl"
                          style={{ background: "oklch(0.52 0.18 195 / 0.08)", border: `1px solid ${TEAL_BORDER}` }}
                        >
                          <span className="text-xs font-bold" style={{ color: TEAL }}>{t("إجمالي التمديد", "Total Extension")}</span>
                          <span className="text-sm font-bold" style={{ color: TEAL }}>+{result.totalExtension} {t("يوم", "days")}</span>
                        </div>
                      )}

                      {/* إجمالي المدة الكلية */}
                      {result.totalExtension > 0 && (
                        <div
                          className="flex justify-between items-center py-2.5 px-3 rounded-xl"
                          style={{ background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}` }}
                        >
                          <span className="text-xs font-bold" style={{ color: TEAL }}>{t("إجمالي المدة الكلية", "Total Calendar Span")}</span>
                          <span className="text-sm font-bold" style={{ color: TEAL }}>
                            {daysBetween(result.startDate, result.endDateWith) + 1} {t("يوم", "days")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ملاحظة قانونية */}
                    <div className="mt-4 p-3 rounded-xl" style={{ background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}` }}>
                      <p className="text-[10px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                        {t(
                          "⚖️ وفق المادة 53 من نظام العمل: أيام العطل الرسمية والإجازات المرضية والمناسبات الوطنية لا تُحتسب ضمن فترة التجربة وتُمدِّد تاريخ انتهائها تلقائياً.",
                          "⚖️ Per Article 53 of Saudi Labor Law: Official holidays, sick leave, and national occasions are excluded from the probation period and automatically extend its end date."
                        )}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* حالة الانتظار — placeholder للكمبيوتر */
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hidden lg:flex flex-col items-center justify-center h-full min-h-[400px] rounded-3xl"
                  style={{ background: "var(--secondary)", border: `2px dashed ${"var(--border)"}` }}
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: TEAL_DIM }}>
                    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke={TEAL} strokeWidth={1.5}>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                      <circle cx="12" cy="16" r="2" fill={TEAL} />
                    </svg>
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: "var(--muted-foreground)" }}>
                    {t("أدخل البيانات واضغط احسب", "Enter details and click Calculate")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {t("ستظهر النتائج هنا", "Results will appear here")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>{/* end grid */}
      </div>

      <div className="h-12" />
    </div>
  );
}
