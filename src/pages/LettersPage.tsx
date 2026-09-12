import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useState } from "react";
import { api } from "@/lib/api";

/**
 * MUWAKABA — Letters Generator Page
 * Inputs: company name, CR number, recipient type + name, letter idea
 * Output: AI-generated draft letter
 */

type RecipientType = "قطاع_خاص" | "بنك" | "جهة_حكومية";

const RECIPIENT_TYPES: { id: RecipientType; ar: string; en: string; icon: string }[] = [
  { id: "قطاع_خاص", ar: "قطاع خاص", en: "Private Sector", icon: "🏢" },
  { id: "بنك", ar: "بنك", en: "Bank", icon: "🏦" },
  { id: "جهة_حكومية", ar: "جهة حكومية", en: "Government Entity", icon: "🏛" },
];

export default function LettersPage() {
  const [, navigate] = useLocation();
  const { t, lang, dir } = useLang();

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [crNumber, setCrNumber] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("قطاع_خاص");
  const [recipientName, setRecipientName] = useState("");
  const [letterIdea, setLetterIdea] = useState("");
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [copied, setCopied] = useState(false);

  const textMain = "var(--foreground)";
  const textSub = "var(--muted-foreground)";
  const textMuted = "var(--muted-foreground)";
  const cardBg = "var(--card)";
  const border = "var(--border)";
  const pageBg = "var(--background)";
  const inputBg = "var(--input)";
  const ACCENT = "oklch(0.72 0.10 85)";
  const ACCENT_DARK = "oklch(0.10 0.02 85)";

  const generateMutation = api.letters.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedLetter(data.letter);
    },
  });

  const handleGenerate = () => {
    if (!companyName.trim() || !crNumber.trim() || !recipientName.trim() || !letterIdea.trim()) return;
    setGeneratedLetter("");
    generateMutation.mutate({
      companyName: companyName.trim(),
      crNumber: crNumber.trim(),
      recipientType,
      recipientName: recipientName.trim(),
      letterIdea: letterIdea.trim(),
    });
  };

  const handleCopy = () => {
    if (!generatedLetter) return;
    navigator.clipboard.writeText(generatedLetter).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isValid = companyName.trim() && crNumber.trim() && recipientName.trim() && letterIdea.trim();

  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        background: pageBg,
        color: textMain,
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ background: pageBg, borderBottom: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-3 mb-3 max-w-5xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{ background: "var(--card)", color: textSub }}
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" style={{ transform: dir === "rtl" ? "none" : "scaleX(-1)" }}>
              <path d="M13 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1
              className="font-black text-lg leading-tight"
              style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: textMain }}
            >
              {t("مولّد الخطابات", "Letter Generator")}
            </h1>
            <p className="text-[10px]" style={{ color: textMuted }}>
              {t("أخبرنا فكرة الخطاب وسنصيغه لك باحترافية", "Tell us the letter idea and we'll draft it professionally")}
            </p>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 max-w-5xl mx-auto">
          <button
            onClick={() => navigate("/templates")}
            className="flex-1 py-2 rounded-xl font-bold text-xs transition-all"
            style={{
              background: "var(--card)",
              color: textSub,
              border: `1px solid ${border}`,
            }}
          >
            {t("📄 النماذج", "📄 Forms")}
          </button>
          <button
            onClick={() => navigate("/letters")}
            className="flex-1 py-2 rounded-xl font-bold text-xs transition-all"
            style={{
              background: `linear-gradient(135deg, ${ACCENT}, oklch(0.65 0.12 85))`,
              color: ACCENT_DARK,
              boxShadow: `0 4px 16px ${ACCENT}40`,
            }}
          >
            {t("✉️ الخطابات", "✉️ Letters")}
          </button>
        </div>
      </div>

      <div className="px-4 py-5 max-w-5xl mx-auto space-y-4">
        {/* ── Company Info ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 space-y-3"
          style={{ background: cardBg, border: `1px solid ${border}` }}
        >
          <h2 className="font-black text-sm" style={{ color: ACCENT }}>
            {t("بيانات المنشأة", "Company Information")}
          </h2>

          <div className="space-y-2">
            <label className="text-[11px] font-bold" style={{ color: textSub }}>
              {t("اسم المنشأة *", "Company Name *")}
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t("مثال: شركة الأفق للتطوير", "e.g. Al-Ufuq Development Co.")}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: inputBg, border: `1px solid ${border}`, color: textMain }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold" style={{ color: textSub }}>
              {t("رقم السجل التجاري (الرقم الوطني الموحد) *", "Commercial Registration / Unified National Number *")}
            </label>
            <input
              type="text"
              value={crNumber}
              onChange={(e) => setCrNumber(e.target.value)}
              placeholder={t("مثال: 1010123456", "e.g. 1010123456")}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: inputBg, border: `1px solid ${border}`, color: textMain }}
              dir="ltr"
            />
          </div>
        </motion.div>

        {/* ── Recipient Info ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-4 space-y-3"
          style={{ background: cardBg, border: `1px solid ${border}` }}
        >
          <h2 className="font-black text-sm" style={{ color: ACCENT }}>
            {t("موجّه إلى", "Addressed To")}
          </h2>

          {/* Recipient Type */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold" style={{ color: textSub }}>
              {t("نوع الجهة *", "Recipient Type *")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RECIPIENT_TYPES.map((rt) => (
                <button
                  key={rt.id}
                  onClick={() => setRecipientType(rt.id)}
                  className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-2 text-[10px] font-bold transition-all"
                  style={
                    recipientType === rt.id
                      ? {
                          background: `linear-gradient(135deg, ${ACCENT}, oklch(0.65 0.12 85))`,
                          color: ACCENT_DARK,
                          boxShadow: `0 4px 12px ${ACCENT}40`,
                        }
                      : {
                          background: inputBg,
                          color: textSub,
                          border: `1px solid ${border}`,
                        }
                  }
                >
                  <span className="text-base">{rt.icon}</span>
                  <span>{lang === "ar" ? rt.ar : rt.en}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Name */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold" style={{ color: textSub }}>
              {t("اسم الجهة / المستلم *", "Recipient Name *")}
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={
                recipientType === "بنك"
                  ? t("مثال: بنك الراجحي", "e.g. Al Rajhi Bank")
                  : recipientType === "جهة_حكومية"
                  ? t("مثال: وزارة الموارد البشرية", "e.g. Ministry of HR")
                  : t("مثال: شركة التقنية المتقدمة", "e.g. Advanced Tech Co.")
              }
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: inputBg, border: `1px solid ${border}`, color: textMain }}
            />
          </div>
        </motion.div>

        {/* ── Letter Idea ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10 }}
          className="rounded-2xl p-4 space-y-3"
          style={{ background: cardBg, border: `1px solid ${border}` }}
        >
          <h2 className="font-black text-sm" style={{ color: ACCENT }}>
            {t("فكرة الخطاب", "Letter Idea")}
          </h2>
          <div className="space-y-2">
            <label className="text-[11px] font-bold" style={{ color: textSub }}>
              {t("اشرح فكرة الخطاب باختصار *", "Briefly describe the letter idea *")}
            </label>
            <textarea
              value={letterIdea}
              onChange={(e) => setLetterIdea(e.target.value)}
              placeholder={t(
                "مثال: خطاب لتأكيد تسجيل الموظف في التأمينات الاجتماعية وطلب تحديث البيانات البنكية",
                "e.g. Letter to confirm employee registration in social insurance and request bank data update"
              )}
              rows={4}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: inputBg, border: `1px solid ${border}`, color: textMain }}
            />
          </div>
        </motion.div>

        {/* ── Generate Button ── */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={handleGenerate}
          disabled={!isValid || generateMutation.isPending}
          whileHover={isValid && !generateMutation.isPending ? { scale: 1.02 } : {}}
          whileTap={isValid && !generateMutation.isPending ? { scale: 0.98 } : {}}
          className="w-full py-3.5 rounded-2xl font-black text-sm transition-all"
          style={
            isValid && !generateMutation.isPending
              ? {
                  background: `linear-gradient(135deg, ${ACCENT}, oklch(0.65 0.12 85))`,
                  color: ACCENT_DARK,
                  boxShadow: `0 6px 24px ${ACCENT}40`,
                }
              : {
                  background: "var(--card)",
                  color: textMuted,
                  cursor: "not-allowed",
                }
          }
        >
          {generateMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {t("جاري الصياغة...", "Drafting...")}
            </span>
          ) : (
            t("✨ أنشئ مسودة الخطاب", "✨ Generate Letter Draft")
          )}
        </motion.button>

        {/* ── Error ── */}
        {generateMutation.isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl p-3 text-sm text-center"
            style={{ background: "oklch(0.20 0.08 15 / 0.30)", border: "1px solid oklch(0.50 0.15 15 / 0.40)", color: "oklch(0.75 0.12 15)" }}
          >
            {t("حدث خطأ أثناء الصياغة، يرجى المحاولة مرة أخرى", "An error occurred while drafting, please try again")}
          </motion.div>
        )}

        {/* ── Generated Letter ── */}
        <AnimatePresence>
          {generatedLetter && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-4 space-y-3"
              style={{
                background: "var(--background)",
                border: `1px solid ${ACCENT}40`,
                boxShadow: `0 4px 20px ${ACCENT}15`,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-black text-sm" style={{ color: ACCENT }}>
                  {t("مسودة الخطاب", "Letter Draft")}
                </h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all"
                  style={{
                    background: copied ? "oklch(0.55 0.18 145 / 0.25)" : `${ACCENT}20`,
                    color: copied ? "var(--success-strong)" : ACCENT,
                    border: `1px solid ${copied ? "oklch(0.55 0.18 145 / 0.40)" : ACCENT + "40"}`,
                  }}
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                        <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {t("تم النسخ!", "Copied!")}
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                        <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                      {t("نسخ الخطاب", "Copy Letter")}
                    </>
                  )}
                </button>
              </div>

              {/* Letter content */}
              <div
                className="rounded-xl p-4 text-sm leading-loose whitespace-pre-wrap"
                style={{
                  background: "var(--background)",
                  border: `1px solid ${border}`,
                  color: textMain,
                  fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif",
                  direction: "rtl",
                  textAlign: "right",
                }}
              >
                {generatedLetter}
              </div>

              {/* Regenerate */}
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full py-2.5 rounded-xl font-bold text-xs transition-all"
                style={{
                  background: "var(--card)",
                  color: textSub,
                  border: `1px solid ${border}`,
                }}
              >
                {t("🔄 إعادة الصياغة", "🔄 Regenerate")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-[10px] pb-6" style={{ color: textMuted }}>
          {t("المسودات المُنشأة للأغراض التوجيهية فقط، يُنصح بمراجعتها قبل الإرسال", "Generated drafts are for guidance only, review before sending")}
        </p>
      </div>
    </div>
  );
}
