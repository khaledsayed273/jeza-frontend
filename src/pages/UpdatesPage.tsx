import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

function SourceIcon({ id, color }: { id: string; color: string }) {
  switch (id) {
    case "labor-law-2026":
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect x="6" y="4" width="36" height="40" rx="4" fill={`${color} / 0.12`} stroke={color} strokeWidth="2"/>
          <rect x="14" y="8" width="20" height="5" rx="2" fill={`${color} / 0.2`} stroke={color} strokeWidth="1.5"/>
          <path d="M12 18h24M12 24h24M12 30h16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          <path d="M30 36l4-4 4 4M34 32v8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "labor-law-exec":
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect x="8" y="4" width="32" height="40" rx="4" fill={`${color} / 0.12`} stroke={color} strokeWidth="2"/>
          <path d="M14 14h20M14 20h20M14 26h20M14 32h12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          <circle cx="36" cy="36" r="8" fill={`${color} / 0.15`} stroke={color} strokeWidth="2"/>
          <path d="M33 36l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "health-insurance":
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M24 6L8 14v10c0 11 7 20 16 24 9-4 16-13 16-24V14L24 6z" fill={`${color} / 0.12`} stroke={color} strokeWidth="2"/>
          <path d="M20 24h8M24 20v8" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );
    case "social-insurance":
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect x="4" y="8" width="40" height="32" rx="4" fill={`${color} / 0.12`} stroke={color} strokeWidth="2"/>
          <circle cx="18" cy="24" r="5" fill={`${color} / 0.2`} stroke={color} strokeWidth="2"/>
          <path d="M28 20h8M28 24h6M28 28h8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case "saned":
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="24" cy="20" r="8" fill={`${color} / 0.12`} stroke={color} strokeWidth="2"/>
          <path d="M10 40c0-7.7 6.3-14 14-14s14 6.3 14 14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          <path d="M30 34l4 4 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "gosi-guide":
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect x="4" y="8" width="40" height="28" rx="4" fill={`${color} / 0.12`} stroke={color} strokeWidth="2"/>
          <circle cx="24" cy="22" r="6" fill={`${color} / 0.15`} stroke={color} strokeWidth="2"/>
          <path d="M24 19v3l2 2" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M8 16h4M36 16h4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case "nitaqat-2026":
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect x="6" y="6" width="36" height="36" rx="4" fill={`${color} / 0.12`} stroke={color} strokeWidth="2"/>
          <path d="M12 34l8-10 6 6 6-8 8 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="20" cy="16" r="3" fill={`${color} / 0.25`} stroke={color} strokeWidth="1.5"/>
        </svg>
      );
    case "hrsd":
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="24" cy="24" r="18" fill={`${color} / 0.12`} stroke={color} strokeWidth="2"/>
          <path d="M6 24h36M24 6c-4 5-6 11-6 18s2 13 6 18M24 6c4 5 6 11 6 18s-2 13-6 18" stroke={color} strokeWidth="2"/>
        </svg>
      );
    case "gosi":
      return (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M24 4L6 14v10c0 10 8 19 18 22 10-3 18-12 18-22V14L24 4z" fill={`${color} / 0.12`} stroke={color} strokeWidth="2"/>
          <path d="M17 24l4 4 10-10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return null;
  }
}

export default function UpdatesPage() {
  const { t, lang, dir } = useLang();

  const { data } = api.updates.getAll.useQuery();
  const sources = data?.sources ?? [];

  const bg = "var(--background)";
  const cardBg = "var(--card)";
  const cardBorder = "var(--border)";
  const textMain = "var(--foreground)";
  const textSub = "var(--muted-foreground)";
  const textMuted = "var(--muted-foreground)";
  const comingBg = "color-mix(in oklch, var(--muted-foreground) 8%, var(--background))";
  const comingBorder = "color-mix(in oklch, var(--muted-foreground) 20%, transparent)";

  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        fontFamily: "'Cairo', sans-serif",
        background: bg,
        color: textMain,
        paddingBottom: "3rem",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "var(--card)",
          borderBottom: `1px solid ${cardBorder}`,
          padding: "2rem 1.25rem 1.5rem",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 text-xs font-semibold"
              style={{
                background: "color-mix(in oklch, var(--primary) 15%, transparent)",
                border: "1px solid color-mix(in oklch, var(--primary) 40%, transparent)",
                color: "color-mix(in oklch, var(--primary) 100%, transparent)",
              }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
              </svg>
              {t("تعلم ذاتي", "Self Learning")}
            </div>

            <h1
              className="text-2xl font-black mb-2"
              style={{
                fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif",
                color: textMain,
              }}
            >
              {t("واكب التحديثات", "Stay Updated")}
            </h1>
            <p className="text-sm" style={{ color: textSub }}>
              {t(
                "مصادر رسمية معتمدة للقراءة والتعلم الذاتي في مجال الموارد البشرية والتأمينات الاجتماعية",
                "Official certified sources for self-learning in HR and social insurance"
              )}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pt-6">

        {/* ── Coming Updates Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 rounded-2xl p-4 flex items-start gap-3"
          style={{
            background: comingBg,
            border: `1.5px dashed ${comingBorder}`,
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "color-mix(in oklch, var(--primary) 15%, transparent)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" style={{ color: "var(--primary)" }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p
              className="text-sm font-bold mb-0.5"
              style={{ color: "var(--primary)" }}
            >
              {t("قريباً — تحديثات نظامية جديدة", "Coming Soon — New Regulatory Updates")}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: textMuted }}>
              {t(
                "أي تحديث نظامي جديد سيتم إضافته هنا فور صدوره — تابع المنصة للاطلاع على أحدث القرارات والتعديلات",
                "Any new regulatory update will be added here as soon as it is issued — follow the platform for the latest decisions and amendments"
              )}
            </p>
          </div>
        </motion.div>

        {/* ── Section Title ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: textMuted }}
        >
          {t("المصادر الرئيسية — اقرأ أكثر", "Key Sources — Read More")}
        </motion.p>

        {/* ── Sources Grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sources.map((src: any, i: number) => (
            <motion.div
              key={src.id}
              className="relative rounded-2xl p-4 flex flex-col gap-2 group transition-all"
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              whileHover={{
                scale: 1.03,
                borderColor: `${src.color}60`,
                boxShadow: `0 8px 30px ${src.color}20`,
              }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Type badge */}
              <span
                className="absolute top-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: `${src.color}20`,
                  color: src.color,
                  [dir === "rtl" ? "left" : "right"]: "0.5rem",
                }}
              >
                {src.type === "pdf" ? "PDF" : t("موقع", "Link")}
              </span>

              {/* Icon */}
              <div
                className="w-12 h-12 rounded-2xl p-2.5"
                style={{ background: `${src.color}12`, border: `1px solid ${src.color}25` }}
              >
                <SourceIcon id={src.id} color={src.color} />
              </div>

              {/* Text */}
              <div>
                <h3
                  className="font-black text-sm leading-tight mb-1"
                  style={{
                    fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif",
                    color: textMain,
                  }}
                >
                  {t(src.titleAr, src.titleEn)}
                </h3>
                <p className="text-[10px] leading-snug" style={{ color: textMuted }}>
                  {t(src.descAr, src.descEn)}
                </p>
              </div>

              {/* Bottom actions */}
              <div className="flex items-center gap-2 mt-auto">
                {/* Read more */}
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: src.color, textDecoration: "none" }}
                >
                  <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t("اقرأ أكثر", "Read More")}
                </a>

                {/* Download button — PDF only */}
                {src.type === "pdf" && (
                  <a
                    href={src.url}
                    download
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full transition-all"
                    style={{
                      background: `${src.color}18`,
                      color: src.color,
                      border: `1px solid ${src.color}35`,
                      marginInlineStart: "auto",
                    }}
                    title={t("تحميل", "Download")}
                  >
                    <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                      <path d="M8 3v7M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {t("تحميل", "Download")}
                  </a>
                )}
              </div>

              {/* Bottom accent */}
              <div
                className="h-0.5 rounded-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(to ${dir === "rtl" ? "left" : "right"}, ${src.color}, transparent)` }}
              />
            </motion.div>
          ))}
        </div>

        {/* ── Footer note ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-[10px] mt-8"
          style={{ color: textMuted }}
        >
          {t(
            "جميع المصادر رسمية صادرة عن الجهات الحكومية المختصة",
            "All sources are official and issued by competent government authorities"
          )}
        </motion.p>
      </div>
    </div>
  );
}
