import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ExternalLink, Send, AlertCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/api";

/**
 * MUWAKABA — Resources Page
 * Design: Dark background + Lavender/Khuzami accent
 * Font: Noto Naskh Arabic (headings) + Cairo (body)
 */

const LOGO_URL_DEFAULT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663364198732/2vuJLs9j7vTiL4E4emfRJ8/muwakaba_logo_v2-SCNMsUQ2s4hs6UtaXq88Y7.webp";

const BASE = "https://www.hrsd.gov.sa/knowledge-centre/decisions-and-regulations/regulation-and-procedures/";

const LAV = {
  bg: "var(--background)",
  card: "var(--card)",
  inner: "var(--secondary)",
  border: "var(--border)",
  primary: "var(--primary)",
  accent: "var(--primary)",
  text: "var(--foreground)",
  sub: "var(--muted-foreground)",
  muted: "var(--muted-foreground)",
  dim: "var(--muted-foreground)",
};

const years = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

// ========== اختبار الامتثال السريع ==========

function ComplianceTest() {
  const [step, setStep] = useState(0); // 0 = intro, 1..5 = questions, 6 = result
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const { data: siteConfig } = api.config.getAll.useQuery();
  const { data: resourcesData } = api.resources.getAll.useQuery();
  const complianceQuestions: Array<{ id: number; question: string; yes: string; no: string; risk: string }> = useMemo(() => (resourcesData?.complianceQuestions as any) ?? [], [resourcesData]);

  const q = complianceQuestions[step - 1];
  const totalYes = Object.values(answers).filter(Boolean).length;
  const riskLevel = totalYes === 0 ? "low" : totalYes <= 2 ? "medium" : "high";

  const handleAnswer = (yes: boolean) => {
    setAnswers(prev => ({ ...prev, [step]: yes }));
    if (step < complianceQuestions.length) setStep(s => s + 1);
    else setStep(complianceQuestions.length + 1);
  };

  const reset = () => { setStep(0); setAnswers({}); };

  return (
    <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "var(--card)", border: `1px solid var(--border)` }}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "color-mix(in oklch, var(--primary) 20%, transparent)" }}>
            <CheckCircle2 size={15} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>اختبار الامتثال السريع</p>
            <p className="text-[10px]" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>5 أسئلة تكشف مدى التزام منشأتك بقرارات التوطين 2026</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Intro */}
        {step === 0 && (
          <div className="text-center">
            <p className="text-xs leading-relaxed mb-4" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>
              أجب عن 5 أسئلة سريعة لتعرف هل منشأتك مشمولة بقرارات التوطين وما هي النسب المطلوبة منك.
            </p>
            <button onClick={() => setStep(1)}
              className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{ fontFamily: "'Cairo', sans-serif", background: "var(--primary)", color: "white" }}>
              ابدأ الاختبار
            </button>
          </div>
        )}

        {/* Questions */}
        {step >= 1 && step <= complianceQuestions.length && q && (
          <div>
            {/* Progress */}
            <div className="flex items-center gap-2 mb-4">
              {complianceQuestions.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full transition-all"
                  style={{ background: i < step ? "var(--primary)" : "var(--secondary)" }} />
              ))}
            </div>
            <p className="text-[10px] mb-3" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>سؤال {step} من {complianceQuestions.length}</p>
            <p className="font-bold text-sm leading-snug mb-5" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>{q.question}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleAnswer(true)}
                className="py-3 rounded-xl font-bold text-sm transition-all"
                style={{ fontFamily: "'Cairo', sans-serif", background: "var(--secondary)", border: "1px solid color-mix(in oklch, var(--primary) 40%, transparent)", color: "var(--primary)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in oklch, var(--primary) 20%, transparent)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--secondary)"; }}>
                نعم
              </button>
              <button onClick={() => handleAnswer(false)}
                className="py-3 rounded-xl font-bold text-sm transition-all"
                style={{ fontFamily: "'Cairo', sans-serif", background: LAV.inner, border: `1px solid ${LAV.border}`, color: "var(--muted-foreground)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in oklch, var(--primary) 20%, transparent)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = LAV.inner; }}>
                لا
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {step > complianceQuestions.length && (
          <div>
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: riskLevel === "low" ? "oklch(0.4ade80 / 0.15)" : riskLevel === "medium" ? "oklch(0.93 0.18 90 / 0.15)" : "color-mix(in oklch, var(--primary) 20%, transparent)" }}>
                {riskLevel === "low"
                  ? <CheckCircle2 size={24} style={{ color: "var(--success)" }} />
                  : riskLevel === "medium"
                  ? <AlertCircle size={24} style={{ color: "var(--warning)" }} />
                  : <XCircle size={24} style={{ color: "var(--primary)" }} />}
              </div>
              <p className="font-black text-base mb-1" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>
                {riskLevel === "low" ? "منشأتك بعيدة عن المخاطر" : riskLevel === "medium" ? "تحتاج إلى مراجعة" : "توجد مخاطر امتثال عالية"}
              </p>
              <p className="text-[11px]" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>
                {totalYes === 0 ? "لم تنطبق عليك أي من قرارات التوطين النوعية حالياً" : `ينطبق عليك ${totalYes} من قرارات التوطين النوعية`}
              </p>
            </div>

            {/* Applicable decisions */}
            {Object.entries(answers).filter(([, v]) => v).length > 0 && (
              <div className="space-y-2 mb-4">
                {Object.entries(answers).filter(([, v]) => v).map(([k]) => {
                  const qItem = complianceQuestions[parseInt(k) - 1];
                  return qItem ? (
                    <div key={k} className="p-3 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)" }}>
                      <p className="text-[10px] font-bold mb-0.5" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>{qItem.question}</p>
                      <p className="text-[10px] leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--muted-foreground)" }}>{qItem.yes}</p>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={reset}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all"
                style={{ fontFamily: "'Cairo', sans-serif", background: LAV.inner, border: `1px solid ${LAV.border}`, color: "var(--muted-foreground)" }}>
                <RotateCcw size={12} />إعادة الاختبار
              </button>
              <a href={`https://wa.me/${siteConfig?.whatsapp_number ?? "966558648275"}?text=%D8%A7لسلام عليكم، أحتاج مساعدة في مراجعة امتثال منشأتي`} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all"
                style={{ fontFamily: "'Cairo', sans-serif", background: "var(--primary)", color: "white", textDecoration: "none" }}>
                استشارة متخصص
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const [, navigate] = useLocation();
  const { t, lang, dir, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();

  const { data: siteConfig } = api.config.getAll.useQuery();
  const LOGO_URL = siteConfig?.logo_url ?? LOGO_URL_DEFAULT;
  const [activeYear, setActiveYear] = useState("2026");

  const { data: resourcesData } = api.resources.getAll.useQuery();
  const decisions: Record<string, Array<{ title: string; badge: string; desc: string; date: string; href: string }>> = useMemo(() => (resourcesData?.decisions as any) ?? [], [resourcesData]);

  const officialLinks: Array<{ label: string; desc: string; href: string; color: string }> = useMemo(() => (resourcesData?.officialLinks as any) ?? [], [resourcesData]);

  return (
    <div className="min-h-screen" dir={dir} style={{ background: LAV.bg }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ background: `${LAV.bg}f5`, borderColor: LAV.border }}>
        <div className="max-w-5xl mx-auto px-5 h-12 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = LAV.text)}
            onMouseLeave={e => (e.currentTarget.style.color = LAV.muted)}>
            <ArrowRight size={14} style={{ transform: dir === "ltr" ? "rotate(180deg)" : "none" }} />{t("رجوع", "Back")}
          </button>
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="مواكبة" className="w-6 h-6 object-contain" />
            <button onClick={toggleLang} className="px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all" style={{ fontFamily: "'Cairo', sans-serif", background: "transparent", borderColor: LAV.border, color: LAV.muted }} title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}>{lang === "ar" ? "EN" : "ع"}</button>
            <span className="font-black text-xs" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: LAV.text }}>{t("مواكبة", "Muwakaba")}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-5 pt-20 pb-16">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-widest uppercase mb-2" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}>{t("مواكبة للتوطين", "Muwakaba Saudization")}</p>
          <h1 className="text-2xl font-black mb-1" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: LAV.text }}>{t("الأدلة الإجرائية", "Procedural Guides")}</h1>
          <p className="text-xs" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>{t("الأدلة الإجرائية الرسمية من وزارة الموارد البشرية 2020 - 2026", "Official procedural guides from HRSD 2020 - 2026")}</p>
        </div>

        {/* Telegram Channel Card */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in oklch, var(--primary) 20%, transparent)" }}>
              <Send size={16} style={{ color: LAV.primary }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: LAV.text }}>{t("قناة جزاء البقمي على تلقرام", "Jaza Al-Baqami Telegram Channel")}</p>
              <p className="text-[10px]" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>{t("ملفات وإرشادات متجددة في الموارد البشرية والتوطين", "Updated HR and Saudization files and guidelines")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { title: "ملفات التوطين", desc: "قرارات ودلائل إجرائية" },
              { title: "تحديثات فورية", desc: "أحدث قرارات الوزارة" },
            ].map((item, i) => (
              <div key={i} className="rounded-lg p-2.5 text-center" style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}>
                <p className="text-[10px] font-bold mb-0.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.accent }}>{item.title}</p>
                <p className="text-[9px]" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <a href="https://t.me/jzaaalbqamy" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-xs transition-all"
            style={{ fontFamily: "'Cairo', sans-serif", background: LAV.primary, color: "white" }}>
            <Send size={13} />{t("انضم للقناة على تلقرام", "Join Telegram Channel")}
          </a>
        </div>

        {/* Year Tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {years.map(year => (
            <button key={year} onClick={() => setActiveYear(year)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                fontFamily: "'Cairo', sans-serif",
                background: activeYear === year ? LAV.primary : LAV.card,
                color: activeYear === year ? "white" : LAV.muted,
                border: `1px solid ${activeYear === year ? LAV.primary : LAV.border}`,
              }}>
              {year}
            </button>
          ))}
        </div>

        {/* Decisions List */}
        <div className="space-y-2.5 mb-6">
          {(decisions[activeYear] || []).map((d, i) => (
            <a key={i} href={d.href} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-3.5 rounded-xl transition-all group block"
              style={{ background: LAV.card, border: `1px solid ${LAV.border}`, textDecoration: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${LAV.primary}50`; (e.currentTarget as HTMLElement).style.background = "var(--secondary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = LAV.border; (e.currentTarget as HTMLElement).style.background = LAV.card; }}>
              <div className="flex-shrink-0 mt-0.5">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-md"
                  style={{ background: `${LAV.primary}20`, color: LAV.accent, border: `1px solid ${LAV.primary}30`, fontFamily: "'Cairo', sans-serif" }}>
                  {d.badge}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs mb-0.5 leading-snug" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: LAV.text }}>{d.title}</p>
                <p className="text-[10px] leading-relaxed mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>{d.desc}</p>
                <p className="text-[9px]" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}>{d.date}</p>
              </div>
              <ExternalLink size={12} style={{ color: LAV.dim, flexShrink: 0, marginTop: "2px" }} />
            </a>
          ))}
        </div>

        {/* Official Platforms */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}>
          <p className="text-[10px] font-bold mb-3" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>{t("المنصات والمراجع الرسمية", "Official Platforms & References")}</p>
          <div className="grid grid-cols-1 gap-2">
            {officialLinks.map((link, i) => (
              <a key={i} href={link.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl transition-all"
                style={{ background: LAV.inner, border: `1px solid ${LAV.border}`, textDecoration: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${link.color}40`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = LAV.border; }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: link.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold truncate" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.text }}>{link.label}</p>
                  <p className="text-[9px]" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}>{link.desc}</p>
                </div>
                <ExternalLink size={10} style={{ color: LAV.dim, flexShrink: 0 }} />
              </a>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-2 p-3.5 rounded-xl" style={{ background: "var(--secondary)", border: `1px solid color-mix(in oklch, var(--primary) 35%, transparent)` }}>
            <AlertCircle size={14} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "1px" }} />
            <div>
              <p className="text-[11px] font-bold mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>{t("تنبيه هام", "Important Notice")}</p>
              <p className="text-[10px] leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.sub }}>
                {t("جميع الحسابات والنتائج الظاهرة في هذا الموقع هي تقديرية فقط ولا تعد مرجعاً قانونياً. يجب العودة إلى الموقع الرسمي لوزارة الموارد البشرية للتحقق من النسب والقرارات السارية قبل اتخاذ أي قرار.", "All calculations and results on this site are estimates only and do not constitute legal references. Please verify with the official HRSD website before making any decisions.")}
              </p>
              <a href="https://www.hrsd.gov.sa" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold"
                style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>
                <ExternalLink size={10} />{t("زيارة موقع وزارة الموارد البشرية", "Visit HRSD Official Website")}
              </a>
            </div>
          </div>
        </div>

        {/* Quick Compliance Test */}
        <ComplianceTest />
      </main>
    </div>
  );
}
