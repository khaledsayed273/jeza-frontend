import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LanguageContext";

const VISIT_KEY = "muwakaba_visits";
const SESSION_KEY = "muwakaba_session";

function getVisitCount(): number {
  const stored = localStorage.getItem(VISIT_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function incrementVisit(): number {
  const alreadyCounted = sessionStorage.getItem(SESSION_KEY);
  if (!alreadyCounted) {
    const current = getVisitCount();
    const next = current + 1;
    localStorage.setItem(VISIT_KEY, String(next));
    sessionStorage.setItem(SESSION_KEY, "1");
    return next;
  }
  return getVisitCount();
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "م";
  if (n >= 1000) return (n / 1000).toFixed(1) + "ك";
  return n.toString();
}

export default function GlobalFooter() {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLang();
  const [visits, setVisits] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const count = incrementVisit();
    setVisits(count);
  }, []);

  const LAV = {
    bg: "var(--background)",
    border: "var(--border)",
    text: "var(--foreground)",
    muted: "var(--muted-foreground)",
    dim: "var(--muted-foreground)",
    primary: "var(--primary)",
    card: "var(--card)",
  };

  const handleThemeToggle = () => {
    setAnimating(true);
    toggleTheme?.();
    setTimeout(() => setAnimating(false), 500);
  };

  return (
    <footer
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="w-full border-t mt-auto"
      style={{ background: LAV.bg, borderColor: LAV.border }}
    >
      <div className="max-w-lg mx-auto px-5 py-4 flex flex-col gap-3">
        {/* Visit Counter */}
        <div className="flex items-center justify-center gap-3">
          <div
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl"
            style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}
          >
            {/* Eye icon */}
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 flex-shrink-0" style={{ color: LAV.primary }}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
            </svg>
            <div className="flex flex-col items-center">
              <span
                className="text-xl font-black leading-none"
                style={{ fontFamily: "'Cairo', sans-serif", color: LAV.primary }}
              >
                {formatNumber(visits)}
              </span>
              <span
                className="text-[9px] leading-none mt-0.5"
                style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}
              >
                {t("زيارة", "visit")}
              </span>
            </div>
            {/* Pulse dot */}
            <div className="relative w-2 h-2">
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: LAV.primary, opacity: 0.4 }}
              />
              <div className="w-2 h-2 rounded-full" style={{ background: LAV.primary }} />
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Theme Toggle */}
          <button
            onClick={handleThemeToggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
            style={{
              background: LAV.card,
              border: `1px solid ${LAV.border}`,
              color: LAV.text,
            }}
            title={t("تبديل الوضع", "Toggle theme")}
          >
            <span
              className="text-base transition-transform duration-300"
              style={{ display: "inline-block", transform: animating ? "rotate(20deg)" : "rotate(0deg)" }}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </span>
            <span
              className="text-[10px] font-semibold"
              style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}
            >
              {t("السمة", "Theme")}
            </span>
          </button>

          {/* Copyright */}
          <p
            className="text-[9px] text-center"
            style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}
          >
            {t("© 2026 مواكبة — جزاء البقمي", "© 2026 Muwakaba — Jaza Al-Baqami")}
          </p>

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
            style={{
              background: LAV.card,
              border: `1px solid ${LAV.border}`,
              color: LAV.text,
            }}
            title={t("English", "العربية")}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" style={{ color: LAV.primary }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span
              className="text-[10px] font-bold"
              style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}
            >
              {lang === "ar" ? "EN" : "ع"}
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
