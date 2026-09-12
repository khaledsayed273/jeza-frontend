import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/api";

/**
 * MUWAKABA — About Page
 * Design: Dark/Light adaptive + Lavender accent
 * Font: Noto Naskh Arabic (headings) + Cairo (body)
 */

const VISION_URL = "/assets/vision2030_transparent_777ae1b1.png";

type RequestType = "training" | "consulting";
interface FormState { name: string; phone: string; subject: string; }

export default function AboutPage() {
  const [, navigate] = useLocation();
  const { t, lang, dir, toggleLang } = useLang();
  const { toggleTheme } = useTheme();
  const { data: siteConfig } = api.config.getAll.useQuery();
  const LOGO_URL = siteConfig?.logo_url ?? "";
  const LAV = {
    bg: "var(--background)",
    card: "var(--card)",
    inner: "var(--secondary)",
    border: "var(--border)",
    primary: "var(--primary)",
    accent: "var(--primary)",
    text: "var(--foreground)",
    muted: "var(--muted-foreground)",
    dim: "var(--muted-foreground)",
    sub: "var(--muted-foreground)",
  };

  const { data: aboutData } = api.about.getAll.useQuery();

  const certs: string[] = useMemo(() => aboutData?.certifications ?? [], [aboutData]);
  const stats: { value: string; label: string }[] = useMemo(() => {
    const raw = aboutData?.stats ?? [];
    return raw.map((s: any) => ({ value: s.value, label: t(s.labelAr, s.labelEn) }));
  }, [aboutData, t]);
  const courses: string[] = useMemo(() => {
    const raw = aboutData?.courses ?? [];
    return raw.map((c: any) => t(c.labelAr, c.labelEn));
  }, [aboutData, t]);

  const waNumber = siteConfig?.whatsapp_number ?? "966558648275";
  const phone = siteConfig?.phone_number ?? "0558648275";
  const contacts: { label: string; value: string; href: string; color: string }[] = useMemo(() => {
    const raw = aboutData?.contacts ?? [];
    return raw.map((c: any) => ({
      label: t(c.labelAr, c.labelEn),
      value: c.hrefType === "whatsapp" || c.hrefType === "tel" ? phone : (lang === "ar" ? (c.valueAr ?? c.value) : (c.valueEn ?? c.value)),
      href: c.hrefType === "whatsapp" ? `https://wa.me/${waNumber}` : c.hrefType === "tel" ? `tel:+${waNumber}` : c.href,
      color: c.color,
    }));
  }, [aboutData, t, lang, phone, waNumber]);

  const [activeRequest, setActiveRequest] = useState<RequestType | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", phone: "", subject: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.subject) return;
    setSending(true);
    const requestLabel = activeRequest === "training"
      ? t("طلب تدريب", "Training Request")
      : t("طلب استشارة", "Consulting Request");
    const mailtoBody = encodeURIComponent(
      `${requestLabel}\n\n${t("الاسم", "Name")}: ${form.name}\n${t("رقم الجوال", "Phone")}: ${form.phone}\n${t("عنوان الطلب", "Subject")}: ${form.subject}`
    );
    const mailtoSubject = encodeURIComponent(`${requestLabel} - ${form.subject}`);
    window.open(`mailto:${siteConfig?.contact_email ?? "jzaalbqmy183@gmail.com"}?subject=${mailtoSubject}&body=${mailtoBody}`, "_blank");
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setForm({ name: "", phone: "", subject: "" });
      setTimeout(() => { setSent(false); setActiveRequest(null); }, 3000);
    }, 800);
  };

  const inputStyle = {
    background: LAV.inner,
    border: `1px solid ${LAV.border}`,
    color: LAV.text,
    fontFamily: "'Cairo', sans-serif",
    fontSize: "12px",
    borderRadius: "10px",
    padding: "8px 12px",
    width: "100%",
    outline: "none",
  };

  return (
    <div className="min-h-screen" dir={dir} style={{ background: LAV.bg }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
        style={{ background: `${LAV.bg}f5`, borderColor: LAV.border }}>
        <div className="max-w-5xl mx-auto px-5 h-12 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.color = LAV.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = LAV.muted)}>
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" style={{ transform: dir === "ltr" ? "rotate(180deg)" : "none" }}>
              <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("رجوع", "Back")}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all" style={{ fontFamily: "'Cairo', sans-serif", background: "transparent", borderColor: LAV.border, color: LAV.muted }} title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}>{lang === "ar" ? "EN" : "ع"}</button>
            <div className="w-px h-5" style={{ background: LAV.border }} />
            <img src={LOGO_URL} alt="مواكبة" className="w-6 h-6 object-contain" />
            <span className="font-black text-xs" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: LAV.text }}>
              {t("مواكبة", "Muwakaba")}
            </span>
            <div className="w-px h-5" style={{ background: LAV.border }} />
            <img src={VISION_URL} alt="رؤية 2030" className="h-7 w-auto" style={{ opacity: 0.9 }} />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-5 pt-20 pb-16">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-8">
          <p className="text-[10px] tracking-widest uppercase mb-2" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}>
            {t("من نحن؟", "About Us")}
          </p>
          <h1 className="text-2xl font-black mb-1" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: LAV.text }}>
            {t("جزاء البقمي", "Jaza Al-Baqami")}
          </h1>
          <p className="text-xs font-semibold" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.accent }}>
            {t("مدرب موارد بشرية معتمد", "Certified HR Trainer & Consultant")}
          </p>
        </motion.div>

        {/* Bio Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl p-5 mb-4" style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0"
              style={{ background: `linear-gradient(135deg, var(--primary), var(--primary))`, color: "white", fontFamily: "'Noto Naskh Arabic', serif" }}>ج</div>
            <div>
              <p className="font-black text-sm mb-0.5" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: LAV.text }}>
                {t("جزاء البقمي", "Jaza Al-Baqami")}
              </p>
              <p className="text-[11px] mb-2 font-semibold" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.accent }}>
                {t("مدرب موارد بشرية معتمد", "Certified HR Trainer & Consultant")}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.sub, lineHeight: "1.7" }}>
                {t(
                  "متخصص في مجال الموارد البشرية وتطوير الكفاءات، يمتلك خبرة واسعة في تدريب وتأهيل الكوادر البشرية في القطاع الخاص، ويقدم خدمات الاستشارات والتدريب في مجالات نظام العمل السعودي والتوطين.",
                  "Specialist in human resources and competency development with extensive experience in training and qualifying private sector professionals. Provides consulting and training services in Saudi labor law and Saudization."
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="text-center p-2.5 rounded-xl" style={{ background: LAV.inner }}>
                <p className="font-black text-sm" style={{ fontFamily: "'Cairo', sans-serif", color: "var(--primary)" }}>{s.value}</p>
                <p className="text-[9px] mt-0.5" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Request Buttons */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => { setActiveRequest(activeRequest === "training" ? null : "training"); setSent(false); setForm({ name: "", phone: "", subject: "" }); }}
            className="py-3 rounded-xl font-bold text-xs transition-all"
            style={{
              fontFamily: "'Cairo', sans-serif",
              background: activeRequest === "training" ? LAV.primary : LAV.card,
              color: activeRequest === "training" ? "white" : LAV.text,
              border: `1px solid ${activeRequest === "training" ? LAV.primary : LAV.border}`,
            }}>
            <div className="flex items-center justify-center gap-1.5">
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>{t("طلب تدريب", "Training")}</span>
            </div>
          </button>
          <button
            onClick={() => { setActiveRequest(activeRequest === "consulting" ? null : "consulting"); setSent(false); setForm({ name: "", phone: "", subject: "" }); }}
            className="py-3 rounded-xl font-bold text-xs transition-all"
            style={{
              fontFamily: "'Cairo', sans-serif",
              background: activeRequest === "consulting" ? LAV.primary : LAV.card,
              color: activeRequest === "consulting" ? "white" : LAV.text,
              border: `1px solid ${activeRequest === "consulting" ? LAV.primary : LAV.border}`,
            }}>
            <div className="flex items-center justify-center gap-1.5">
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                <path d="M8 2a5 5 0 100 10H14l-2-2a5 5 0 00-4-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <span>{t("طلب استشارة", "Consulting")}</span>
            </div>
          </button>
          {/* زر الاستشارات العمالية عبر واتساب */}
          <a
            href={`https://wa.me/${siteConfig?.whatsapp_number ?? "966558648275"}?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D8%A7%D8%B3%D8%AA%D8%B4%D8%A7%D8%B1%D8%A9%20%D8%B9%D9%85%D8%A7%D9%84%D9%8A%D8%A9`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            style={{
              fontFamily: "'Cairo', sans-serif",
              background: "var(--success-strong)",
              color: "white",
              border: "1px solid oklch(0.55 0.20 145)",
              boxShadow: "0 0 12px oklch(0.45 0.18 145 / 0.3)",
              textDecoration: "none",
            }}>
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white" />
              <path d="M10 1.5C5.3 1.5 1.5 5.3 1.5 10c0 1.5.4 2.9 1.1 4.1L1.5 18.5l4.5-1.1A8.4 8.4 0 0010 18.5c4.7 0 8.5-3.8 8.5-8.5S14.7 1.5 10 1.5z" stroke="white" strokeWidth="1.2" fill="none" />
            </svg>
            <span>{t("استشارة عمالية", "Labor Consult")}</span>
          </a>
        </motion.div>

        {/* Request Form */}
        {activeRequest && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl p-4 mb-4"
            style={{ background: LAV.card, border: `1px solid ${LAV.primary}40` }}>
            <p className="text-xs font-bold mb-3" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.accent }}>
              {activeRequest === "training" ? t("طلب تدريب", "Training Request") : t("طلب استشارة", "Consulting Request")} — {t("سيُرسل إلى البريد الإلكتروني", "Will be sent via email")}
            </p>
            {sent ? (
              <div className="text-center py-4">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-xs font-bold" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.accent }}>
                  {t("تم الإرسال بنجاح!", "Sent successfully!")}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <input type="text" placeholder={t("الاسم الكامل", "Full Name")} value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} required />
                <input type="tel" placeholder={t("رقم الجوال", "Phone Number")} value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} required />
                <input type="text"
                  placeholder={activeRequest === "training"
                    ? t("مثال: دورة نظام العمل السعودي", "e.g., Saudi Labor Law Course")
                    : t("مثال: استشارة في التوطين", "e.g., Saudization Consultation")}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })} style={inputStyle} required />
                <button type="submit" disabled={sending}
                  className="w-full py-2.5 rounded-xl font-bold text-xs transition-all"
                  style={{
                    fontFamily: "'Cairo', sans-serif",
                    background: sending ? LAV.dim : LAV.primary,
                    color: "white",
                    border: "none",
                    cursor: sending ? "not-allowed" : "pointer",
                  }}>
                  {sending
                    ? t("جاري الإرسال...", "Sending...")
                    : `${t("إرسال", "Send")} ${activeRequest === "training" ? t("طلب التدريب", "Training Request") : t("طلب الاستشارة", "Consulting Request")}`}
                </button>
              </form>
            )}
          </motion.div>
        )}

        {/* Courses */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl p-5 mb-4" style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}>
            {t("مجالات التدريب", "Training Areas")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {courses.map((c) => (
              <div key={c} className="rounded-xl p-2.5 text-center" style={{ background: LAV.inner }}>
                <p className="text-[10px] font-bold" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.sub }}>{c}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Certifications */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}
          className="rounded-2xl p-5 mb-4" style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}>
            {t("الشهادات والاعتمادات", "Certifications & Accreditations")}
          </p>
          <div className="space-y-2">
            {certs.map((cert, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: LAV.inner }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: LAV.primary }} />
                <p className="text-[10px] leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.sub }}>{cert}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Contacts */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl p-5" style={{ background: LAV.card, border: `1px solid ${LAV.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.dim }}>
            {t("وسائل التواصل", "Contact")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {contacts.map((c) => (
              <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-xl transition-all"
                style={{ background: LAV.inner, border: `1px solid ${LAV.border}`, textDecoration: "none" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${c.color}20`, color: c.color }}>
                  <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-[9px] font-semibold" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.muted }}>{c.label}</p>
                  <p className="text-[10px] font-bold" style={{ fontFamily: "'Cairo', sans-serif", color: LAV.text }}>{c.value}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>
        </div>{/* نهاية lg:grid */}
      </main>
    </div>
  );
}
