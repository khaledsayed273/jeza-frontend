import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";

/**
 * MUWAKABA — Templates & Letters Page
 * Two tabs: HR Forms (Excel/PDF download) | Letters (AI generator)
 */

// Helper: open file in new tab (works with CDN redirects)
function downloadFile(url: string, filename: string) {
  // Fetch the file then trigger download to bypass CDN redirect issues
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    })
    .catch(() => window.open(url, "_blank"));
}

export default function TemplatesPage() {
  const [, navigate] = useLocation();
  const { t, lang, dir } = useLang();

  const { data } = api.templates.getAll.useQuery();
  const forms = data?.forms ?? [];
  const formCategories = data?.categories ?? [];
  const categoryIcons = data?.categoryIcons ?? {};

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("الكل");

  const textMain = "var(--foreground)";
  const textSub = "var(--muted-foreground)";
  const textMuted = "var(--muted-foreground)";
  const cardBg = "var(--card)";
  const border = "var(--border)";
  const pageBg = "var(--background)";
  const inputBg = "var(--input)";
  const ACCENT = "oklch(0.72 0.10 85)";

  const filtered = useMemo(() => {
    return forms.filter((f: any) => {
      const matchCat = category === "الكل" || f.category === category;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        f.ar.toLowerCase().includes(q) ||
        f.en.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category, forms]);

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
        {/* Back + Title */}
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
              {t("النماذج والخطابات", "Templates & Letters")}
            </h1>
            <p className="text-[10px]" style={{ color: textMuted }}>
              {t("نماذج HR قابلة للتحميل · مولّد خطابات بالذكاء الاصطناعي", "Downloadable HR forms · AI letter generator")}
            </p>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 max-w-5xl mx-auto mb-3">
          <button
            onClick={() => navigate("/templates")}
            className="flex-1 py-2 rounded-xl font-bold text-xs transition-all"
            style={{
              background: `linear-gradient(135deg, ${ACCENT}, oklch(0.65 0.12 85))`,
              color: "oklch(0.10 0.02 85)",
              boxShadow: `0 4px 16px ${ACCENT}40`,
            }}
          >
            {t("📄 النماذج", "📄 Forms")}
          </button>
          <button
            onClick={() => navigate("/letters")}
            className="flex-1 py-2 rounded-xl font-bold text-xs transition-all"
            style={{
              background: "var(--card)",
              color: textSub,
              border: `1px solid ${border}`,
            }}
          >
            {t("✉️ الخطابات", "✉️ Letters")}
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-5xl mx-auto">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ [dir === "rtl" ? "right" : "left"]: "12px", color: textMuted }}
          >
            <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ابحث عن نموذج...", "Search for a form...")}
            className="w-full rounded-xl py-2.5 text-xs outline-none"
            style={{
              background: inputBg,
              border: `1px solid ${border}`,
              color: textMain,
              [dir === "rtl" ? "paddingRight" : "paddingLeft"]: "36px",
              [dir === "rtl" ? "paddingLeft" : "paddingRight"]: "12px",
            }}
          />
        </div>
      </div>

      <div className="px-4 py-4 max-w-5xl mx-auto">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: "none" }}>
          {formCategories.map((cat: any) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all"
              style={
                category === cat
                  ? { background: ACCENT, color: "oklch(0.10 0.02 85)", boxShadow: `0 2px 12px ${ACCENT}40` }
                  : { background: "var(--card)", color: textSub, border: `1px solid ${border}` }
              }
            >
              <span>{categoryIcons[cat]}</span>
              <span>{cat}</span>
              {category !== cat && (
                <span
                  className="rounded-full px-1.5 text-[9px] font-black"
                  style={{ background: "var(--card)", color: textMuted }}
                >
                  {cat === "الكل" ? forms.length : forms.filter((f: any) => f.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-[10px] mb-3" style={{ color: textMuted }}>
          {t(`${filtered.length} نموذج`, `${filtered.length} forms`)}
        </p>

        {/* Forms grid */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
              style={{ color: textMuted }}
            >
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm font-bold">{t("لا توجد نماذج مطابقة", "No matching forms")}</p>
            </motion.div>
          ) : (
            <motion.div
              key={category + search}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-3"
            >
              {filtered.map((form: any, i: any) => (
                <motion.div
                  key={form.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 rounded-2xl p-3 group"
                  style={{ background: cardBg, border: `1px solid ${border}` }}
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}
                  >
                    <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
                      <rect x="4" y="2" width="18" height="24" rx="3" fill={`${ACCENT}20`} stroke={ACCENT} strokeWidth="1.6" />
                      <path d="M8 10h10M8 14h10M8 18h6" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" />
                      <rect x="18" y="18" width="10" height="10" rx="2" fill={`${ACCENT}25`} stroke={ACCENT} strokeWidth="1.4" />
                      <path d="M21 23h4M23 21v4" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded"
                        style={{ background: `${ACCENT}20`, color: ACCENT }}
                      >
                        {form.code}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ background: "var(--card)", color: textMuted }}
                      >
                        {categoryIcons[form.category]} {form.category}
                      </span>
                    </div>
                    <p
                      className="font-bold text-sm leading-tight"
                      style={{ color: textMain, fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif" }}
                    >
                      {lang === "ar" ? form.ar : form.en}
                    </p>
                    <p className="text-[10px]" style={{ color: textMuted }}>
                      {lang === "ar" ? form.en : form.ar}
                    </p>
                  </div>

                  {/* Download button */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => downloadFile(form.file, `${form.code}-${form.ar}.${form.file.split('.').pop()}`)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: `linear-gradient(135deg, ${ACCENT}, oklch(0.65 0.12 85))`,
                        color: "oklch(0.10 0.02 85)",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                        <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      {form.ext ?? "تحميل"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer note */}
        <p className="text-center text-[10px] mt-8" style={{ color: textMuted }}>
          {t("جميع النماذج للأغراض التعليمية والتثقيفية", "All forms are for educational purposes")}
        </p>
      </div>
    </div>
  );
}
