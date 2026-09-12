import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useState } from "react";
import { api } from "@/lib/api";

export default function DeclarationsPage() {
  const [, navigate] = useLocation();
  const { t, dir } = useLang();

  const { data } = api.declarations.getAll.useQuery();
  const declarations = data?.declarations ?? [];
  const declFileUrl = data?.fileUrl ?? "";

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = declarations.filter((d: any) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    String(d.id).includes(search)
  );

  const accent = "var(--danger)";
  const accentLight = "oklch(0.58 0.22 30 / 0.12)";
  const accentBorder = "oklch(0.58 0.22 30 / 0.3)";

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
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: "var(--background)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${"var(--border)"}`,
        }}
      >
        <button
          onClick={() => navigate("/")}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: "var(--card)",
            color: "var(--muted-foreground)",
          }}
        >
          {dir === "rtl" ? "→" : "←"}
        </button>
        <div>
          <h1
            className="font-black text-base leading-tight"
            style={{ fontFamily: "'Noto Naskh Arabic', serif", color: accent }}
          >
            {t("إقرارات التقييم الذاتي", "Self-Assessment Declarations")}
          </h1>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {t("وزارة الموارد البشرية والتنمية الاجتماعية", "Ministry of Human Resources")}
          </p>
        </div>
        <div className="flex-1" />
        {/* Download all */}
        <a
          href={declFileUrl}
          download="اقرارات-التقييم-الذاتي.docx"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{
            background: accentLight,
            border: `1px solid ${accentBorder}`,
            color: accent,
            textDecoration: "none",
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          {t("تحميل Word", "Download Word")}
        </a>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: "var(--card)",
            border: `1px solid ${"var(--border)"}`,
          }}
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 flex-shrink-0" style={{ color: "var(--muted-foreground)" }}>
            <path d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z" fill="currentColor" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ابحث عن إقرار...", "Search declarations...")}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--foreground)" }}
          />
        </div>
        <p className="text-xs mt-2 px-1" style={{ color: "var(--muted-foreground)" }}>
          {filtered.length} {t("إقرار", "declaration(s)")}
        </p>
      </div>

      {/* Declarations list */}
      <div className="px-4 pb-8 space-y-3">
        {filtered.map((decl: any, idx: any) => {
          const isOpen = expanded === decl.id;
          return (
            <motion.div
              key={decl.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "var(--card)",
                border: `1px solid ${isOpen ? accentBorder : ("var(--border)")}`,
                boxShadow: isOpen ? `0 4px 20px ${accentLight}` : "none",
              }}
            >
              {/* Header row */}
              <button
                onClick={() => setExpanded(isOpen ? null : decl.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-right"
              >
                {/* Number badge */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: accentLight, color: accent }}
                >
                  {decl.id}
                </div>
                <span
                  className="flex-1 font-bold text-sm leading-snug text-right"
                  style={{
                    fontFamily: "'Noto Naskh Arabic', serif",
                    color: "var(--foreground)",
                  }}
                >
                  {decl.title}
                </span>
                {/* Chevron */}
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 flex-shrink-0 transition-transform"
                  style={{
                    color: accent,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4"
                >
                  <div
                    className="rounded-xl p-3 mb-3 text-sm leading-relaxed"
                    style={{
                      background: "var(--background)",
                      color: "var(--muted-foreground)",
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    {decl.intro}
                  </div>
                  {decl.items.length > 0 && (
                    <ul className="space-y-1.5">
                      {decl.items.map((item: any, i: any) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                            style={{ background: accent }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Download this declaration */}
                  <a
                    href={declFileUrl}
                    download="اقرارات-التقييم-الذاتي.docx"
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{
                      background: accentLight,
                      border: `1px solid ${accentBorder}`,
                      color: accent,
                      textDecoration: "none",
                    }}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    {t("تحميل الإقرار", "Download")}
                  </a>
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--muted-foreground)" }}>
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">{t("لا توجد نتائج", "No results found")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
