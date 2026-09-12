import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../_core/hooks/useAuth";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AccountPage() {
  const [, navigate] = useLocation();
  const { t, dir } = useLang();

  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const updateProfile = api.auth.updateProfile.useMutation({
    onSuccess: () => toast.success(t("تم الحفظ", "Saved")),
    onError: (err) => toast.error(err.message),
  });

  const changePassword = api.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success(t("تم تغيير كلمة المرور", "Password changed"));
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  const logoutMutation = api.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const { data: sessionsList, refetch: refetchSessions } = api.auth.sessions.useQuery();
  const revokeOther = api.auth.revokeOtherSessions.useMutation({
    onSuccess: () => { refetchSessions(); toast.success(t("تم إلغاء الجلسات الأخرى", "Other sessions revoked")); },
  });

  if (loading || !user) return null;

  const inputStyle = {
    background: "var(--input)",
    border: `1.5px solid ${"var(--border)"}`,
    color: "var(--foreground)",
    borderRadius: "0.75rem",
    padding: "0.65rem 1rem",
    fontSize: "0.95rem",
    fontFamily: "'Cairo', sans-serif",
    width: "100%",
    outline: "none",
  };

  const labelStyle = {
    color: "var(--muted-foreground)",
    fontSize: "0.8rem",
    fontWeight: 700,
    display: "block",
    marginBottom: "0.3rem",
  };

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif", padding: "2rem 1rem" }}>
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate("/")} style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginBottom: "1rem", background: "none", border: "none", fontFamily: "'Cairo', sans-serif" }}>
          ← {t("العودة للرئيسية", "Back to Home")}
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "2rem", marginBottom: "1rem" }}
        >
          <h1 className="text-xl font-black mb-6">{t("الملف الشخصي", "Account Settings")}</h1>

          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label style={labelStyle}>{t("الاسم", "Name")}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t("البريد الإلكتروني", "Email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <motion.button
              onClick={() => updateProfile.mutate({ name, email })}
              disabled={updateProfile.isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: "var(--primary)", color: "white", padding: "0.7rem 0", borderRadius: "0.75rem",
                fontWeight: 800, fontSize: "0.9rem", border: "none", fontFamily: "'Cairo', sans-serif",
                opacity: updateProfile.isPending ? 0.6 : 1,
              }}
            >
              {t("حفظ التغييرات", "Save Changes")}
            </motion.button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "2rem", marginBottom: "1rem" }}
        >
          <h2 className="text-lg font-black mb-6">{t("تغيير كلمة المرور", "Change Password")}</h2>

          <div className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>{t("كلمة المرور الحالية", "Current Password")}</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t("كلمة المرور الجديدة", "New Password")}</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} minLength={6} />
            </div>
            <motion.button
              onClick={() => changePassword.mutate({ currentPassword, newPassword })}
              disabled={changePassword.isPending || !currentPassword || !newPassword}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: "var(--primary)", color: "white", padding: "0.7rem 0", borderRadius: "0.75rem",
                fontWeight: 800, fontSize: "0.9rem", border: "none", fontFamily: "'Cairo', sans-serif",
                opacity: changePassword.isPending ? 0.6 : 1,
              }}
            >
              {t("تغيير كلمة المرور", "Change Password")}
            </motion.button>
          </div>
        </motion.div>

        {sessionsList && sessionsList.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "2rem", marginBottom: "1rem" }}
          >
            <h2 className="text-lg font-black mb-4">{t("الجلسات النشطة", "Active Sessions")}</h2>
            <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
              {t("هناك {n} جلسة نشطة لحسابك.", `There are ${sessionsList.length} active sessions on your account.`).replace("{n}", String(sessionsList.length))}
            </p>
            <motion.button
              onClick={() => revokeOther.mutate(undefined)}
              disabled={revokeOther.isPending}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{ background: "oklch(0.55 0.22 27 / 0.15)", color: "oklch(0.65 0.22 27)", border: "1px solid oklch(0.55 0.22 27 / 0.3)", padding: "0.6rem 1.2rem", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.85rem", fontFamily: "'Cairo', sans-serif" }}
            >
              {t("إنهاء جميع الجلسات الأخرى", "End all other sessions")}
            </motion.button>
          </motion.div>
        )}

        <motion.button
          onClick={() => logoutMutation.mutate(undefined)}
          disabled={logoutMutation.isPending}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: "100%", background: "oklch(0.55 0.22 27 / 0.15)", color: "oklch(0.65 0.22 27)",
            border: "1px solid oklch(0.55 0.22 27 / 0.3)", padding: "0.7rem 0", borderRadius: "0.75rem",
            fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Cairo', sans-serif",
            opacity: logoutMutation.isPending ? 0.6 : 1,
          }}
        >
          {t("تسجيل الخروج", "Logout")}
        </motion.button>
      </div>
    </div>
  );
}
