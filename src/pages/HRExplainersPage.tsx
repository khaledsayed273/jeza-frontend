import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = "all" | "contracts" | "insurance" | "penalties" | "platforms" | "hr-management";

// ─── Icon per category ────────────────────────────────────────────────────────
function CategoryIcon({ cat, color }: { cat: Category; color: string }) {
  if (cat === "contracts") return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="4" width="32" height="40" rx="4" fill={`${color}15`} stroke={color} strokeWidth="2"/>
      <path d="M14 14h20M14 20h20M14 26h20M14 32h12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  if (cat === "insurance") return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 4L6 14v10c0 11 8 20 18 22 10-2 18-11 18-22V14L24 4z" fill={`${color}15`} stroke={color} strokeWidth="2"/>
      <path d="M17 24l4 4 10-10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (cat === "penalties") return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 6l18 32H6L24 6z" fill={`${color}15`} stroke={color} strokeWidth="2"/>
      <path d="M24 20v8M24 33v2" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
  if (cat === "platforms") return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="4" y="8" width="40" height="28" rx="4" fill={`${color}15`} stroke={color} strokeWidth="2"/>
      <path d="M16 36v4M32 36v4M12 40h24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="22" r="6" fill={`${color}20`} stroke={color} strokeWidth="2"/>
    </svg>
  );
  if (cat === "hr-management") return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="18" r="8" fill={`${color}15`} stroke={color} strokeWidth="2"/>
      <path d="M8 42c0-8.8 7.2-16 16-16s16 7.2 16 16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="18" height="18" rx="3" fill={`${color}15`} stroke={color} strokeWidth="2"/>
      <rect x="26" y="4" width="18" height="18" rx="3" fill={`${color}15`} stroke={color} strokeWidth="2"/>
      <rect x="4" y="26" width="18" height="18" rx="3" fill={`${color}15`} stroke={color} strokeWidth="2"/>
      <rect x="26" y="26" width="18" height="18" rx="3" fill={`${color}15`} stroke={color} strokeWidth="2"/>
    </svg>
  );
}

// ─── HR Images Data ──────────────────────────────────────────────────────────────────────────────────
interface HRImage { id: string; titleAr: string; url: string; }

// ─── Component ──────────────────────────────────────────────────────────────────────────────────
export default function HRExplainersPage() {
  const { t, lang, dir } = useLang();

  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxImg, setLightboxImg] = useState<HRImage | null>(null);
  const { data } = api.hrExplainers.getAll.useQuery();
  const SOURCES = data?.sources ?? [];
  const CATEGORIES = data?.categories ?? [];
  const HR_IMAGES = data?.images ?? [];
  const bg = "var(--background)";
  const cardBg = "var(--card)";
  const cardBorder = "var(--border)";
  const textMain = "var(--foreground)";
  const textMuted = "var(--muted-foreground)";
  const textSub = "var(--muted-foreground)";
  const inputBg = "var(--input)";
  const inputBorder = "var(--border)";

  const filtered = useMemo(() => {
    let list = activeCategory === "all" ? SOURCES : SOURCES.filter((s: any) => s.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((s: any) => s.titleAr.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, searchQuery, SOURCES]);

  const activeCat = CATEGORIES.find((c: any) => c.id === activeCategory)!;

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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 text-xs font-semibold"
              style={{ background: "color-mix(in oklch, var(--primary) 15%, transparent)", border: "1px solid color-mix(in oklch, var(--primary) 40%, transparent)", color: "var(--primary)" }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
              </svg>
              {t("تعلم ذاتي", "Self Learning")}
            </div>
            <h1
              className="text-2xl font-black mb-2"
              style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: textMain }}
            >
              {t("شروحات موارد بشرية", "HR Explainers")}
            </h1>
            <p className="text-sm" style={{ color: textSub }}>
              {t(
                "مكتبة شاملة من الشروحات والأدلة المتخصصة في الموارد البشرية — للقراءة والتحميل المباشر",
                "A comprehensive library of HR guides and explainers — read and download directly"
              )}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pt-5">

        {/* ── Search Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-4"
        >
          <div
            className="absolute inset-y-0 flex items-center pointer-events-none"
            style={{ [dir === "rtl" ? "right" : "left"]: "0.875rem" }}
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" style={{ color: textMuted }}>
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("ابحث عن ملف...", "Search files...")}
            className="w-full text-sm rounded-xl py-2.5 transition-all outline-none"
            style={{
              background: inputBg,
              border: `1px solid ${searchQuery ? "color-mix(in oklch, var(--primary) 50%, transparent)" : inputBorder}`,
              color: textMain,
              [dir === "rtl" ? "paddingRight" : "paddingLeft"]: "2.5rem",
              [dir === "rtl" ? "paddingLeft" : "paddingRight"]: searchQuery ? "2.5rem" : "1rem",
              boxShadow: searchQuery ? "0 0 0 3px color-mix(in oklch, var(--primary) 12%, transparent)" : "none",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 flex items-center px-3 transition-opacity hover:opacity-70"
              style={{ [dir === "rtl" ? "left" : "right"]: 0 }}
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" style={{ color: textMuted }}>
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </motion.div>

        {/* ── Category Filter ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap gap-2 mb-4"
        >
          {CATEGORIES.map((cat: any) => {
            const isActive = activeCategory === cat.id;
            const count = cat.id === "all" ? SOURCES.length : SOURCES.filter((s: any) => s.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: isActive ? cat.color : `${cat.color}15`,
                  color: isActive ? "white" : cat.color,
                  border: `1px solid ${isActive ? cat.color : cat.color + "40"}`,
                  boxShadow: isActive ? `0 4px 12px ${cat.color}35` : "none",
                  transform: isActive ? "scale(1.04)" : "scale(1)",
                }}
              >
                <span>{cat.icon}</span>
                <span>{t(cat.labelAr, cat.labelEn)}</span>
                <span
                  className="text-[9px] font-black px-1 rounded-full"
                  style={{
                    background: isActive ? "oklch(1 0 0 / 0.25)" : `${cat.color}25`,
                    color: isActive ? "white" : cat.color,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Results count ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs" style={{ color: textMuted }}>
            {filtered.length === 0
              ? t("لا توجد نتائج", "No results found")
              : `${filtered.length} ${t("مصدر", "sources")}${activeCategory !== "all" ? ` — ${activeCat.labelAr}` : ""}`
            }
            {searchQuery && ` ${t("لـ", "for")} "${searchQuery}"`}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all"
              style={{ background: "color-mix(in oklch, var(--primary) 15%, transparent)", color: "var(--primary)" }}
            >
              {t("مسح البحث", "Clear")}
            </button>
          )}
        </div>

        {/* ── Podcast Banner ── */}
        <motion.a
          href="https://youtu.be/Cu2w-1O2S8I"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, boxShadow: "0 12px 40px oklch(0.48 0.22 15 / 0.25)" }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-4 rounded-2xl p-4 mb-5 cursor-pointer"
          style={{
            background: "var(--card)",
            border: "1px solid oklch(0.48 0.22 15 / 0.35)",
            boxShadow: "0 4px 20px oklch(0.48 0.22 15 / 0.12)",
            textDecoration: "none",
          }}
        >
          {/* YouTube icon */}
          <div
            className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.48 0.22 15 / 0.20), oklch(0.48 0.22 15 / 0.10))",
              border: "1px solid oklch(0.48 0.22 15 / 0.35)",
            }}
          >
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
              <rect x="4" y="10" width="36" height="24" rx="6" fill="oklch(0.48 0.22 15 / 0.20)" stroke="oklch(0.48 0.22 15)" strokeWidth="1.8"/>
              <path d="M18 16l10 6-10 6V16z" fill="oklch(0.48 0.22 15)" stroke="oklch(0.48 0.22 15)" strokeWidth="1" strokeLinejoin="round"/>
              <path d="M6 38c4-2 8-3 16-3s12 1 16 3" stroke="oklch(0.48 0.22 15)" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
            </svg>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0" style={{ textAlign: dir === "rtl" ? "right" : "left" }}>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[9px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "oklch(0.48 0.22 15 / 0.20)", color: "oklch(0.48 0.22 15)", border: "1px solid oklch(0.48 0.22 15 / 0.35)" }}
              >
                {t("▶ يوتيوب", "▶ YouTube")}
              </span>
            </div>
            <h3
              className="font-black text-sm leading-tight mb-0.5"
              style={{
                fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif",
                color: textMain,
              }}
            >
              {t("بودكاست الموارد البشرية", "HR Podcast")}
            </h3>
            <p className="text-[10px] leading-snug" style={{ color: textSub }}>
              {t(
                "بودكاست جزاء البقمي — حوار متخصص في الموارد البشرية ونظام العمل السعودي",
                "Jaza Al-Baqami Podcast — specialized in HR and Saudi labor law"
              )}
            </p>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" style={{ color: "oklch(0.48 0.22 15)", transform: dir === "rtl" ? "scaleX(-1)" : "none" }}>
              <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </motion.a>

        {/* ── Grid ── */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm font-semibold" style={{ color: textSub }}>
                {t("لا توجد ملفات تطابق بحثك", "No files match your search")}
              </p>
              <p className="text-xs mt-1" style={{ color: textMuted }}>
                {t("جرب كلمة أخرى أو اختر تصنيفاً مختلفاً", "Try a different keyword or category")}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={`${activeCategory}-${searchQuery}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {filtered.map((src: any, i: any) => {
                const cat = CATEGORIES.find((c: any) => c.id === src.category)!;
                return (
                  <motion.div
                    key={src.id}
                    className="relative rounded-2xl p-4 flex flex-col gap-2 group"
                    style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ scale: 1.02, borderColor: `${src.color}60`, boxShadow: `0 8px 24px ${src.color}18` }}
                  >
                    {/* Category badge */}
                    <span
                      className="absolute top-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `${cat.color}18`,
                        color: cat.color,
                        [dir === "rtl" ? "left" : "right"]: "0.5rem",
                      }}
                    >
                      {cat.icon}
                    </span>

                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-2xl p-2.5"
                      style={{ background: `${src.color}12`, border: `1px solid ${src.color}25` }}
                    >
                      <CategoryIcon cat={src.category} color={src.color} />
                    </div>

                    {/* Title — highlight search match */}
                    <h3
                      className="font-black text-sm leading-tight"
                      style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: textMain }}
                    >
                      {searchQuery
                        ? (() => {
                            const idx = src.titleAr.toLowerCase().indexOf(searchQuery.toLowerCase());
                            if (idx === -1) return src.titleAr;
                            return (
                              <>
                                {src.titleAr.slice(0, idx)}
                                <mark style={{ background: `${src.color}35`, color: src.color, borderRadius: "2px", padding: "0 1px" }}>
                                  {src.titleAr.slice(idx, idx + searchQuery.length)}
                                </mark>
                                {src.titleAr.slice(idx + searchQuery.length)}
                              </>
                            );
                          })()
                        : t(src.titleAr, src.titleAr)
                      }
                    </h3>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto">
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
                        {t("اقرأ", "Read")}
                      </a>
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
                          textDecoration: "none",
                        }}
                      >
                        <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                          <path d="M8 3v7M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {t("تحميل", "Download")}
                      </a>
                    </div>

                    {/* Bottom accent */}
                    <div
                      className="h-0.5 rounded-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: `linear-gradient(to ${dir === "rtl" ? "left" : "right"}, ${src.color}, transparent)` }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HR Infographics Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="mt-10"
        >
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-8 rounded-full" style={{ background: "var(--primary)" }} />
            <div>
              <h2
                className="text-lg font-black"
                style={{
                  fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif",
                  color: textMain,
                }}
              >
                {t("إنفوغرافيك موارد بشرية", "HR Infographics")}
              </h2>
              <p className="text-xs" style={{ color: textMuted }}>
                {t("شروحات مرئية متخصصة — اضغط على أي صورة لتكبيرها", "Visual HR explainers — tap any image to enlarge")}
              </p>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {HR_IMAGES.map((img: any, i: any) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.02, boxShadow: "0 8px 24px color-mix(in oklch, var(--primary) 15%, transparent)" }}
                className="group rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  transition: "all 0.2s ease",
                }}
                onClick={() => setLightboxImg(img)}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
                  <img
                    src={img.url}
                    alt={img.titleAr}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ background: "color-mix(in oklch, var(--primary) 15%, transparent)" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="p-2.5">
                  <p
                    className="text-xs font-bold leading-tight"
                    style={{
                      fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif",
                      color: textMain,
                    }}
                  >
                    {img.titleAr}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Lightbox ── */}
        <AnimatePresence>
          {lightboxImg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "oklch(0 0 0 / 0.85)" }}
              onClick={() => setLightboxImg(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <img
                  src={lightboxImg.url}
                  alt={lightboxImg.titleAr}
                  className="w-full h-auto"
                />
                <div
                  className="p-3 text-center"
                  style={{ background: "var(--card)" }}
                >
                  <p
                    className="font-black text-sm"
                    style={{
                      fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif",
                      color: textMain,
                    }}
                  >
                    {lightboxImg.titleAr}
                  </p>
                </div>
                <button
                  onClick={() => setLightboxImg(null)}
                  className="absolute top-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{
                    [dir === "rtl" ? "left" : "right"]: "0.5rem",
                    background: "oklch(0 0 0 / 0.6)",
                  }}
                >
                  ×
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-[10px] mt-8"
          style={{ color: textMuted }}
        >
          {t(
            "جميع الملفات للأغراض التعليمية والتثقيفية",
            "All files are for educational purposes"
          )}
        </motion.p>
      </div>
    </div>
  );
}
