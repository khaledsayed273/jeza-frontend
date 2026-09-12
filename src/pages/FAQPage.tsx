import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ChevronDown, HelpCircle, ExternalLink } from "lucide-react";
import { api } from "../lib/api";

/**
 * MUWAKABA — FAQ Page
 * Design: Dark background + Lavender/Khuzami accent
 * Font: Noto Naskh Arabic (headings) + Cairo (body)
 */

const LOGO_URL_DEFAULT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663364198732/2vuJLs9j7vTiL4E4emfRJ8/muwakaba_logo_v2-SCNMsUQ2s4hs6UtaXq88Y7.webp";

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

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ background: LAV.card, border: `1px solid ${open ? "color-mix(in oklch, var(--primary) 40%, transparent)" : LAV.border}` }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-right"
        style={{ background: "transparent" }}>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-snug text-right" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: LAV.text }}>{q}</p>
        </div>
        <ChevronDown size={15} style={{
          color: LAV.muted, flexShrink: 0, marginTop: "2px",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.25s ease"
        }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <div className="h-px mb-3" style={{ background: LAV.border }} />
          <p className="text-xs leading-relaxed text-right" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.sub }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState(0);
  const { data: siteConfig } = api.config.getAll.useQuery();
  const LOGO_URL = siteConfig?.logo_url ?? LOGO_URL_DEFAULT;

  const { data: faqData } = api.faq.getAll.useQuery();
  const faqCategories: Array<{ category: string; icon: string; questions: Array<{ q: string; a: string }> }> = useMemo(() => (faqData as any) ?? [], [faqData]);

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: LAV.bg }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ background: `${LAV.bg}f5`, borderColor: LAV.border }}>
        <div className="max-w-5xl mx-auto px-5 h-12 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = LAV.text)}
            onMouseLeave={e => (e.currentTarget.style.color = LAV.muted)}>
            <ArrowRight size={14} />رجوع
          </button>
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="مواكبة" className="w-6 h-6 object-contain" />
            <span className="font-black text-xs" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: LAV.text }}>مواكبة</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-5 pt-20 pb-16">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "color-mix(in oklch, var(--primary) 15%, transparent)", border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)" }}>
            <HelpCircle size={22} style={{ color: "var(--primary)" }} />
          </div>
          <p className="text-[10px] tracking-widest uppercase mb-1" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}>مواكبة للتوطين</p>
          <h1 className="text-2xl font-black mb-1" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: LAV.text }}>الأسئلة الشائعة</h1>
          <p className="text-xs" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>إجابات لأكثر الأسئلة شيوعاً حول التوطين وقرارات الموارد البشرية</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {faqCategories.map((cat, i) => (
            <button key={i} onClick={() => setActiveCategory(i)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
              style={{
                fontFamily: "'Cairo', sans-serif",
                background: activeCategory === i ? "var(--primary)" : LAV.card,
                color: activeCategory === i ? "white" : LAV.muted,
                border: `1px solid ${activeCategory === i ? "var(--primary)" : LAV.border}`,
              }}>
              <span>{cat.icon}</span>
              <span>{cat.category}</span>
            </button>
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-2.5 mb-6">
          {faqCategories[activeCategory].questions.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-2xl p-5 text-center" style={{ background: LAV.card, border: `1px solid color-mix(in oklch, var(--primary) 30%, transparent)` }}>
          <p className="font-bold text-sm mb-1" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: LAV.text }}>لم تجد إجابة لسؤالك؟</p>
          <p className="text-xs mb-4" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>تواصل مع أ. جزاء البقمي مباشرةً للحصول على استشارة متخصصة</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <a href={`https://wa.me/${siteConfig?.whatsapp_number ?? "966558648275"}?text=السلام عليكم، لدي سؤال حول التوطين`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all"
              style={{ fontFamily: "'Cairo', sans-serif", background: "var(--success-strong)", color: "white", textDecoration: "none" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              تواصل عبر واتساب
            </a>
            <a href="https://www.hrsd.gov.sa" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs transition-all"
              style={{ fontFamily: "'Cairo', sans-serif", background: LAV.inner, border: `1px solid ${LAV.border}`, color: LAV.sub, textDecoration: "none" }}>
              <ExternalLink size={13} />موقع الوزارة الرسمي
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl" style={{ background: LAV.inner, border: `1px solid ${LAV.border}` }}>
          <p className="text-[10px] leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>
            ⚠️ المعلومات الواردة في هذه الصفحة تقديرية وإرشادية فقط. يُرجى دائماً الرجوع إلى الموقع الرسمي لوزارة الموارد البشرية والتنمية الاجتماعية للاطلاع على القرارات والأنظمة الرسمية السارية.
          </p>
        </div>
      </main>
    </div>
  );
}
