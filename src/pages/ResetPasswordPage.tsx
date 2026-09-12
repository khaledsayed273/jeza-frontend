import { useLocation } from "wouter";
import { useLang } from "../contexts/LanguageContext";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { t, dir } = useLang();

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("كلمة المرور غير متطابقة", "Passwords do not match"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("كلمة المرور قصيرة جداً", "Password too short"));
      return;
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        toast.success(t("تم إعادة تعيين كلمة المرور", "Password reset successfully"));
      } else {
        toast.error(data.error || t("فشل", "Failed"));
      }
    } catch {
      toast.error(t("حدث خطأ", "An error occurred"));
    }
  };

  if (!token) {
    return (
      <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }} className="flex items-center justify-center px-4">
        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "2rem", maxWidth: "24rem", textAlign: "center" }}>
          <h1 className="text-xl font-black mb-4">{t("رابط غير صالح", "Invalid Link")}</h1>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>{t("رابط إعادة تعيين كلمة المرور غير صالح أو منتهي.", "The reset link is invalid or expired.")}</p>
          <button onClick={() => navigate("/forgot-password")} style={{ background: "var(--primary)", color: "var(--primary-foreground)", padding: "0.7rem 0", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.9rem", border: "none", fontFamily: "'Cairo', sans-serif", width: "100%" }}>
            {t("طلب رابط جديد", "Request New Link")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }} className="flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "2rem" }}>
          {done ? (
            <>
              <h1 className="text-xl font-black text-center mb-4">{t("تم بنجاح", "Success")}</h1>
              <p className="text-sm text-center mb-6" style={{ color: "var(--muted-foreground)" }}>
                {t("تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.", "Password has been reset. You can now login.")}
              </p>
              <button onClick={() => navigate("/login")} style={{ background: "var(--primary)", color: "var(--primary-foreground)", padding: "0.7rem 0", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.9rem", border: "none", fontFamily: "'Cairo', sans-serif", width: "100%" }}>
                {t("تسجيل الدخول", "Login")}
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-black text-center mb-6">{t("إعادة تعيين كلمة المرور", "Reset Password")}</h1>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  placeholder={t("كلمة المرور الجديدة", "New password")}
                  style={{ background: "var(--input)", border: `1.5px solid ${"var(--border)"}`, color: "var(--foreground)", borderRadius: "0.75rem", padding: "0.65rem 1rem", fontSize: "0.95rem", fontFamily: "'Cairo', sans-serif", width: "100%", outline: "none" }}
                />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6}
                  placeholder={t("تأكيد كلمة المرور", "Confirm password")}
                  style={{ background: "var(--input)", border: `1.5px solid ${"var(--border)"}`, color: "var(--foreground)", borderRadius: "0.75rem", padding: "0.65rem 1rem", fontSize: "0.95rem", fontFamily: "'Cairo', sans-serif", width: "100%", outline: "none" }}
                />
                <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)", padding: "0.7rem 0", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.95rem", border: "none", fontFamily: "'Cairo', sans-serif" }}
                >
                  {t("إعادة التعيين", "Reset")}
                </motion.button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
