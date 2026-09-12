import { useLocation } from "wouter";
import { useLang } from "../contexts/LanguageContext";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { t, dir } = useLang();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        toast.error(data.error || t("فشل الإرسال", "Request failed"));
      }
    } catch {
      toast.error(t("حدث خطأ", "An error occurred"));
    }
  };

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }} className="flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "2rem" }}>
          {submitted ? (
            <>
              <h1 className="text-xl font-black text-center mb-4">{t("تم الإرسال", "Sent")}</h1>
              <p className="text-sm text-center mb-6" style={{ color: "var(--muted-foreground)" }}>
                {t("إذا كان البريد الإلكتروني مسجلاً، ستصل رسالة إعادة تعيين كلمة المرور.", "If the email is registered, a reset link will be sent.")}
              </p>
              <button onClick={() => navigate("/login")} style={{ background: "var(--primary)", color: "var(--primary-foreground)", padding: "0.7rem 0", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.9rem", border: "none", fontFamily: "'Cairo', sans-serif", width: "100%" }}>
                {t("العودة لتسجيل الدخول", "Back to Login")}
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-black text-center mb-2">{t("استعادة كلمة المرور", "Forgot Password")}</h1>
              <p className="text-sm text-center mb-6" style={{ color: "var(--muted-foreground)" }}>
                {t("أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين", "Enter your email and we'll send a reset link")}
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder={t("example@email.com", "example@email.com")}
                  style={{ background: "var(--input)", border: `1.5px solid ${"var(--border)"}`, color: "var(--foreground)", borderRadius: "0.75rem", padding: "0.65rem 1rem", fontSize: "0.95rem", fontFamily: "'Cairo', sans-serif", width: "100%", outline: "none" }}
                />
                <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)", padding: "0.7rem 0", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.95rem", border: "none", fontFamily: "'Cairo', sans-serif" }}
                >
                  {t("إرسال", "Send")}
                </motion.button>
              </form>
              <p className="text-center mt-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
                {t("تذكرت كلمة المرور؟", "Remember your password?")}{" "}
                <button onClick={() => navigate("/login")} style={{ color: "var(--primary)", fontWeight: 700, border: "none", background: "none", fontFamily: "'Cairo', sans-serif" }}>
                  {t("تسجيل الدخول", "Login")}
                </button>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
