import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { useLang } from "../contexts/LanguageContext";
import { motion } from "framer-motion";
import { useState } from "react";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { t, dir } = useLang();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const register = api.auth.register.useMutation({
    onSuccess: () => {
      navigate("/");
    },
    onError: (err) => {
      if (err.message.includes("Email already registered")) {
        setError(t("البريد الإلكتروني مسجل مسبقاً", "Email already registered"));
      } else {
        setError(err.message || t("فشل التسجيل", "Registration failed"));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("كلمة المرور غير متطابقة", "Passwords do not match"));
      return;
    }

    register.mutate({ email, password, name });
  };

  return (
    <div
      dir={dir}
      style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }}
      className="flex items-center justify-center px-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div
          style={{
            background: "var(--card)",
            border: `1px solid ${"var(--border)"}`,
            borderRadius: "1rem",
            padding: "2rem",
          }}
        >
          <h1 className="text-2xl font-black text-center mb-6">
            {t("إنشاء حساب جديد", "Create Account")}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}
              >
                {t("الاسم", "Name")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder={t("اسم المستخدم", "Your name")}
                style={{
                  background: "var(--input)",
                  border: `1.5px solid ${"var(--border)"}`,
                  color: "var(--foreground)",
                  borderRadius: "0.75rem",
                  padding: "0.65rem 1rem",
                  fontSize: "0.95rem",
                  fontFamily: "'Cairo', sans-serif",
                  width: "100%",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}
              >
                {t("البريد الإلكتروني", "Email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                style={{
                  background: "var(--input)",
                  border: `1.5px solid ${"var(--border)"}`,
                  color: "var(--foreground)",
                  borderRadius: "0.75rem",
                  padding: "0.65rem 1rem",
                  fontSize: "0.95rem",
                  fontFamily: "'Cairo', sans-serif",
                  width: "100%",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}
              >
                {t("كلمة المرور", "Password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••"
                style={{
                  background: "var(--input)",
                  border: `1.5px solid ${"var(--border)"}`,
                  color: "var(--foreground)",
                  borderRadius: "0.75rem",
                  padding: "0.65rem 1rem",
                  fontSize: "0.95rem",
                  fontFamily: "'Cairo', sans-serif",
                  width: "100%",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}
              >
                {t("تأكيد كلمة المرور", "Confirm Password")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••"
                style={{
                  background: "var(--input)",
                  border: `1.5px solid ${"var(--border)"}`,
                  color: "var(--foreground)",
                  borderRadius: "0.75rem",
                  padding: "0.65rem 1rem",
                  fontSize: "0.95rem",
                  fontFamily: "'Cairo', sans-serif",
                  width: "100%",
                  outline: "none",
                }}
              />
            </div>

            {error && (
              <p style={{ color: "oklch(0.55 0.22 27)", fontSize: "0.85rem", textAlign: "center" }}>
                {error}
              </p>
            )}

            <motion.button
              type="submit"
              disabled={register.isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                padding: "0.7rem 0",
                borderRadius: "0.75rem",
                fontWeight: 800,
                fontSize: "0.95rem",
                border: "none",
                fontFamily: "'Cairo', sans-serif",
                opacity: register.isPending ? 0.6 : 1,
              }}
            >
              {register.isPending
                ? t("جاري التسجيل...", "Registering...")
                : t("إنشاء حساب", "Register")}
            </motion.button>
          </form>

          <p className="text-center mt-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {t("لديك حساب بالفعل؟", "Already have an account?")}{" "}
            <button
              onClick={() => navigate("/login")}
              style={{ color: "var(--primary)", fontWeight: 700, border: "none", background: "none", fontFamily: "'Cairo', sans-serif" }}
            >
              {t("تسجيل الدخول", "Login")}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
