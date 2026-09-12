import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useState } from "react";
import { api } from "@/lib/api";

export default function PoliciesPage() {
  const [, navigate] = useLocation();
  const { t, dir } = useLang();

  const { data } = api.policies.getAll.useQuery();
  const policies = data?.policies ?? [];
  const CATEGORIES = data?.categories ?? [];
  const CATEGORY_COLORS = data?.categoryColors ?? {};
  const policiesFileUrl = data?.fileUrl ?? "";

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = policies.filter((p: any) => {
    const matchSearch =
      p.ar.includes(search) ||
      p.en.toLowerCase().includes(search.toLowerCase()) ||
      p.id.includes(search) ||
      String(p.chapterNum).includes(search);
    const matchCat = activeCategory === "الكل" || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const accent = "oklch(0.55 0.22 170)";
  const accentLight = "oklch(0.55 0.22 170 / 0.12)";
  const accentBorder = "oklch(0.55 0.22 170 / 0.3)";

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
          className="w-8 h-8 rounded-full flex items-center justify-center"
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
            {t("سياسات وإجراءات الموارد البشرية", "HR Policies & Procedures")}
          </h1>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {t("دليل سياسات وإجراءات إدارة الموارد البشرية 2024", "HR Policies Manual 2024")}
          </p>
        </div>
        <div className="flex-1" />
        <a
          href={policiesFileUrl}
          download="hr-policies-procedures-2024.docx"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
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
          {t("تحميل الدليل", "Download")}
        </a>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
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
            placeholder={t("ابحث عن سياسة...", "Search policies...")}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--foreground)" }}
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat: any) => {
            const isActive = activeCategory === cat;
            const catColor = cat === "الكل" ? accent : (CATEGORY_COLORS[cat] || accent);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all"
                style={{
                  background: isActive ? catColor : ("var(--card)"),
                  color: isActive ? "white" : ("var(--muted-foreground)"),
                  border: `1px solid ${isActive ? catColor : ("var(--border)")}`,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
        <p className="text-xs mt-2 px-1" style={{ color: "var(--muted-foreground)" }}>
          {filtered.length} {t("سياسة", "policy(ies)")}
        </p>
      </div>

      {/* Policies list */}
      <div className="px-4 pb-8 space-y-3">
        {filtered.map((policy: any, idx: any) => {
          const isOpen = expanded === policy.id;
          const catColor = CATEGORY_COLORS[policy.category] || accent;
          return (
            <motion.div
              key={policy.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "var(--card)",
                border: `1px solid ${isOpen ? `${catColor}50` : ("var(--border)")}`,
                boxShadow: isOpen ? `0 4px 20px ${catColor}15` : "none",
              }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : policy.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-right"
              >
                {/* Chapter badge */}
                <div
                  className="w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{ background: `${catColor}15`, border: `1px solid ${catColor}30` }}
                >
                  <span className="text-[8px] font-bold" style={{ color: catColor }}>باب</span>
                  <span className="text-sm font-black" style={{ color: catColor }}>{policy.chapterNum}</span>
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-black text-sm leading-snug"
                      style={{
                        fontFamily: "'Noto Naskh Arabic', serif",
                        color: "var(--foreground)",
                      }}
                    >
                      {policy.ar}
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: `${catColor}20`, color: catColor }}
                    >
                      {policy.category}
                    </span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {policy.en}
                  </p>
                </div>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 flex-shrink-0 transition-transform"
                  style={{
                    color: catColor,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="px-4 pb-4 space-y-3"
                >
                  {/* Objectives */}
                  {policy.objectives.length > 0 && (
                    <div>
                      <p className="text-xs font-bold mb-1.5" style={{ color: catColor }}>
                        {t("الأهداف", "Objectives")}
                      </p>
                      <ul className="space-y-1">
                        {policy.objectives.map((obj: any, i: any) => (
                          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                            <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: catColor }} />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Policies */}
                  {policy.policies.length > 0 && (
                    <div>
                      <p className="text-xs font-bold mb-1.5" style={{ color: catColor }}>
                        {t("السياسات", "Policies")}
                      </p>
                      <ul className="space-y-1">
                        {policy.policies.map((pol: any, i: any) => (
                          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                            <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: catColor }} />
                            {pol}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Procedures */}
                  {policy.procedures.length > 0 && (
                    <div>
                      <p className="text-xs font-bold mb-1.5" style={{ color: catColor }}>
                        {t("الإجراءات", "Procedures")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {policy.procedures.map((proc: any, i: any) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              background: "var(--card)",
                              color: "var(--muted-foreground)",
                              border: `1px solid ${"var(--border)"}`,
                            }}
                          >
                            {proc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Download */}
                  <a
                    href={policiesFileUrl}
                    download="hr-policies-procedures-2024.docx"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{
                      background: `${catColor}15`,
                      border: `1px solid ${catColor}30`,
                      color: catColor,
                      textDecoration: "none",
                    }}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    {t("تحميل الدليل الكامل Word", "Download Full Guide")}
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
