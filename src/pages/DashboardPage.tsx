import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getUsageStats } from "@/components/ServiceRating";

interface VisitData {
  name: string;
  count: number;
  lastVisit: number;
}

interface RatingData {
  rating: number;
  helpful: boolean | null;
  timestamp: number;
}

interface UsageStats {
  visits: Record<string, VisitData>;
  ratings: Record<string, RatingData>;
}

const SERVICE_ICONS: Record<string, string> = {
  calculator: "🧮",
  "contract-conversion": "📋",
  "leave-calculator": "🏖️",
  "job-descriptions": "📄",
  "hc-kpi": "📊",
  "labor-quiz": "❓",
  training: "📚",
};

const SERVICE_PATHS: Record<string, string> = {
  calculator: "/calculator",
  "contract-conversion": "/contract-conversion",
  "leave-calculator": "/leave-calculator",
  "job-descriptions": "/job-descriptions",
  "hc-kpi": "/hc-kpi",
  "labor-quiz": "/labor-quiz",
  training: "/training",
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: "14px", opacity: s <= rating ? 1 : 0.25 }}>
          ⭐
        </span>
      ))}
    </div>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `منذ ${days} يوم`;
  if (hours > 0) return `منذ ${hours} ساعة`;
  if (mins > 0) return `منذ ${mins} دقيقة`;
  return "الآن";
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<UsageStats>({ visits: {}, ratings: {} });

  useEffect(() => {
    setStats(getUsageStats());
  }, []);

  const visitList = Object.entries(stats.visits).sort(
    ([, a], [, b]) => b.lastVisit - a.lastVisit
  );
  const ratingList = Object.entries(stats.ratings).sort(
    ([, a], [, b]) => b.timestamp - a.timestamp
  );

  const totalVisits = visitList.reduce((sum, [, v]) => sum + v.count, 0);
  const avgRating =
    ratingList.length > 0
      ? ratingList.reduce((sum, [, r]) => sum + r.rating, 0) / ratingList.length
      : 0;
  const mostUsed = visitList[0];

  const hasData = visitList.length > 0;

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "'Cairo', sans-serif",
        padding: "0 0 60px",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--background)",
          borderBottom: "1px solid var(--background)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "var(--foreground)",
            border: "1px solid var(--background)",
            borderRadius: "8px",
            color: "var(--muted-foreground)",
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: "13px",
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          ← الرئيسية
        </button>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            لوحة التحكم الشخصية
          </h1>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--muted-foreground)" }}>
            إحصاءات استخدامك للمنصة
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px" }}>
        {!hasData ? (
          /* Empty State */
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              background: "var(--background)",
              borderRadius: "20px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📊</div>
            <h2
              style={{
                color: "var(--muted-foreground)",
                fontSize: "20px",
                marginBottom: "8px",
              }}
            >
              لا توجد إحصاءات بعد
            </h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginBottom: "24px" }}>
              ابدأ باستخدام خدمات المنصة وستظهر إحصاءاتك هنا تلقائياً
            </p>
            <button
              onClick={() => navigate("/")}
              style={{
                background: "var(--primary)",
                border: "none",
                borderRadius: "10px",
                color: "white",
                padding: "10px 24px",
                cursor: "pointer",
                fontSize: "14px",
                fontFamily: "'Cairo', sans-serif",
                fontWeight: 600,
              }}
            >
              استكشف الخدمات
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
                marginBottom: "28px",
              }}
            >
              {[
                {
                  icon: "🔢",
                  label: "إجمالي الاستخدامات",
                  value: totalVisits.toString(),
                  color: "var(--primary)",
                },
                {
                  icon: "🛠️",
                  label: "الخدمات المستخدمة",
                  value: visitList.length.toString(),
                  color: "var(--success-strong)",
                },
                {
                  icon: "⭐",
                  label: "متوسط التقييم",
                  value: avgRating > 0 ? avgRating.toFixed(1) + " / 5" : "—",
                  color: "var(--warning-strong)",
                },
                {
                  icon: "🏆",
                  label: "الأكثر استخداماً",
                  value: mostUsed ? mostUsed[1].name : "—",
                  color: "var(--danger-strong)",
                  small: true,
                },
              ].map((card, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--background)",
                    border: `1px solid var(--background)`,
                    borderTop: `3px solid ${card.color}`,
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>{card.icon}</div>
                  <div
                    style={{
                      fontSize: card.small ? "14px" : "22px",
                      fontWeight: 700,
                      color: card.color,
                      marginBottom: "4px",
                    }}
                  >
                    {card.value}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    {card.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div
              style={{
                background: "var(--background)",
                border: "1px solid var(--background)",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 16px",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--card)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                🕐 آخر الخدمات المستخدمة
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {visitList.map(([id, data]) => (
                  <div
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "var(--background)",
                      borderRadius: "10px",
                      cursor: SERVICE_PATHS[id] ? "pointer" : "default",
                      transition: "background 0.2s",
                    }}
                    onClick={() => SERVICE_PATHS[id] && navigate(SERVICE_PATHS[id])}
                    onMouseEnter={(e) => {
                      if (SERVICE_PATHS[id])
                        (e.currentTarget as HTMLDivElement).style.background =
                          "var(--foreground)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        "var(--background)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "22px" }}>
                        {SERVICE_ICONS[id] || "🔧"}
                      </span>
                      <div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--card)",
                          }}
                        >
                          {data.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                          آخر استخدام: {timeAgo(data.lastVisit)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          background: "color-mix(in oklch, var(--primary) 15%, transparent)",
                          borderRadius: "20px",
                          padding: "3px 10px",
                          fontSize: "12px",
                          color: "var(--primary)",
                          fontWeight: 600,
                        }}
                      >
                        {data.count} مرة
                      </div>
                      {SERVICE_PATHS[id] && (
                        <span style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
                          ←
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ratings */}
            {ratingList.length > 0 && (
              <div
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--background)",
                  borderRadius: "16px",
                  padding: "20px",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 16px",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--card)",
                  }}
                >
                  ⭐ تقييماتك للخدمات
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {ratingList.map(([id, data]) => (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        background: "var(--background)",
                        borderRadius: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>
                          {SERVICE_ICONS[id] || "🔧"}
                        </span>
                        <div>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "var(--card)",
                              marginBottom: "4px",
                            }}
                          >
                            {stats.visits[id]?.name || id}
                          </div>
                          <StarDisplay rating={data.rating} />
                        </div>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        {formatDate(data.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Data */}
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <button
                onClick={() => {
                  if (confirm("هل تريد مسح جميع الإحصاءات؟")) {
                    localStorage.removeItem("usage_stats");
                    // Clear individual ratings
                    Object.keys(localStorage)
                      .filter((k) => k.startsWith("rating_"))
                      .forEach((k) => localStorage.removeItem(k));
                    setStats({ visits: {}, ratings: {} });
                  }
                }}
                style={{
                  background: "none",
                  border: "1px solid var(--danger-strong)",
                  borderRadius: "8px",
                  color: "var(--danger-strong)",
                  padding: "8px 18px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontFamily: "'Cairo', sans-serif",
                }}
              >
                🗑️ مسح الإحصاءات
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
