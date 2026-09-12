import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";

/**
 * MUWAKABA — Documents Hub Page
 * مدخل موحد لـ: النماذج، الخطابات، السياسات، الإقرارات
 */

export default function DocumentsHubPage() {
  const [, navigate] = useLocation();
  const { t, dir } = useLang();

  const sections = [
    {
      id: "templates",
      path: "/templates",
      accent: "oklch(0.72 0.10 85)",
      accentBg: "oklch(0.72 0.10 85 / 0.10)",
      label: t("نماذج الموارد البشرية", "HR Forms"),
      desc: t(
        "28 نموذج HR مقسّمة على 11 فئة، قابلة للتحميل بصيغة Excel",
        "28 HR forms across 11 categories, downloadable as Excel"
      ),
      badge: t("28 نموذج", "28 Forms"),
      icon: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          <rect x="6" y="6" width="24" height="32" rx="4" fill="oklch(0.72 0.10 85 / 0.15)" stroke="oklch(0.72 0.10 85)" strokeWidth="2"/>
          <rect x="10" y="3" width="16" height="7" rx="3.5" fill="oklch(0.72 0.10 85 / 0.25)" stroke="oklch(0.72 0.10 85)" strokeWidth="1.5"/>
          <path d="M10 16h16M10 21h16M10 26h10" stroke="oklch(0.72 0.10 85)" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="36" cy="36" r="10" fill="oklch(0.72 0.10 85 / 0.20)" stroke="oklch(0.72 0.10 85)" strokeWidth="2"/>
          <path d="M36 31v5l3 3" stroke="oklch(0.72 0.10 85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: "letters",
      path: "/letters",
      accent: "oklch(0.55 0.22 220)",
      accentBg: "oklch(0.55 0.22 220 / 0.10)",
      label: t("مولّد الخطابات الرسمية", "Official Letter Generator"),
      desc: t(
        "أدخل فكرة الخطاب وبيانات المنشأة، واحصل على مسودة رسمية جاهزة بالذكاء الاصطناعي",
        "Enter your letter idea and company details, get a ready official draft via AI"
      ),
      badge: t("ذكاء اصطناعي", "AI Powered"),
      icon: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          <rect x="4" y="8" width="40" height="32" rx="5" fill="oklch(0.55 0.22 220 / 0.12)" stroke="oklch(0.55 0.22 220)" strokeWidth="2"/>
          <path d="M10 16h28M10 22h20M10 28h14" stroke="oklch(0.55 0.22 220)" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="38" cy="34" r="8" fill="oklch(0.55 0.22 220 / 0.20)" stroke="oklch(0.55 0.22 220)" strokeWidth="1.8"/>
          <path d="M35 37l1.5-4 4-4-1.5-1.5-4 4L35 37z" fill="oklch(0.55 0.22 220 / 0.5)" stroke="oklch(0.55 0.22 220)" strokeWidth="1" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: "policies",
      path: "/policies",
      accent: "oklch(0.55 0.22 170)",
      accentBg: "oklch(0.55 0.22 170 / 0.10)",
      label: t("السياسات والإجراءات", "HR Policies & Procedures"),
      desc: t(
        "21 سياسة وإجراء شاملة لإدارة الموارد البشرية، مقسّمة على 8 فئات مع إمكانية التحميل",
        "21 comprehensive HR policies across 8 categories with download"
      ),
      badge: t("21 سياسة", "21 Policies"),
      icon: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          <path d="M24 6 C16 6 6 9 6 9 L6 40 C6 40 16 37 24 37" fill="oklch(0.55 0.22 170 / 0.12)" stroke="oklch(0.55 0.22 170)" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M24 6 C32 6 42 9 42 9 L42 40 C42 40 32 37 24 37" fill="oklch(0.55 0.22 170 / 0.08)" stroke="oklch(0.55 0.22 170)" strokeWidth="2" strokeLinejoin="round"/>
          <line x1="24" y1="6" x2="24" y2="37" stroke="oklch(0.55 0.22 170)" strokeWidth="1.8"/>
          <path d="M10 15h12M10 20h12M10 25h8" stroke="oklch(0.55 0.22 170)" strokeWidth="1.5" strokeLinecap="round" opacity="0.9"/>
          <path d="M26 15h12M26 20h12M26 25h8" stroke="oklch(0.55 0.22 170)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
        </svg>
      ),
    },
    {
      id: "declarations",
      path: "/declarations",
      accent: "oklch(0.52 0.18 260)",
      accentBg: "oklch(0.52 0.18 260 / 0.10)",
      label: t("إقرارات التقييم الذاتي", "Self-Assessment Declarations"),
      desc: t(
        "14 إقرار خاص بالتقييم الذاتي لوزارة الموارد البشرية والتنمية الاجتماعية",
        "14 MHRSD self-assessment declarations for establishments"
      ),
      badge: t("14 إقرار", "14 Declarations"),
      icon: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          <rect x="8" y="8" width="32" height="36" rx="5" fill="oklch(0.52 0.18 260 / 0.12)" stroke="oklch(0.52 0.18 260)" strokeWidth="2"/>
          <rect x="16" y="5" width="16" height="7" rx="3.5" fill="oklch(0.52 0.18 260 / 0.25)" stroke="oklch(0.52 0.18 260)" strokeWidth="1.5"/>
          {/* Checklist */}
          <circle cx="15" cy="20" r="2.5" fill="oklch(0.52 0.18 260)" />
          <path d="M20 20h16" stroke="oklch(0.52 0.18 260)" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="15" cy="28" r="2.5" fill="oklch(0.52 0.18 260 / 0.5)" stroke="oklch(0.52 0.18 260)" strokeWidth="1.2"/>
          <path d="M20 28h16" stroke="oklch(0.52 0.18 260)" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
          <circle cx="15" cy="36" r="2.5" fill="oklch(0.52 0.18 260 / 0.5)" stroke="oklch(0.52 0.18 260)" strokeWidth="1.2"/>
          <path d="M20 36h10" stroke="oklch(0.52 0.18 260)" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
        </svg>
      ),
    },
  ];

  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        fontFamily: "'Cairo', sans-serif",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-5 py-4"
        style={{
          background: "var(--background)",
          borderBottom: `1px solid ${"var(--border)"}`,
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, color: "var(--muted-foreground)" }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-bold leading-tight" style={{ color: "var(--foreground)" }}>
            {t("النماذج والخطابات", "Documents & Letters Hub")}
          </h1>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {t("نماذج · خطابات · سياسات · إقرارات", "Forms · Letters · Policies · Declarations")}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-8 max-w-5xl mx-auto">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-xs font-semibold"
            style={{
              background: "oklch(0.72 0.10 85 / 0.15)",
              border: "1px solid oklch(0.72 0.10 85 / 0.4)",
              color: "oklch(0.72 0.10 85)",
            }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L13.414 4A2 2 0 0114 5.414V12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
            </svg>
            <span>{t("مركز الوثائق والمستندات", "Documents Center")}</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            {t(
              "اختر القسم المناسب للوصول إلى النماذج والخطابات والسياسات والإقرارات",
              "Choose the appropriate section to access forms, letters, policies, and declarations"
            )}
          </p>
        </motion.div>

        {/* 4 Section Cards */}
        <div className="grid grid-cols-1 gap-4">
          {sections.map((sec, i) => (
            <motion.button
              key={sec.id}
              onClick={() => navigate(sec.path)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full text-start rounded-2xl p-5 transition-all"
              style={{
                background: "var(--card)",
                border: `1px solid ${"var(--border)"}`,
                boxShadow: "0 2px 12px oklch(0 0 0 / 0.15)",
              }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: sec.accentBg, border: `1.5px solid ${sec.accent}33` }}
                >
                  {sec.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                      {sec.label}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: sec.accentBg,
                        color: sec.accent,
                        border: `1px solid ${sec.accent}44`,
                      }}
                    >
                      {sec.badge}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                    {sec.desc}
                  </p>
                </div>

                {/* Arrow */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-1"
                  style={{ background: sec.accentBg, color: sec.accent }}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                    style={{ transform: dir === "rtl" ? "scaleX(-1)" : "none" }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs mt-8 leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          {t(
            "جميع النماذج والوثائق مستخرجة من المصادر الرسمية لوزارة الموارد البشرية والتنمية الاجتماعية",
            "All forms and documents are sourced from official MHRSD references"
          )}
        </motion.p>
      </div>
    </div>
  );
}
