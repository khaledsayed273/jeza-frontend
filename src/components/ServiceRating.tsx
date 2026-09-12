import { useState, useEffect } from "react";

interface ServiceRatingProps {
  serviceId: string;
  serviceName: string;
}

interface RatingData {
  rating: number; // 1-5
  helpful: boolean | null;
  timestamp: number;
}

function getStoredRating(serviceId: string): RatingData | null {
  try {
    const raw = localStorage.getItem(`rating_${serviceId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveRating(serviceId: string, data: RatingData) {
  try {
    localStorage.setItem(`rating_${serviceId}`, JSON.stringify(data));
    // Track usage stats
    const stats = getUsageStats();
    stats.ratings[serviceId] = data;
    localStorage.setItem("usage_stats", JSON.stringify(stats));
  } catch {}
}

export function getUsageStats() {
  try {
    const raw = localStorage.getItem("usage_stats");
    return raw ? JSON.parse(raw) : { visits: {}, ratings: {} };
  } catch {
    return { visits: {}, ratings: {} };
  }
}

export function trackServiceVisit(serviceId: string, serviceName: string) {
  try {
    const stats = getUsageStats();
    if (!stats.visits[serviceId]) {
      stats.visits[serviceId] = { name: serviceName, count: 0, lastVisit: 0 };
    }
    stats.visits[serviceId].count += 1;
    stats.visits[serviceId].lastVisit = Date.now();
    stats.visits[serviceId].name = serviceName;
    localStorage.setItem("usage_stats", JSON.stringify(stats));
  } catch {}
}

export default function ServiceRating({ serviceId, serviceName }: ServiceRatingProps) {
  const [existing, setExisting] = useState<RatingData | null>(null);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredRating(serviceId);
    setExisting(stored);
    // Show after 2 seconds if no rating yet
    const timer = setTimeout(() => {
      if (!stored) setVisible(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [serviceId]);

  const handleRate = (stars: number) => {
    const data: RatingData = { rating: stars, helpful: null, timestamp: Date.now() };
    saveRating(serviceId, data);
    setExisting(data);
    setSubmitted(true);
    setTimeout(() => setVisible(false), 2500);
  };

  if (!visible && !existing) return null;
  if (existing && !visible) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        bottom: "24px",
        left: "24px",
        zIndex: 1000,
        background: "var(--background)",
        border: "1px solid var(--background)",
        borderRadius: "16px",
        padding: "16px 20px",
        boxShadow: "0 8px 32px oklch(0 0 0 / 0.4)",
        minWidth: "280px",
        animation: "slideUp 0.3s ease",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {!submitted ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <p style={{ color: "var(--card)", fontSize: "14px", margin: 0, fontFamily: "'Cairo', sans-serif" }}>
              هل كانت الخدمة مفيدة؟
            </p>
            <button
              onClick={() => setVisible(false)}
              style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}
            >
              ✕
            </button>
          </div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "12px", margin: "0 0 12px", fontFamily: "'Cairo', sans-serif" }}>
            {serviceName}
          </p>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => handleRate(star)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "28px",
                  transition: "transform 0.15s",
                  transform: hovered >= star ? "scale(1.2)" : "scale(1)",
                  filter: hovered >= star ? "none" : "grayscale(0.5)",
                }}
              >
                {hovered >= star ? "⭐" : "☆"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center" }}>
            <button
              onClick={() => handleRate(5)}
              style={{
                background: "oklch(0.55 0.18 145 / 0.2)",
                border: "1px solid oklch(0.55 0.18 145 / 0.4)",
                borderRadius: "8px",
                color: "oklch(0.75 0.15 145)",
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              👍 مفيدة
            </button>
            <button
              onClick={() => handleRate(2)}
              style={{
                background: "oklch(0.55 0.18 15 / 0.2)",
                border: "1px solid oklch(0.55 0.18 15 / 0.4)",
                borderRadius: "8px",
                color: "oklch(0.75 0.15 15)",
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              👎 تحتاج تحسين
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🙏</div>
          <p style={{ color: "var(--card)", fontSize: "14px", margin: 0, fontFamily: "'Cairo', sans-serif" }}>
            شكراً على تقييمك!
          </p>
          <p style={{ color: "var(--muted-foreground)", fontSize: "12px", margin: "4px 0 0", fontFamily: "'Cairo', sans-serif" }}>
            رأيك يساعدنا على التحسين
          </p>
        </div>
      )}
    </div>
  );
}
