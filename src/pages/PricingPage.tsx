import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { useLang } from "../contexts/LanguageContext";
import { useAuth } from "../_core/hooks/useAuth";
import { motion } from "framer-motion";

export default function PricingPage() {
  const [, navigate] = useLocation();
  const { t, dir } = useLang();
  const { user } = useAuth();

  const { data: plans } = api.subscriptions.listPlans.useQuery();

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif", padding: "2rem 1rem" }}>
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate("/")} style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginBottom: "1rem", background: "none", border: "none", fontFamily: "'Cairo', sans-serif" }}>
          ← {t("العودة للرئيسية", "Back to Home")}
        </button>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">{t("خطط الاشتراك", "Subscription Plans")}</h1>
          <p style={{ color: "var(--muted-foreground)" }}>{t("اختر الخطة المناسبة لمنشأتك", "Choose the right plan for your organization")}</p>
        </div>

        {!plans || plans.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>
            <p className="text-lg">{t("لا توجد خطط متاحة حالياً", "No plans available at the moment.")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan: any, i: any) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  background: "var(--card)",
                  border: `1px solid ${"var(--border)"}`,
                  borderRadius: "1.25rem",
                  padding: "2rem",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <h2 className="text-xl font-black mb-1">{dir === "rtl" ? plan.nameAr : plan.nameEn || plan.nameAr}</h2>
                <div className="mb-4">
                  <span className="text-3xl font-black" style={{ color: "var(--accent)" }}>{Number(plan.priceMonthly).toLocaleString()}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}> {t("ريال/شهر", "SAR/month")}</span>
                </div>
                <div className="mb-4">
                  <span className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{Number(plan.priceYearly).toLocaleString()}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}> {t("ريال/سنة", "SAR/year")}</span>
                </div>
                {(() => {
                  if (!plan.features) return null;
                  let parsed: string[] = [];
                  try { parsed = JSON.parse(plan.features); } catch { return null; }
                  if (!Array.isArray(parsed) || parsed.length === 0) return null;
                  return (
                    <ul className="flex flex-col gap-2 mb-6 flex-1">
                      {parsed.map((f: string, fi: number) => (
                        <li key={fi} className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                          <span style={{ color: "var(--primary)" }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
                <motion.button
                  onClick={() => {
                    if (!user) { navigate("/login"); return; }
                    navigate("/account");
                  }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)", padding: "0.7rem 0", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.9rem", border: "none", fontFamily: "'Cairo', sans-serif", width: "100%" }}
                >
                  {user ? t("الاشتراك", "Subscribe") : t("سجل الدخول للاشتراك", "Login to Subscribe")}
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
