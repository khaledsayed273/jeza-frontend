/**
 * MUWAKABA — WhatsApp Floating Button
 * Design: Dark background + Lavender/Khuzami accent
 * زر واتساب عائم ثابت في أسفل يمين الشاشة
 */

import { useState } from "react";
import { api } from "../lib/api";

const WHATSAPP_NUMBER_DEFAULT = "966558648275";
const WHATSAPP_MESSAGE = encodeURIComponent("السلام عليكم، أودّ الاستفسار عن خدمات التوطين والموارد البشرية.");

export default function WhatsAppButton() {
  const [hovered, setHovered] = useState(false);
  const { data: siteConfig } = api.config.getAll.useQuery();
  const WHATSAPP_NUMBER = siteConfig?.whatsapp_number ?? WHATSAPP_NUMBER_DEFAULT;

  const handleClick = () => {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "1.5rem",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        direction: "rtl",
      }}
    >
      {/* Tooltip label */}
      <div
        style={{
          background: "var(--background)",
          border: "1px solid var(--background)",
          borderRadius: "0.5rem",
          padding: "0.35rem 0.75rem",
          fontSize: "0.72rem",
          fontFamily: "'Cairo', sans-serif",
          color: "var(--foreground)",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateX(0)" : "translateX(8px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          pointerEvents: "none",
        }}
      >
        تواصل مع أ. جزاء البقمي
      </div>

      {/* WhatsApp Button */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="تواصل عبر واتساب"
        style={{
          width: "3.2rem",
          height: "3.2rem",
          borderRadius: "50%",
          background: hovered
            ? "linear-gradient(135deg, #25D366, #128C7E)"
            : "linear-gradient(135deg, #20c55a, #0f7a56)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: hovered
            ? "0 6px 28px rgba(37, 211, 102, 0.55)"
            : "0 4px 18px rgba(37, 211, 102, 0.35)",
          transform: hovered ? "scale(1.1)" : "scale(1)",
          transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          flexShrink: 0,
        }}
      >
        {/* WhatsApp SVG Icon */}
        <svg
          viewBox="0 0 32 32"
          fill="white"
          width="1.7rem"
          height="1.7rem"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M16.003 2.667C8.637 2.667 2.667 8.637 2.667 16c0 2.347.618 4.55 1.697 6.457L2.667 29.333l7.09-1.677A13.28 13.28 0 0 0 16.003 29.333C23.37 29.333 29.333 23.363 29.333 16S23.37 2.667 16.003 2.667zm0 24.267a11.02 11.02 0 0 1-5.617-1.537l-.403-.24-4.21.995.996-4.107-.263-.42A10.987 10.987 0 0 1 5.003 16C5.003 9.927 9.927 5.003 16.003 5.003S27.003 9.927 27.003 16 22.08 26.934 16.003 26.934zm6.04-8.227c-.33-.165-1.953-.963-2.257-1.073-.303-.11-.523-.165-.743.165-.22.33-.853 1.073-1.047 1.293-.193.22-.387.247-.717.082-.33-.165-1.393-.513-2.653-1.637-.98-.873-1.643-1.95-1.837-2.28-.193-.33-.02-.508.145-.672.15-.148.33-.385.495-.578.165-.193.22-.33.33-.55.11-.22.055-.413-.027-.578-.083-.165-.743-1.793-1.018-2.453-.268-.643-.54-.555-.743-.565l-.633-.011c-.22 0-.578.082-.88.413-.303.33-1.155 1.128-1.155 2.75s1.183 3.19 1.348 3.41c.165.22 2.328 3.557 5.643 4.99.79.34 1.406.543 1.887.695.793.252 1.515.216 2.086.131.636-.095 1.953-.798 2.228-1.568.275-.77.275-1.43.193-1.568-.082-.137-.303-.22-.633-.385z"/>
        </svg>

        {/* Pulse ring */}
        <span
          style={{
            position: "absolute",
            width: "3.2rem",
            height: "3.2rem",
            borderRadius: "50%",
            border: "2px solid rgba(37, 211, 102, 0.5)",
            animation: "whatsapp-pulse 2s infinite",
            pointerEvents: "none",
          }}
        />
      </button>

      <style>{`
        @keyframes whatsapp-pulse {
          0% { transform: scale(1); opacity: 0.7; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
