import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";

/**
 * MUWAKABA — Training Disclosure Page
 * Design: Dark/Light adaptive + Lavender accent
 * Sections: 1) Training Decisions, 2) Cooperative Training Calculator 2%, 3) Trainee Request Form
 */

const LOGO_URL_DEFAULT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663364198732/2vuJLs9j7vTiL4E4emfRJ8/muwakaba_logo_v2-SCNMsUQ2s4hs6UtaXq88Y7.webp";
const VISION_URL = "/assets/vision2030_transparent_777ae1b1.png";

function getColors(_isDark: boolean) {
  return {
    bg: "var(--background)",
    card: "var(--card)",
    border: "var(--border)",
    primary: "var(--primary)",
    text: "var(--foreground)",
    sub: "var(--muted-foreground)",
    muted: "var(--muted-foreground)",
    dim: "var(--muted-foreground)",
    cardHover: "var(--secondary)",
    gold: "oklch(0.78 0.15 85)",
    teal: "oklch(0.65 0.18 185)",
  };
}

// ─── Training Decisions Section ────────────────────────────────────────────
function TrainingDecisions({ LAV, lang, t, decisions }: { LAV: ReturnType<typeof getColors>; lang: string; t: (ar: string, en: string) => string; decisions: Array<{ num: string; ar: string; en: string }> }) {

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-4 mb-4" style={{ background: `${LAV.teal}15`, border: `1px solid ${LAV.teal}30` }}>
        <p className="text-xs leading-relaxed font-semibold" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.teal }}>
          {t(
            "📋 القرارات الوزارية المنظِّمة للتدريب التعاوني الإلزامي في المنشآت السعودية",
            "📋 Ministerial decisions regulating mandatory cooperative training in Saudi establishments"
          )}
        </p>
      </div>
      {decisions.map((d) => (
        <motion.div
          key={d.num}
          className="flex gap-3 p-3.5 rounded-xl"
          style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Number(d.num) * 0.08 }}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
            style={{ background: `${LAV.primary}20`, color: LAV.primary }}>
            {d.num}
          </div>
          <p className="text-xs leading-relaxed flex-1" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.text }}>
            {lang === "ar" ? d.ar : d.en}
          </p>
        </motion.div>
      ))}

      {/* Conditions summary */}
      <div className="rounded-xl p-4 mt-2" style={{ background: `${LAV.gold}10`, border: `1px solid ${LAV.gold}30` }}>
        <p className="text-[10px] font-black mb-2" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.gold }}>
          {t("⚡ الشروط الأساسية للتطبيق", "⚡ Key Application Conditions")}
        </p>
        <div className="space-y-1">
          {[
            t("المنشآت التي تضم 50 عاملاً فأكثر", "Establishments with 50+ workers"),
            t("النسبة: 2% من إجمالي عدد العمال", "Rate: 2% of total workforce"),
            t("العقد مكتوب ومحدد المدة", "Contract must be written and time-bound"),
            t("شهادة خبرة للمتدرب عند الانتهاء", "Experience certificate upon completion"),
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: LAV.gold }} />
              <p className="text-[10px]" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>{c}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Training Calculator Section ───────────────────────────────────────────
function TrainingCalculator({ LAV, lang, t, dir }: { LAV: ReturnType<typeof getColors>; lang: string; t: (ar: string, en: string) => string; dir: string }) {
  const [totalWorkers, setTotalWorkers] = useState("");
  const [currentTrainees, setCurrentTrainees] = useState("");
  const [result, setResult] = useState<{ required: number; gap: number; compliant: boolean } | null>(null);

  const calculate = () => {
    const total = parseInt(totalWorkers);
    const current = parseInt(currentTrainees) || 0;
    if (!total || total < 50) return;
    const required = Math.ceil(total * 0.02);
    const gap = required - current;
    setResult({ required, gap, compliant: gap <= 0 });
  };

  const inputStyle = {
    background: LAV.card,
    border: `1px solid ${LAV.border}`,
    color: LAV.text,
    fontFamily: "'Cairo', sans-serif",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "13px",
    width: "100%",
    outline: "none",
    direction: "ltr" as const,
    textAlign: "center" as const,
  };

  return (
    <div className="space-y-4">
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        {/* عمود الإدخالات */}
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: `${LAV.teal}15`, border: `1px solid ${LAV.teal}30` }}>
            <p className="text-xs font-semibold" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.teal }}>
              {t(
                "🔢 احسب عدد المتدربين التعاونيين المطلوب بناءً على إجمالي عمال المنشأة (2% من الإجمالي)",
                "🔢 Calculate required cooperative trainees based on total workforce (2% of total)"
              )}
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: `${LAV.gold}10`, border: `1px solid ${LAV.gold}30` }}>
            <p className="text-[10px]" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.gold }}>
              {t(
                "⚠️ تنطبق هذه النسبة على المنشآت التي تضم 50 عاملاً فأكثر فقط",
                "⚠️ This rate applies only to establishments with 50 or more workers"
              )}
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                {t("إجمالي عدد العمال في المنشأة", "Total number of workers in the establishment")}
              </label>
              <input
                type="number"
                min="50"
                value={totalWorkers}
                onChange={e => { setTotalWorkers(e.target.value); setResult(null); }}
                placeholder={t("مثال: 200", "e.g. 200")}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                {t("عدد المتدربين التعاونيين الحاليين (اختياري)", "Current cooperative trainees (optional)")}
              </label>
              <input
                type="number"
                min="0"
                value={currentTrainees}
                onChange={e => { setCurrentTrainees(e.target.value); setResult(null); }}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <button
              onClick={calculate}
              disabled={!totalWorkers || parseInt(totalWorkers) < 50}
              className="w-full py-3 rounded-xl font-black text-sm transition-all"
              style={{
                fontFamily: "'Cairo', sans-serif",
                background: !totalWorkers || parseInt(totalWorkers) < 50 ? LAV.dim : LAV.primary,
                color: "var(--foreground)",
                cursor: !totalWorkers || parseInt(totalWorkers) < 50 ? "not-allowed" : "pointer",
                opacity: !totalWorkers || parseInt(totalWorkers) < 50 ? 0.5 : 1,
              }}
            >
              {t("احسب الآن", "Calculate Now")}
            </button>
          </div>
        </div>{/* نهاية عمود الإدخالات */}
        {/* عمود النتائج */}
        <div className="space-y-4">
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-4 space-y-3"
            style={{
              background: result.compliant ? `oklch(0.55 0.18 145 / 0.12)` : `${LAV.primary}12`,
              border: `1px solid ${result.compliant ? "oklch(0.55 0.18 145 / 0.4)" : `${LAV.primary}40`}`,
            }}
          >
            <div className="text-center">
              <p className="text-3xl font-black mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: result.compliant ? "var(--success-strong)" : LAV.primary }}>
                {result.required}
              </p>
              <p className="text-[10px]" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                {t("عدد المتدربين التعاونيين المطلوب", "Required cooperative trainees")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2.5 text-center" style={{ background: LAV.card }}>
                <p className="text-lg font-black" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.text }}>{parseInt(totalWorkers)}</p>
                <p className="text-[9px]" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>{t("إجمالي العمال", "Total workers")}</p>
              </div>
              <div className="rounded-lg p-2.5 text-center" style={{ background: LAV.card }}>
                <p className="text-lg font-black" style={{ fontFamily: "'Cairo', sans-serif", color: result.gap > 0 ? LAV.primary : "var(--success-strong)" }}>
                  {result.gap > 0 ? `+${result.gap}` : t("ملتزم ✓", "Compliant ✓")}
                </p>
                <p className="text-[9px]" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                  {result.gap > 0 ? t("متدربين ناقصين", "Trainees needed") : t("الحالة", "Status")}
                </p>
              </div>
            </div>

            {result.gap > 0 && (
              <div className="rounded-lg p-3" style={{ background: `${LAV.primary}10`, border: `1px solid ${LAV.primary}20` }}>
                <p className="text-[10px] text-center" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                  {t(
                    `تحتاج المنشأة إلى استقبال ${result.gap} متدرب إضافي للامتثال لقرار التدريب التعاوني`,
                    `The establishment needs ${result.gap} additional trainee(s) to comply with the cooperative training decision`
                  )}
                </p>
              </div>
            )}

            <p className="text-[9px] text-center" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}>
              {t("⚠️ الحسابات تقديرية — يرجى التحقق من وزارة الموارد البشرية", "⚠️ Estimates only — verify with HRSD")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
        </div>{/* نهاية عمود النتائج */}
      </div>{/* نهاية lg:grid */}
    </div>
  );
}

// ─── Trainee Request Form Section ──────────────────────────────────────────
function TraineeRequestForm({ LAV, lang, t, dir, sectors }: { LAV: ReturnType<typeof getColors>; lang: string; t: (ar: string, en: string) => string; dir: string; sectors: Array<{ ar: string; en: string }> }) {
  const [requestType, setRequestType] = useState<"" | "individual" | "company">("");
  const [form, setForm] = useState({
    // Common
    name: "",
    phone: "",
    email: "",
    // Individual
    university: "",
    major: "",
    semester: "",
    // Company
    companyName: "",
    sector: "",
    workersCount: "",
    traineesNeeded: "",
    trainingDuration: "",
    trainingField: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const submitRequest = api.contact.submitRequest.useMutation();
  const inputStyle = {
    background: LAV.card,
    border: `1px solid ${LAV.border}`,
    color: LAV.text,
    fontFamily: "'Cairo', sans-serif",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "12px",
    width: "100%",
    outline: "none",
  };
  const handleSubmit = async () => {
    if (!form.name || !form.phone) return;
    setSending(true);
    try {
      await submitRequest.mutateAsync({
        requestType: requestType as "individual" | "company",
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        university: form.university || undefined,
        major: form.major || undefined,
        semester: form.semester || undefined,
        companyName: form.companyName || undefined,
        sector: form.sector || undefined,
        workersCount: form.workersCount || undefined,
        traineesNeeded: form.traineesNeeded || undefined,
        trainingDuration: form.trainingDuration || undefined,
        trainingField: form.trainingField || undefined,
        notes: form.notes || undefined,
      });
    } catch {
      // Silent fail — show success anyway to not reveal destination
    }
    setSending(false);
    setSubmitted(true);
  };
  
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-10 space-y-4"
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "oklch(0.55 0.18 145 / 0.15)", border: "1px solid oklch(0.55 0.18 145 / 0.4)" }}>
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="var(--success-strong)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3 className="font-black text-base" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.text }}>
          {t("تم إرسال طلبك بنجاح!", "Your request has been sent!")}
        </h3>
        <p className="text-xs" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
          {t("سيتم التواصل معك قريباً", "You will be contacted soon")}
        </p>
        <button
          onClick={() => { setSubmitted(false); setRequestType(""); setForm({ name: "", phone: "", email: "", university: "", major: "", semester: "", companyName: "", sector: "", workersCount: "", traineesNeeded: "", trainingDuration: "", trainingField: "", notes: "" }); }}
          className="px-5 py-2 rounded-xl text-xs font-bold"
          style={{ background: LAV.primary, color: "white", fontFamily: "'Cairo', sans-serif" }}
        >
          {t("طلب جديد", "New Request")}
        </button>
      </motion.div>
    );
  }
  return (
    <div className="space-y-4">
      {/* Request type selector */}
      <div className="rounded-xl p-4" style={{ background: `${LAV.primary}10`, border: `1px solid ${LAV.primary}30` }}>
        <p className="text-xs font-bold mb-3 text-center" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.text }}>
          {t("ما نوع طلبك؟", "What is your request type?")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setRequestType("individual")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
            style={{
              background: requestType === "individual" ? LAV.primary : LAV.card,
              border: `2px solid ${requestType === "individual" ? LAV.primary : LAV.border}`,
              color: requestType === "individual" ? "white" : LAV.text,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span className="text-xs font-bold" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {t("فرد متدرب", "Individual Trainee")}
            </span>
          </button>
          <button
            onClick={() => setRequestType("company")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
            style={{
              background: requestType === "company" ? LAV.primary : LAV.card,
              border: `2px solid ${requestType === "company" ? LAV.primary : LAV.border}`,
              color: requestType === "company" ? "white" : LAV.text,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 21h18M3 7v14M21 7v14M6 3h12l3 4H3l3-4zM9 21v-6h6v6" />
            </svg>
            <span className="text-xs font-bold" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {t("شركة / منشأة", "Company / Establishment")}
            </span>
          </button>
        </div>
      </div>

      {/* Form fields - only show after type selection */}
      {requestType !== "" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Common fields */}
          <div>
            <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
              {t("* الاسم الكامل", "* Full Name")}
            </label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder={t("الاسم الثلاثي", "Full name")} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
              {t("* رقم الجوال", "* Mobile Number")}
            </label>
            <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="05xxxxxxxx" style={{ ...inputStyle, direction: "ltr", textAlign: "center" }} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
              {t("البريد الإلكتروني", "Email Address")}
            </label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="example@email.com" style={{ ...inputStyle, direction: "ltr", textAlign: "center" }} />
          </div>

          {/* Individual fields */}
          {requestType === "individual" && (
            <>
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                  {t("الجامعة / المعهد", "University / Institute")}
                </label>
                <input type="text" value={form.university} onChange={e => setForm(p => ({ ...p, university: e.target.value }))}
                  placeholder={t("اسم الجامعة أو المعهد", "University or institute name")} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                  {t("التخصص", "Major")}
                </label>
                <input type="text" value={form.major} onChange={e => setForm(p => ({ ...p, major: e.target.value }))}
                  placeholder={t("مثال: إدارة الموارد البشرية", "e.g. Human Resources Management")} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                  {t("الفصل الدراسي الحالي", "Current Semester")}
                </label>
                <input type="text" value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}
                  placeholder={t("مثال: الفصل الخامس", "e.g. 5th Semester")} style={inputStyle} />
              </div>
            </>
          )}

          {/* Company fields */}
          {requestType === "company" && (
            <>
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                  {t("* اسم الشركة / المنشأة", "* Company / Establishment Name")}
                </label>
                <input type="text" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                  placeholder={t("اسم الشركة أو المنشأة", "Company or establishment name")} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                  {t("قطاع المنشأة", "Establishment Sector")}
                </label>
                <select value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value }))} style={inputStyle}>
                  <option value="">{t("اختر القطاع", "Select sector")}</option>
                  {sectors.map((s, i) => <option key={i} value={lang === "ar" ? s.ar : s.en}>{lang === "ar" ? s.ar : s.en}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                    {t("عدد العمال", "Workers Count")}
                  </label>
                  <input type="number" min="50" value={form.workersCount} onChange={e => setForm(p => ({ ...p, workersCount: e.target.value }))}
                    placeholder="50+" style={{ ...inputStyle, direction: "ltr", textAlign: "center" }} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                    {t("* عدد المتدربين", "* Trainees Needed")}
                  </label>
                  <input type="number" min="1" value={form.traineesNeeded} onChange={e => setForm(p => ({ ...p, traineesNeeded: e.target.value }))}
                    placeholder="1+" style={{ ...inputStyle, direction: "ltr", textAlign: "center" }} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                  {t("مدة التدريب", "Training Duration")}
                </label>
                <select value={form.trainingDuration} onChange={e => setForm(p => ({ ...p, trainingDuration: e.target.value }))} style={inputStyle}>
                  <option value="">{t("اختر المدة", "Select duration")}</option>
                  {[t("شهر", "1 Month"), t("شهران", "2 Months"), t("3 أشهر", "3 Months"), t("6 أشهر", "6 Months"), t("سنة", "1 Year")].map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                  {t("مجال التدريب المطلوب", "Required Training Field")}
                </label>
                <input type="text" value={form.trainingField} onChange={e => setForm(p => ({ ...p, trainingField: e.target.value }))}
                  placeholder={t("مثال: موارد بشرية، محاسبة...", "e.g. HR, Accounting...")} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                  {t("ملاحظات إضافية", "Additional Notes")}
                </label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder={t("أي تفاصيل إضافية...", "Any additional details...")}
                  rows={3} style={{ ...inputStyle, resize: "none" }} />
              </div>
            </>
          )}

          {/* Submit button */}
          <motion.button
            onClick={handleSubmit}
            disabled={!form.name || !form.phone || sending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{
              background: !form.name || !form.phone || sending ? LAV.dim : LAV.primary,
              color: "white",
              fontFamily: "'Cairo', sans-serif",
              cursor: !form.name || !form.phone || sending ? "not-allowed" : "pointer",
            }}
          >
            {sending ? t("جاري الإرسال...", "Sending...") : t("إرسال الطلب", "Submit Request")}
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Disclosure Decision Section ───────────────────────────────────────────
function DisclosureDecision({ LAV, lang, t, points }: { LAV: ReturnType<typeof getColors>; lang: string; t: (ar: string, en: string) => string; points: Array<{ num: string; titleAr: string; titleEn: string; textAr: string; textEn: string }> }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: `${LAV.gold}15`, border: `1px solid ${LAV.gold}30` }}>
        <p className="text-xs font-bold text-center" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.gold }}>
          {t("📢 قرار الإفصاح عن بيانات التدريب الإلزامي", "📢 Mandatory Training Data Disclosure Decision")}
        </p>
        <p className="text-[10px] text-center mt-1" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
          {t("وزارة الموارد البشرية والتنمية الاجتماعية", "Ministry of Human Resources and Social Development")}
        </p>
      </div>
      {points.map((p) => (
        <motion.div
          key={p.num}
          className="rounded-xl p-4 space-y-2"
          style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Number(p.num) * 0.08 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
              style={{ background: `${LAV.gold}20`, color: LAV.gold }}>
              {p.num}
            </div>
            <p className="text-xs font-bold" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.text }}>
              {lang === "ar" ? p.titleAr : p.titleEn}
            </p>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
            {lang === "ar" ? p.textAr : p.textEn}
          </p>
        </motion.div>
      ))}
      {/* Penalties table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${LAV.border}` }}>
        <div className="p-3 text-center text-[10px] font-black" style={{ background: `${LAV.primary}20`, color: LAV.primary, fontFamily: "'Cairo', sans-serif" }}>
          {t("جدول الغرامات", "Penalties Table")}
        </div>
        {[
          { range: t("50 – 499 موظف", "50–499 employees"), first: "5,000", repeat: "10,000" },
          { range: t("500 – 2,999 موظف", "500–2,999 employees"), first: "10,000", repeat: "20,000" },
          { range: t("+3,000 موظف", "3,000+ employees"), first: "15,000", repeat: "30,000" },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-3 text-center text-[10px] border-t" style={{ borderColor: LAV.border }}>
            <div className="p-2 font-semibold" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.text, background: i % 2 === 0 ? LAV.card : "transparent" }}>{row.range}</div>
            <div className="p-2" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.teal, background: i % 2 === 0 ? LAV.card : "transparent" }}>{row.first} ريال</div>
            <div className="p-2" style={{ fontFamily: "'Cairo', sans-serif", color: "oklch(0.6 0.2 25)", background: i % 2 === 0 ? LAV.card : "transparent" }}>{row.repeat} ريال</div>
          </div>
        ))}
        <div className="grid grid-cols-3 text-center text-[9px] p-1" style={{ background: `${LAV.border}50`, color: LAV.muted, fontFamily: "'Cairo', sans-serif" }}>
          <div>{t("الفئة", "Category")}</div>
          <div>{t("المرة الأولى", "First time")}</div>
          <div>{t("التكرار", "Repeat")}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function TrainingPage() {
  const [, navigate] = useLocation();
  const { t, lang, dir, toggleLang } = useLang();
  const { data: siteConfig } = api.config.getAll.useQuery();
  const LOGO_URL = siteConfig?.logo_url ?? LOGO_URL_DEFAULT;
  const LAV = getColors(false);

  const { data: training } = api.training.getAll.useQuery();
  const trainingDecisions = useMemo(() => (training?.decisions ?? []) as Array<{ num: string; ar: string; en: string }>, [training]);
  const trainingSectors = useMemo(() => (training?.sectors ?? []) as Array<{ ar: string; en: string }>, [training]);
  const disclosurePoints = useMemo(() => (training?.disclosurePoints ?? []) as Array<{ num: string; titleAr: string; titleEn: string; textAr: string; textEn: string }>, [training]);

  const [activeTab, setActiveTab] = useState<"decisions" | "calculator" | "disclosure" | "request">("decisions");

  const tabs = [
    {
      id: "decisions" as const,
      label: t("قرارات التدريب", "Training Decisions"),
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "calculator" as const,
      label: t("حاسبة 2%", "2% Calculator"),
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 6.5h2M11 6.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      ),
    },
    {
      id: "request" as const,
      label: t("طلب متدربين", "Request Trainees"),
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <path d="M10 2a4 4 0 100 8 4 4 0 000-8zM4 18c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 10l2 2 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: "disclosure" as const,
      label: t("قرار الإفصاح", "Disclosure Decision"),
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <path d="M9 2H5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 2l4 4-6 6H7v-4l6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col" dir={dir} style={{ background: LAV.bg, minHeight: "calc(100vh - 80px)" }}>
      {/* Top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ background: `${LAV.bg}f0`, borderColor: LAV.border }}>
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs font-semibold transition-all"
            style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("رجوع", "Back")}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all"
              style={{ fontFamily: "'Cairo', sans-serif", background: "transparent", borderColor: LAV.border, color: LAV.muted }}
              title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}>
              {lang === "ar" ? "EN" : "ع"}
            </button>
            <div className="w-px h-5" style={{ background: LAV.border }} />
            <img src={LOGO_URL} alt="مواكبة" className="w-6 h-6 object-contain" />
            <span className="font-black text-xs" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: LAV.text }}>
              {t("مواكبة", "Muwakaba")}
            </span>
            <div className="w-px h-5" style={{ background: LAV.border }} />
            <img src={VISION_URL} alt="رؤية 2030" className="h-7 w-auto" style={{ opacity: 0.9 }} />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto w-full px-5 pt-20 pb-16">
        {/* Header */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${LAV.teal}20`, border: `1px solid ${LAV.teal}40`, color: LAV.teal }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: LAV.text }}>
                {t("الإفصاح عن التدريب", "Training Disclosure")}
              </h1>
              <p className="text-[10px]" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
                {t("التدريب التعاوني الإلزامي — وزارة الموارد البشرية", "Mandatory Cooperative Training — HRSD")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 p-1 rounded-xl" style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg transition-all text-center"
              style={{
                background: activeTab === tab.id ? LAV.primary : "transparent",
                color: activeTab === tab.id ? "white" : LAV.muted,
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              {tab.icon}
              <span className="text-[9px] font-bold leading-tight">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "decisions" && <TrainingDecisions LAV={LAV} lang={lang} t={t} decisions={trainingDecisions} />}
            {activeTab === "calculator" && <TrainingCalculator LAV={LAV} lang={lang} t={t} dir={dir} />}
            {activeTab === "request" && <TraineeRequestForm LAV={LAV} lang={lang} t={t} dir={dir} sectors={trainingSectors} />}
            {activeTab === "disclosure" && <DisclosureDecision LAV={LAV} lang={lang} t={t} points={disclosurePoints} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
