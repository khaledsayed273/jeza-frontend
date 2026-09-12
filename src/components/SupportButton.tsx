import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { api } from "../lib/api";

export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const { t, dir } = useLang();
  const { data: siteConfig } = api.config.getAll.useQuery();
  const WHATSAPP_NUMBER = siteConfig?.whatsapp_number ?? "";
  const SUPPORT_EMAIL = siteConfig?.support_email ?? "";

  const isRTL = dir === "rtl";

  const actions = [
    {
      id: "whatsapp",
      label: t("واتساب", "WhatsApp"),
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: "var(--success)",
      colorBg: "oklch(0.60 0.18 145 / 0.12)",
      onClick: () => {
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t("مرحباً، أحتاج مساعدة في منصة مواكبة", "Hello, I need help with Muwakaba platform"))}`, "_blank");
      },
    },
    {
      id: "email",
      label: t("البريد الإلكتروني", "Email"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
      ),
      color: "oklch(0.45 0.14 250)",
      colorBg: "oklch(0.45 0.14 250 / 0.12)",
      onClick: () => {
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t("طلب دعم — مواكبة", "Support Request — Muwakaba"))}`;
      },
    },
    {
      id: "complaint",
      label: t("تقديم شكوى", "File Complaint"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      color: "oklch(0.72 0.10 85)",
      colorBg: "oklch(0.72 0.10 85 / 0.12)",
      onClick: () => {
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t("شكوى — مواكبة", "Complaint — Muwakaba"))}&body=${encodeURIComponent(t("تفاصيل الشكوى:\n\n", "Complaint details:\n\n"))}`;
      },
    },
    {
      id: "support",
      label: t("الدعم الفني", "Technical Support"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      color: "oklch(0.78 0.14 85)",
      colorBg: "oklch(0.78 0.14 85 / 0.12)",
      onClick: () => {
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t("دعم فني — مواكبة", "Technical Support — Muwakaba"))}`;
      },
    },
  ];

  return (
    <div
      className="fixed z-50"
      style={{
        bottom: "1.5rem",
        [isRTL ? "right" : "left"]: "1.5rem",
      }}
    >
      {/* Action items */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="flex flex-col gap-2 mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {actions.map((action, i) => (
              <motion.div
                key={action.id}
                className="flex items-center gap-2"
                style={{ flexDirection: isRTL ? "row" : "row-reverse" }}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ delay: (actions.length - 1 - i) * 0.05 }}
              >
                {/* Label */}
                <motion.span
                  className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg"
                  style={{
                    background: "oklch(0.10 0.02 250)",
                    color: "oklch(0.94 0.005 250)",
                    border: "1px solid oklch(0.22 0.03 250)",
                  }}
                >
                  {action.label}
                </motion.span>

                {/* Icon button */}
                <motion.button
                  onClick={action.onClick}
                  className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all"
                  style={{
                    background: action.colorBg,
                    border: `1.5px solid ${action.color}50`,
                    color: action.color,
                    backdropFilter: "blur(8px)",
                  }}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {action.icon}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main toggle button */}
      <div className="flex flex-col items-center gap-1">
        <motion.button
          onClick={() => setOpen(!open)}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all"
          style={{
            background: open
              ? "oklch(0.22 0.03 250)"
              : "linear-gradient(135deg, oklch(0.45 0.14 250), oklch(0.35 0.12 250))",
            border: "2px solid oklch(0.78 0.14 85 / 0.5)",
            color: "oklch(0.78 0.14 85)",
            boxShadow: "0 4px 24px oklch(0.45 0.14 250 / 0.5)",
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-6 h-6">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z"/>
            </svg>
          )}
        </motion.button>
        <span
          className="text-[10px] font-bold"
          style={{ color: "oklch(0.78 0.14 85)", textShadow: "0 1px 4px oklch(0 0 0 / 0.5)" }}
        >
          {t("الدعم", "Support")}
        </span>
      </div>
    </div>
  );
}
