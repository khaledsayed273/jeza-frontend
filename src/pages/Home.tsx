import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useAuth } from "../_core/hooks/useAuth";
import { api } from "../lib/api";
import { NAV_GROUPS } from "../lib/navigation";

/**
 * MUWAKABA — Home Page
 * Design: KAFD Night Hero + Dark overlay + Service cards
 * Font: Noto Naskh Arabic (headings) + Cairo (body)
 */

const LOGO_URL_DEFAULT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663364198732/2vuJLs9j7vTiL4E4emfRJ8/muwakaba_logo_v2-SCNMsUQ2s4hs6UtaXq88Y7.webp";
const KAFD_URL = "/assets/kafd_night_6f66018b.jpg";
const VISION_URL = "/assets/vision2030_transparent_777ae1b1.png";
const EMBLEM_URL = "/assets/vision2030_emblem_a5da2341.png";

// Icons and accent colors — always served from frontend (JSX cannot be serialized)
import { type ReactNode } from "react";
const SERVICE_ACCENTS: Record<string, string> = {
  training: "var(--accent)",
  platform: "var(--primary)",
  calculator: "var(--success-strong)",
  "end-of-service": "oklch(0.72 0.10 85)",
  updates: "oklch(0.52 0.20 180)",
  "hr-explainers": "oklch(0.55 0.20 260)",
  podcast: "oklch(0.48 0.22 15)",
  "nationality-ratio": "oklch(0.55 0.18 200)",
  "employee-cost": "oklch(0.55 0.20 170)",
  "hr-cost": "var(--accent)",
  "turnover-rate": "oklch(0.58 0.20 340)",
  "payroll-sheet": "var(--success)",
  "payroll-calc": "oklch(0.62 0.16 185)",
  "documents-hub": "oklch(0.72 0.10 85)",
  "contract-conversion": "var(--info)",
  "hc-kpi": "var(--info)",
  "leave-calculator": "oklch(0.55 0.22 240)",
  probation: "oklch(0.52 0.18 195)",
  "job-descriptions": "oklch(0.55 0.20 320)",
  "org-chart": "var(--primary)",
  "workforce-planning": "var(--primary)",
};

const SERVICE_ICONS: Record<string, ReactNode> = {
  training: <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="6" y="4" width="24" height="30" rx="4" fill="oklch(0.62 0.20 55 / 0.12)" stroke="var(--accent)" strokeWidth="1.8"/><rect x="14" y="4" width="8" height="4" rx="2" fill="oklch(0.62 0.20 55 / 0.30)" stroke="var(--accent)" strokeWidth="1.4"/><path d="M11 14h14M11 19h14M11 24h9" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"/><circle cx="32" cy="32" r="10" fill="oklch(0.62 0.20 55 / 0.15)" stroke="var(--accent)" strokeWidth="1.8"/><path d="M28 32l2.5 2.5 5-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  platform: <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="4" y="4" width="16" height="16" rx="4" fill="color-mix(in oklch, var(--primary) 15%, transparent)" stroke="var(--primary)" strokeWidth="1.8"/><rect x="24" y="4" width="16" height="16" rx="4" fill="color-mix(in oklch, var(--primary) 10%, transparent)" stroke="var(--primary)" strokeWidth="1.8"/><rect x="4" y="24" width="16" height="16" rx="4" fill="color-mix(in oklch, var(--primary) 10%, transparent)" stroke="var(--primary)" strokeWidth="1.8"/><rect x="24" y="24" width="16" height="16" rx="4" fill="color-mix(in oklch, var(--primary) 20%, transparent)" stroke="var(--primary)" strokeWidth="1.8"/><circle cx="22" cy="22" r="4" fill="color-mix(in oklch, var(--primary) 25%, transparent)" stroke="var(--primary)" strokeWidth="1.5"/><path d="M22 19v6M19 22h6" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  calculator: <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="5" y="28" width="7" height="10" rx="2" fill="oklch(0.55 0.18 145 / 0.20)" stroke="var(--success-strong)" strokeWidth="1.6"/><rect x="15" y="20" width="7" height="18" rx="2" fill="oklch(0.55 0.18 145 / 0.30)" stroke="var(--success-strong)" strokeWidth="1.6"/><rect x="25" y="12" width="7" height="26" rx="2" fill="oklch(0.55 0.18 145 / 0.45)" stroke="var(--success-strong)" strokeWidth="1.6"/><path d="M34 8l4 4-4 4" stroke="var(--success-strong)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 38h34" stroke="var(--success-strong)" strokeWidth="1.6" strokeLinecap="round"/><path d="M35 16c0-2.2 1.8-4 4-4" stroke="var(--success-strong)" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/></svg>,
  "end-of-service": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><ellipse cx="22" cy="14" rx="13" ry="5" fill="oklch(0.72 0.10 85 / 0.20)" stroke="oklch(0.72 0.10 85)" strokeWidth="1.8"/><path d="M9 14v6c0 2.8 5.8 5 13 5s13-2.2 13-5v-6" stroke="oklch(0.72 0.10 85)" strokeWidth="1.8"/><path d="M9 20v6c0 2.8 5.8 5 13 5s13-2.2 13-5v-6" stroke="oklch(0.72 0.10 85)" strokeWidth="1.8"/><path d="M19 14h6M19 12.5h6" stroke="oklch(0.72 0.10 85)" strokeWidth="1.4" strokeLinecap="round"/><path d="M22 11v4" stroke="oklch(0.72 0.10 85)" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  updates: <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><path d="M22 6c-6 0-10 4.5-10 10v6l-3 4h26l-3-4v-6c0-5.5-4-10-10-10z" fill="oklch(0.52 0.20 180 / 0.15)" stroke="oklch(0.52 0.20 180)" strokeWidth="1.8" strokeLinejoin="round"/><path d="M19 36c0 1.7 1.3 3 3 3s3-1.3 3-3" stroke="oklch(0.52 0.20 180)" strokeWidth="1.8" strokeLinecap="round"/><circle cx="32" cy="10" r="5" fill="oklch(0.52 0.20 180 / 0.20)" stroke="oklch(0.52 0.20 180)" strokeWidth="1.6"/><path d="M32 8v3M32 12.5v.5" stroke="oklch(0.52 0.20 180)" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  "hr-explainers": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><path d="M22 10v26" stroke="oklch(0.55 0.20 260)" strokeWidth="1.8" strokeLinecap="round"/><path d="M22 10c-3-2-8-3-14-2v26c6-1 11 0 14 2" fill="oklch(0.55 0.20 260 / 0.12)" stroke="oklch(0.55 0.20 260)" strokeWidth="1.8" strokeLinejoin="round"/><path d="M22 10c3-2 8-3 14-2v26c-6-1-11 0-14 2" fill="oklch(0.55 0.20 260 / 0.20)" stroke="oklch(0.55 0.20 260)" strokeWidth="1.8" strokeLinejoin="round"/><path d="M27 18h6M27 22h6M27 26h4" stroke="oklch(0.55 0.20 260)" strokeWidth="1.4" strokeLinecap="round"/><path d="M11 18h6M11 22h6M11 26h4" stroke="oklch(0.55 0.20 260)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/></svg>,
  podcast: <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="4" y="10" width="36" height="24" rx="6" fill="oklch(0.48 0.22 15 / 0.15)" stroke="oklch(0.48 0.22 15)" strokeWidth="1.8"/><path d="M18 16l10 6-10 6V16z" fill="oklch(0.48 0.22 15)" stroke="oklch(0.48 0.22 15)" strokeWidth="1" strokeLinejoin="round"/><path d="M6 38c4-2 8-3 16-3s12 1 16 3" stroke="oklch(0.48 0.22 15)" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/></svg>,
  "nationality-ratio": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><circle cx="22" cy="22" r="16" fill="oklch(0.55 0.18 200 / 0.10)" stroke="oklch(0.55 0.18 200)" strokeWidth="1.8"/><ellipse cx="22" cy="22" rx="7" ry="16" fill="none" stroke="oklch(0.55 0.18 200)" strokeWidth="1.4" opacity="0.7"/><path d="M6 22h32" stroke="oklch(0.55 0.18 200)" strokeWidth="1.4" opacity="0.7"/><path d="M8 15h28M8 29h28" stroke="oklch(0.55 0.18 200)" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/><circle cx="16" cy="18" r="2.5" fill="oklch(0.55 0.18 200 / 0.35)" stroke="oklch(0.55 0.18 200)" strokeWidth="1.2"/><circle cx="28" cy="18" r="2.5" fill="oklch(0.55 0.18 200 / 0.35)" stroke="oklch(0.55 0.18 200)" strokeWidth="1.2"/><circle cx="22" cy="28" r="2.5" fill="oklch(0.55 0.18 200)" stroke="oklch(0.55 0.18 200)" strokeWidth="1.2"/></svg>,
  "employee-cost": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="5" y="28" width="7" height="10" rx="2" fill="oklch(0.55 0.20 170 / 0.20)" stroke="oklch(0.55 0.20 170)" strokeWidth="1.6"/><rect x="15" y="20" width="7" height="18" rx="2" fill="oklch(0.55 0.20 170 / 0.30)" stroke="oklch(0.55 0.20 170)" strokeWidth="1.6"/><rect x="25" y="12" width="7" height="26" rx="2" fill="oklch(0.55 0.20 170 / 0.45)" stroke="oklch(0.55 0.20 170)" strokeWidth="1.6"/><path d="M34 8l4-4m0 0h-5m5 0v5" stroke="oklch(0.55 0.20 170)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 38h34" stroke="oklch(0.55 0.20 170)" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/><circle cx="37" cy="26" r="5" fill="oklch(0.55 0.20 170 / 0.15)" stroke="oklch(0.55 0.20 170)" strokeWidth="1.4"/><path d="M35 26h4M37 24v4" stroke="oklch(0.55 0.20 170)" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  "hr-cost": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="5" y="28" width="8" height="12" rx="2" fill="oklch(0.62 0.20 55 / 0.20)" stroke="var(--accent)" strokeWidth="1.6"/><rect x="17" y="20" width="8" height="20" rx="2" fill="oklch(0.62 0.20 55 / 0.30)" stroke="var(--accent)" strokeWidth="1.6"/><rect x="29" y="10" width="8" height="30" rx="2" fill="oklch(0.62 0.20 55 / 0.45)" stroke="var(--accent)" strokeWidth="1.6"/><path d="M38 6l-4-4-4 4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M34 2v8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/><path d="M3 40h38" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  "turnover-rate": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><circle cx="14" cy="14" r="6" fill="oklch(0.58 0.20 340 / 0.15)" stroke="oklch(0.58 0.20 340)" strokeWidth="1.6"/><path d="M8 30c0-4 2.7-7 6-7h4" stroke="oklch(0.58 0.20 340)" strokeWidth="1.6" strokeLinecap="round"/><path d="M26 22h12M32 17l6 5-6 5" stroke="oklch(0.58 0.20 340)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="20" y="32" width="4" height="8" rx="1" fill="oklch(0.58 0.20 340 / 0.25)" stroke="oklch(0.58 0.20 340)" strokeWidth="1.3"/><rect x="26" y="28" width="4" height="12" rx="1" fill="oklch(0.58 0.20 340 / 0.40)" stroke="oklch(0.58 0.20 340)" strokeWidth="1.3"/><rect x="32" y="24" width="4" height="16" rx="1" fill="oklch(0.58 0.20 340 / 0.55)" stroke="oklch(0.58 0.20 340)" strokeWidth="1.3"/><path d="M18 40h22" stroke="oklch(0.58 0.20 340)" strokeWidth="1.3" strokeLinecap="round" opacity="0.5"/></svg>,
  "payroll-sheet": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="4" y="6" width="36" height="32" rx="4" fill="oklch(0.60 0.18 145 / 0.12)" stroke="var(--success)" strokeWidth="1.6"/><path d="M4 14h36" stroke="var(--success)" strokeWidth="1.3" opacity="0.5"/><path d="M14 14v24" stroke="var(--success)" strokeWidth="1.3" opacity="0.4"/><path d="M24 14v24" stroke="var(--success)" strokeWidth="1.3" opacity="0.3"/><path d="M4 22h36M4 30h36" stroke="var(--success)" strokeWidth="1.3" opacity="0.3"/><circle cx="9" cy="10" r="2" fill="oklch(0.60 0.18 145 / 0.5)" stroke="var(--success)" strokeWidth="1"/><path d="M28 34l3-3 3 3" stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M31 31v6" stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  "payroll-calc": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="6" y="4" width="32" height="36" rx="4" fill="oklch(0.62 0.16 185 / 0.12)" stroke="oklch(0.62 0.16 185)" strokeWidth="1.6"/><rect x="10" y="8" width="24" height="8" rx="2" fill="oklch(0.62 0.16 185 / 0.2)" stroke="oklch(0.62 0.16 185)" strokeWidth="1.3"/><path d="M10 22h14M10 26h10M10 30h12" stroke="oklch(0.62 0.16 185)" strokeWidth="1.4" strokeLinecap="round"/><circle cx="32" cy="32" r="7" fill="oklch(0.62 0.16 185 / 0.2)" stroke="oklch(0.62 0.16 185)" strokeWidth="1.5"/><path d="M32 29v3l2 2" stroke="oklch(0.62 0.16 185)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "documents-hub": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="4" y="4" width="17" height="17" rx="3" fill="oklch(0.72 0.10 85 / 0.15)" stroke="oklch(0.72 0.10 85)" strokeWidth="1.6"/><path d="M7 10h11M7 13h11M7 16h7" stroke="oklch(0.72 0.10 85)" strokeWidth="1.3" strokeLinecap="round"/><rect x="23" y="4" width="17" height="17" rx="3" fill="oklch(0.72 0.10 85 / 0.08)" stroke="oklch(0.72 0.10 85)" strokeWidth="1.6" opacity="0.8"/><path d="M26 10h11M26 13h8" stroke="oklch(0.72 0.10 85)" strokeWidth="1.3" strokeLinecap="round" opacity="0.8"/><path d="M28 18l1.5-3 3-3-1-1-3 3L28 18z" fill="oklch(0.72 0.10 85 / 0.5)" stroke="oklch(0.72 0.10 85)" strokeWidth="1" strokeLinejoin="round"/><rect x="4" y="23" width="17" height="17" rx="3" fill="oklch(0.72 0.10 85 / 0.08)" stroke="oklch(0.72 0.10 85)" strokeWidth="1.6" opacity="0.8"/><circle cx="8" cy="29" r="1.5" fill="oklch(0.72 0.10 85)" /><path d="M11 29h8" stroke="oklch(0.72 0.10 85)" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="33" r="1.5" fill="oklch(0.72 0.10 85 / 0.5)" stroke="oklch(0.72 0.10 85)" strokeWidth="0.8"/><path d="M11 33h6" stroke="oklch(0.72 0.10 85)" strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/><rect x="23" y="23" width="17" height="17" rx="3" fill="oklch(0.72 0.10 85 / 0.12)" stroke="oklch(0.72 0.10 85)" strokeWidth="1.6" opacity="0.9"/><line x1="31.5" y1="26" x2="31.5" y2="37" stroke="oklch(0.72 0.10 85)" strokeWidth="1.2"/><path d="M26 28h5M26 31h5M26 34h4" stroke="oklch(0.72 0.10 85)" strokeWidth="1.2" strokeLinecap="round" opacity="0.8"/><path d="M33 28h5M33 31h5M33 34h3" stroke="oklch(0.72 0.10 85)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/></svg>,
  "contract-conversion": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="4" y="6" width="16" height="20" rx="3" fill="oklch(0.55 0.22 195 / 0.12)" stroke="var(--info)" strokeWidth="1.6"/><path d="M7 12h10M7 15h10M7 18h7" stroke="var(--info)" strokeWidth="1.3" strokeLinecap="round"/><rect x="7" y="20" width="9" height="3" rx="1" fill="oklch(0.55 0.22 195 / 0.4)"/><path d="M21 16 C23 13 27 13 29 16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M27 14 L29 16 L27 18" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="24" y="6" width="16" height="20" rx="3" fill="oklch(0.60 0.18 145 / 0.12)" stroke="var(--success)" strokeWidth="1.6"/><path d="M27 16 C27 14.3 28.5 13.5 30 14.5 C31.5 15.5 31.5 17.5 33 17.5 C34.5 17.5 36 16.7 36 15 C36 13.3 34.5 12.5 33 13.5 C31.5 14.5 31.5 16.5 30 17.5 C28.5 18.5 27 17.7 27 16" stroke="var(--success)" strokeWidth="1.6" strokeLinecap="round" fill="none"/><rect x="14" y="32" width="16" height="8" rx="2" fill="oklch(0.60 0.18 145 / 0.15)" stroke="var(--success)" strokeWidth="1.2"/><path d="M17 36 C18 34.5 21 34.5 22 36" stroke="var(--success)" strokeWidth="1.2" strokeLinecap="round"/><path d="M18 37.5 h8" stroke="var(--success)" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  "hc-kpi": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="4" y="28" width="6" height="12" rx="2" fill="oklch(0.55 0.22 195 / 0.25)" stroke="var(--info)" strokeWidth="1.5"/><rect x="13" y="20" width="6" height="20" rx="2" fill="oklch(0.55 0.22 195 / 0.35)" stroke="var(--info)" strokeWidth="1.5"/><rect x="22" y="12" width="6" height="28" rx="2" fill="oklch(0.55 0.22 195 / 0.5)" stroke="var(--info)" strokeWidth="1.5"/><rect x="31" y="18" width="6" height="22" rx="2" fill="oklch(0.55 0.22 195 / 0.3)" stroke="var(--info)" strokeWidth="1.5"/><path d="M7 26 L16 18 L25 10 L34 16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="7" cy="26" r="2.5" fill="var(--accent)"/><circle cx="25" cy="10" r="2.5" fill="var(--accent)"/><circle cx="34" cy="16" r="2.5" fill="var(--accent)"/></svg>,
  "leave-calculator": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="4" y="6" width="36" height="34" rx="5" fill="oklch(0.55 0.22 240 / 0.12)" stroke="oklch(0.55 0.22 240)" strokeWidth="1.6"/><path d="M4 16h36" stroke="oklch(0.55 0.22 240)" strokeWidth="1.4" opacity="0.5"/><path d="M14 6v6M30 6v6" stroke="oklch(0.55 0.22 240)" strokeWidth="1.8" strokeLinecap="round"/><circle cx="22" cy="28" r="5" fill="oklch(0.55 0.22 240 / 0.2)" stroke="oklch(0.55 0.22 240)" strokeWidth="1.4"/><path d="M22 21v-2M22 37v-2M15 28h-2M31 28h-2" stroke="oklch(0.55 0.22 240)" strokeWidth="1.3" strokeLinecap="round"/><path d="M17.5 23.5l-1.4-1.4M27.9 33.9l-1.4-1.4M17.5 32.5l-1.4 1.4M27.9 22.1l-1.4 1.4" stroke="oklch(0.55 0.22 240)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/></svg>,
  probation: <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="4" y="4" width="36" height="36" rx="6" fill="oklch(0.52 0.18 195 / 0.12)" stroke="oklch(0.52 0.18 195)" strokeWidth="1.6"/><path d="M14 4v6M30 4v6" stroke="oklch(0.52 0.18 195)" strokeWidth="1.8" strokeLinecap="round"/><path d="M4 16h36" stroke="oklch(0.52 0.18 195)" strokeWidth="1.4" opacity="0.5"/><rect x="10" y="22" width="8" height="8" rx="2" fill="oklch(0.52 0.18 195 / 0.25)" stroke="oklch(0.52 0.18 195)" strokeWidth="1.3"/><path d="M12 26l2 2 4-4" stroke="oklch(0.52 0.18 195)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M24 24h10M24 28h7" stroke="oklch(0.52 0.18 195)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/></svg>,
  "job-descriptions": <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full"><rect x="6" y="4" width="32" height="36" rx="5" fill="oklch(0.55 0.20 320 / 0.12)" stroke="oklch(0.55 0.20 320)" strokeWidth="1.6"/><path d="M12 14h20M12 20h20M12 26h14" stroke="oklch(0.55 0.20 320)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="33" cy="34" r="7" fill="oklch(0.55 0.20 320 / 0.15)" stroke="oklch(0.55 0.20 320)" strokeWidth="1.4"/><path d="M30 34l2 2 4-4" stroke="oklch(0.55 0.20 320)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "org-chart": <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663364198732/2vuJLs9j7vTiL4E4emfRJ8/org_chart_icon-YYWyuMnwZJTZ9BcvKXzCqN.webp" alt="الهيكل التنظيمي" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
  "workforce-planning": <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663364198732/2vuJLs9j7vTiL4E4emfRJ8/workforce_planning_icon-Hf2bf8rm3jQBkxbivNKm9u.webp" alt="تخطيط القوى العاملة" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
};

export default function Home() {
  const [, navigate] = useLocation();
  const { t, lang, dir } = useLang();
  const { user, loading, logout } = useAuth();
  const { data: siteConfig } = api.config.getAll.useQuery();
  const LOGO_URL = siteConfig?.logo_url ?? LOGO_URL_DEFAULT;
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: homeServicesData } = api.home.getAll.useQuery();
  const rawServices = useMemo(() => (homeServicesData as any) ?? [], [homeServicesData]);

  const services = useMemo(() => rawServices.map((s: any) => ({
    id: s.id,
    path: s.path,
    label: t(s.titleAr, s.titleEn),
    sub: t(s.subAr, s.subEn),
    desc: t(s.descAr, s.descEn),
    accent: SERVICE_ACCENTS[s.id] ?? "var(--primary)",
    badge: t(s.badgeAr ?? "", s.badgeEn ?? "") || null,
    externalUrl: s.externalUrl,
    icon: SERVICE_ICONS[s.id] ?? null,
  })), [rawServices, t]);

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
      {/* ══════════════════════════════════════════
          HERO — KAFD Night Background
      ══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingTop: "4.5rem" }}
      >
        {/* Background image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${KAFD_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* Dark gradient overlay — kept dark in both themes so white text stays readable, blends into page at the bottom */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, oklch(0.13 0.008 260 / 0.72) 0%, oklch(0.13 0.008 260 / 0.86) 55%, oklch(0.13 0.008 260) 100%)",
          }}
        />

        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 lg:px-12 py-4 lg:py-6">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="مواكبة" className="w-9 h-9 object-contain rounded-xl" />
            <span style={{ fontFamily: "'Noto Naskh Arabic', serif", fontWeight: 900, fontSize: "1rem", color: "white" }}>
              {t("مواكبة", "Muwakaba")}
            </span>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Hamburger menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all"
              style={{ background: "oklch(1 0 0 / 0.08)", color: "white", border: "1px solid oklch(1 0 0 / 0.2)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? (
                  <>
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="6" y1="18" x2="18" y2="6" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </>
                )}
              </svg>
            </button>
            {loading ? null : user ? (
              <>
                <button
                  onClick={() => navigate("/account")}
                  className="hidden lg:inline-flex items-center gap-1 px-2 lg:px-3 py-1.5 rounded-lg text-[10px] lg:text-xs font-semibold transition-all"
                  style={{ background: "oklch(1 0 0 / 0.06)", color: "var(--muted-foreground)", border: "1px solid oklch(1 0 0 / 0.12)" }}
                >
                  {user.name || user.email}
                </button>
                <button
                  onClick={() => navigate("/my-dashboard")}
                  className="flex items-center gap-1 px-2 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "color-mix(in oklch, var(--primary) 25%, transparent)", color: "white", border: "1px solid color-mix(in oklch, var(--primary) 40%, transparent)" }}
                >
                  <span className="hidden lg:inline">{t("لوحتي", "Dashboard")}</span>
                  <span className="lg:hidden">📊</span>
                </button>
                <button
                  onClick={() => logout()}
                  className="text-[10px] lg:text-xs font-semibold px-2 lg:px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "var(--muted-foreground)", border: "1px solid oklch(1 0 0 / 0.15)" }}
                >
                  {t("خروج", "Logout")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="text-[10px] lg:text-xs font-semibold px-2 lg:px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: "oklch(1 0 0 / 0.08)", color: "white", border: "1px solid oklch(1 0 0 / 0.2)" }}
                >
                  {t("دخول", "Login")}
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="text-[10px] lg:text-xs font-semibold px-2 lg:px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: "color-mix(in oklch, var(--primary) 30%, transparent)", color: "white", border: "1px solid color-mix(in oklch, var(--primary) 40%, transparent)" }}
                >
                  {t("تسجيل", "Register")}
                </button>
              </>
            )}
            <img src={VISION_URL} alt="رؤية 2030" className="h-6 lg:h-7 w-auto" style={{ opacity: 0.9 }} />
          </div>
        </nav>

        {/* Hamburger dropdown menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed z-50 mx-5 lg:mx-12 mt-2 rounded-2xl overflow-hidden left-0 right-0"
              style={{
                top: "4.5rem",
                background: "oklch(0.10 0.025 290 / 0.92)",
                backdropFilter: "blur(16px)",
                border: "1px solid oklch(1 0 0 / 0.1)",
              }}
            >
              {/* Close button */}
              <div className="flex justify-end p-3">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="6" y1="18" x2="18" y2="6" />
                  </svg>
                </button>
              </div>

              {/* Groups grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0 px-4 pb-5">
                {NAV_GROUPS.map((group) => (
                  <div key={group.titleEn} className="p-3">
                    <h3
                      className="text-[11px] font-bold mb-2.5 pb-1.5"
                      style={{
                        color: "var(--accent)",
                        fontFamily: "'Cairo', sans-serif",
                        borderBottom: "1px solid oklch(1 0 0 / 0.08)",
                      }}
                    >
                      {t(group.titleAr, group.titleEn)}
                    </h3>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item) => (
                        <a
                          key={item.path}
                          href={item.path}
                          onClick={() => setMenuOpen(false)}
                          className="text-start text-[11px] py-1 px-2 rounded-md transition-all hover:bg-white/10 block"
                          style={{ color: "rgba(255,255,255,0.75)", fontFamily: "'Cairo', sans-serif", textDecoration: "none" }}
                        >
                          {t(item.labelAr, item.labelEn)}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 pb-20 lg:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold"
              style={{
                background: "color-mix(in oklch, var(--primary) 15%, transparent)",
                border: "1px solid color-mix(in oklch, var(--primary) 45%, transparent)",
                color: "var(--primary)",
              }}
            >
              <span>🏆</span>
              <span>{t("المنصة الأولى في نظام العمل السعودي", "Saudi Labor Law #1 Platform")}</span>
            </div>

            <h1
              className="text-4xl lg:text-6xl font-black mb-4 leading-tight"
              style={{
                fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif",
                color: "white",
                textShadow: "0 2px 20px oklch(0 0 0 / 0.5)",
              }}
            >
              {t("مواكبة للموارد البشرية", "Muwakaba HR Practices")}
            </h1>
            <p
              className="text-base lg:text-lg max-w-sm lg:max-w-xl mx-auto leading-relaxed mb-8"
              style={{ color: "oklch(0.82 0.04 250)", fontFamily: "'Cairo', sans-serif" }}
            >
              {t(
                "منصة متخصصة في شرح ومواكبة القرارات الوطنية المتعلقة بدعم وتمكين الكفاءات الوطنية في المملكة العربية السعودية",
                "A specialized platform for explaining and tracking national decisions related to supporting Saudi talent"
              )}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <motion.button
                onClick={() => navigate("/calculator")}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-6 py-3 rounded-xl font-bold text-sm"
                style={{
                  background: "var(--primary)",
                  color: "white",
                  boxShadow: "0 4px 20px color-mix(in oklch, var(--primary) 45%, transparent)",
                }}
              >
                {t("حاسبة التوطين", "Saudization Calculator")}
              </motion.button>

            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" style={{ color: "color-mix(in oklch, var(--primary) 70%, transparent)" }}>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SERVICES — Cards Grid
      ══════════════════════════════════════════ */}
      <section className="py-14 px-5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2
              className="text-2xl font-black mb-2"
              style={{
                fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif",
                color: "var(--foreground)",
              }}
            >
              {t("خدمات مواكبة", "Mawakaba Services")}
            </h2>
            <div style={{ width: "3rem", height: "2px", background: "var(--accent)", margin: "0.4rem auto 0.6rem", borderRadius: "1px" }} />
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {t("كل ما تحتاجه في نظام العمل السعودي", "Everything you need for Saudi Labor Law")}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {services.map((service: any, i: number) => (
              <motion.button
                key={service.id}
                onClick={() => {
                  if ((service as any).externalUrl) {
                    window.open((service as any).externalUrl, "_blank", "noopener,noreferrer");
                  } else {
                    navigate(service.path);
                  }
                }}
                className="relative flex flex-col overflow-hidden transition-all group"
                style={{
                  background: "var(--card)",
                  border: `1px solid ${"var(--border)"}`,
                  borderRadius: "0.875rem",
                  boxShadow: "0 4px 18px oklch(0 0 0 / 0.18)",
                  textAlign: dir === "rtl" ? "right" : "left",
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: `0 8px 32px ${service.accent}25`,
                }}
                whileTap={{ scale: 0.97 }}
              >
                {/* ── Top accent bar ── */}
                <div
                  style={{
                    height: "4px",
                    width: "100%",
                    background: `linear-gradient(to ${dir === "rtl" ? "left" : "right"}, ${service.accent}, ${service.accent}55)`,
                    flexShrink: 0,
                  }}
                />

                {/* ── Card body ── */}
                <div className="flex flex-col gap-2.5 p-3.5 flex-1">

                  {/* Badge */}
                  {service.badge && (
                    <span
                      className="absolute text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        top: "0.6rem",
                        [dir === "rtl" ? "left" : "right"]: "0.5rem",
                        background: service.accent,
                        color: "white",
                        boxShadow: `0 2px 8px ${service.accent}55`,
                      }}
                    >
                      {service.badge}
                    </span>
                  )}

                  {/* Icon container — square with tinted bg */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center p-2 flex-shrink-0"
                    style={{
                      background: `${service.accent}18`,
                      border: `1px solid ${service.accent}35`,
                    }}
                  >
                    {service.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <p
                      className="text-[9px] font-bold mb-0.5 tracking-wide"
                      style={{ color: service.accent }}
                    >
                      {service.sub}
                    </p>
                    <h3
                      className="font-black text-sm leading-tight mb-1"
                      style={{
                        fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif",
                        color: "var(--foreground)",
                      }}
                    >
                      {service.label}
                    </h3>
                    <p className="text-[10px] leading-snug" style={{ color: "var(--muted-foreground)" }}>
                      {service.desc}
                    </p>
                  </div>

                  {/* Bottom accent line — always visible, subtle */}
                  <div
                    className="h-[2px] rounded-full mt-auto"
                    style={{
                      background: `linear-gradient(to ${dir === "rtl" ? "left" : "right"}, ${service.accent}80, ${service.accent}20, transparent)`,
                    }}
                  />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer
        className="py-8 px-5 text-center"
        style={{
          background: "var(--background)",
          borderTop: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)",
        }}
      >
        <img src={EMBLEM_URL} alt="رؤية 2030" className="w-14 h-14 object-contain mx-auto mb-3" style={{ opacity: 0.7 }} />
        <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
          {t(
            "مستند إلى قرارات وزارة الموارد البشرية والتنمية الاجتماعية 2026",
            "Based on Ministry of Human Resources and Social Development decisions 2026"
          )}
        </p>
        <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
          © 2026 {t("مواكبة للموارد البشرية — جزاء البقمي", "Muwakaba HR — Jaza Al-Baqami")}
        </p>
      </footer>
    </div>
  );
}
