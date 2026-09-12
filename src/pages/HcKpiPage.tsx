import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────
const TEAL = "var(--info)";
const TEAL_DIM = "oklch(0.55 0.22 195 / 0.12)";
const TEAL_BORDER = "oklch(0.55 0.22 195 / 0.35)";
const GREEN = "var(--success)";
const GREEN_DIM = "oklch(0.60 0.18 145 / 0.12)";
const YELLOW = "oklch(0.72 0.18 85)";
const YELLOW_DIM = "oklch(0.72 0.18 85 / 0.12)";
const RED = "oklch(0.58 0.22 25)";
const RED_DIM = "oklch(0.58 0.22 25 / 0.12)";
const GOLD = "var(--accent)";
const GOLD_DIM = "oklch(0.62 0.20 55 / 0.12)";
const GOLD_BORDER = "oklch(0.62 0.20 55 / 0.35)";
const PURPLE = "var(--primary)";

function trafficColor(tl: string) {
  if (tl === "green") return { bg: GREEN_DIM, text: GREEN, label: "محقق", dot: GREEN };
  if (tl === "yellow") return { bg: YELLOW_DIM, text: YELLOW, label: "جيد", dot: YELLOW };
  if (tl === "red") return { bg: RED_DIM, text: RED, label: "يحتاج تدخل", dot: RED };
  return { bg: "oklch(0.5 0 0 / 0.08)", text: "oklch(0.6 0 0)", label: "لم يُعبأ", dot: "oklch(0.6 0 0)" };
}

// Get or create a persistent anonymous session token
function getSessionToken(): string {
  let token = localStorage.getItem("hc_kpi_session");
  if (!token) {
    token = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("hc_kpi_session", token);
  }
  return token;
}

type View = "orgs" | "reports" | "new_report" | "report_detail";

export default function HcKpiPage() {
  const [, navigate] = useLocation();
  const { t } = useLang();

  const [sessionToken] = useState(() => getSessionToken());

  // ── HC-KPI Indicators from DB ──
  const { data: hcData } = api.hcIndicators.getAll.useQuery();
  const HC_CATEGORIES = (hcData as any)?.categories ?? [];
  const BUILTIN_INDICATORS = (hcData as any)?.indicators ?? [];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.6rem 0.85rem", borderRadius: "0.65rem",
    border: `1px solid ${"var(--border)"}`, background: "var(--input)",
    color: "var(--foreground)", fontSize: "0.88rem", outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.72rem", fontWeight: 600,
    marginBottom: "0.3rem", color: "var(--muted-foreground)", letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  // ── State ──
  const [view, setView] = useState<View>("orgs");
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  // New org form
  const [orgNameAr, setOrgNameAr] = useState("");
  const [orgNameEn, setOrgNameEn] = useState("");
  const [orgIndustry, setOrgIndustry] = useState("");
  const [orgSize, setOrgSize] = useState<"small" | "medium" | "large">("medium");
  const [showNewOrg, setShowNewOrg] = useState(false);

  // New report form
  const [reportTitleAr, setReportTitleAr] = useState("");
  const [reportTitleEn, setReportTitleEn] = useState("");
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly">("quarterly");
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(BUILTIN_INDICATORS.slice(0, 10).map((i: any) => i.key)));
  const [customIndicators, setCustomIndicators] = useState<{ nameAr: string; nameEn: string; category: string; unit: string }[]>([]);
  const [newCustom, setNewCustom] = useState({ nameAr: "", nameEn: "", category: "custom", unit: "" });

  // KPI entry edit
  const [entryForm, setEntryForm] = useState<Record<string, string>>({});

  // ── Queries ──
  const { data: orgs, refetch: refetchOrgs } = api.hcKpi.listOrganizations.useQuery(
    { sessionToken }
  );
  const { data: reports, refetch: refetchReports } = api.hcKpi.listReports.useQuery(
    { sessionToken, organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );
  const { data: reportDetail, refetch: refetchDetail } = api.hcKpi.getReport.useQuery(
    { sessionToken, reportId: selectedReportId! },
    { enabled: !!selectedReportId }
  );

  // ── Mutations ──
  const createOrg = api.hcKpi.createOrganization.useMutation({
    onSuccess: () => { refetchOrgs(); setShowNewOrg(false); setOrgNameAr(""); setOrgNameEn(""); setOrgIndustry(""); }
  });
  const deleteOrg = api.hcKpi.deleteOrganization.useMutation({ onSuccess: () => refetchOrgs() });
  const createReport = api.hcKpi.createReport.useMutation({
    onSuccess: (data) => {
      setSelectedReportId(data.reportId);
      setView("report_detail");
      refetchReports();
    }
  });
  const deleteReport = api.hcKpi.deleteReport.useMutation({
    onSuccess: () => { refetchReports(); setView("reports"); }
  });
  const updateEntry = api.hcKpi.updateKpiEntry.useMutation({
    onSuccess: () => { refetchDetail(); setEditingEntryId(null); }
  });
  const addCustom = api.hcKpi.addCustomIndicator.useMutation({ onSuccess: () => refetchDetail() });
  const deleteEntry = api.hcKpi.deleteKpiEntry.useMutation({ onSuccess: () => refetchDetail() });
  const updateStatus = api.hcKpi.updateReportStatus.useMutation({ onSuccess: () => refetchDetail() });

  // ── Grouped indicators ──
  const groupedIndicators = useMemo(() => HC_CATEGORIES.map((cat: any) => ({
    ...cat,
    indicators: BUILTIN_INDICATORS.filter((i: any) => i.category === cat.key),
  })), []);

  const handleSaveEntry = (entryId: number) => {
    updateEntry.mutate({
      entryId,
      currentValue: entryForm.currentValue ? Number(entryForm.currentValue) : null,
      currentValueText: entryForm.currentValueText || null,
      benchmark: entryForm.benchmark || null,
      targetValue: entryForm.targetValue ? Number(entryForm.targetValue) : null,
      targetDate: entryForm.targetDate || null,
      initiative: entryForm.initiative || null,
      initiativeDate: entryForm.initiativeDate || null,
    });
  };

  const selectedOrg = orgs?.find((o: any) => o.id === selectedOrgId);

  // ── Render ──
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background: "var(--background)",
        borderBottom: `1px solid ${TEAL_BORDER}`,
        padding: "0.9rem 1.25rem",
        display: "flex", alignItems: "center", gap: "0.75rem",
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(12px)",
      }}>
        <button onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: TEAL, cursor: "pointer", fontSize: "1.1rem", padding: "0.2rem 0.4rem", borderRadius: "0.4rem" }}>
          ←
        </button>
        <div style={{ width: 38, height: 38, borderRadius: "0.65rem", background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
          📊
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: TEAL }}>مؤشرات فعالية رأس المال البشري</div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>Human Capital KPIs Dashboard</div>
        </div>

        {/* Breadcrumb */}
        {(view === "reports" || view === "report_detail" || view === "new_report") && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
            <span onClick={() => setView("orgs")} style={{ cursor: "pointer", color: TEAL }}>المؤسسات</span>
            {selectedOrg && (
              <>
                <span>/</span>
                <span onClick={() => setView("reports")} style={{ cursor: "pointer", color: view === "reports" ? "var(--foreground)" : TEAL }}>{selectedOrg.nameAr}</span>
              </>
            )}
            {(view === "report_detail" || view === "new_report") && (
              <>
                <span>/</span>
                <span style={{ color: "var(--foreground)" }}>{view === "new_report" ? "تقرير جديد" : "تفاصيل التقرير"}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.25rem 1rem" }}>

        {/* ════════════════════════════════════════
            VIEW: Organizations
        ════════════════════════════════════════ */}
        {view === "orgs" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

            {/* Hero intro */}
            <div style={{
              background: `linear-gradient(135deg, ${TEAL_DIM} 0%, oklch(0.55 0.22 220 / 0.08) 100%)`,
              border: `1px solid ${TEAL_BORDER}`,
              borderRadius: "1rem",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.25rem",
              display: "flex", alignItems: "center", gap: "1rem",
            }}>
              <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>📈</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.25rem" }}>قِس فعالية رأس المال البشري</div>
                <div style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                  أضف مؤسستك، أنشئ تقارير دورية، وتابع مؤشرات الأداء الرئيسية بسهولة
                </div>
              </div>
            </div>

            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>مؤسساتي ({orgs?.length ?? 0})</div>
              <button onClick={() => setShowNewOrg(v => !v)}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.65rem", background: showNewOrg ? "var(--secondary)" : TEAL, color: showNewOrg ? "var(--muted-foreground)" : "white", border: `1px solid ${showNewOrg ? "var(--border)" : "transparent"}`, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                {showNewOrg ? "✕ إلغاء" : "+ إضافة مؤسسة"}
              </button>
            </div>

            {/* New org form */}
            <AnimatePresence>
              {showNewOrg && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden", marginBottom: "1rem" }}>
                  <div style={{ background: "var(--card)", border: `1px solid ${TEAL_BORDER}`, borderRadius: "0.85rem", padding: "1.1rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: TEAL, marginBottom: "0.85rem" }}>بيانات المؤسسة</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
                      <div>
                        <label style={labelStyle}>اسم المؤسسة (عربي) *</label>
                        <input style={inputStyle} value={orgNameAr} onChange={e => setOrgNameAr(e.target.value)} placeholder="شركة الأمثلة" />
                      </div>
                      <div>
                        <label style={labelStyle}>اسم المؤسسة (إنجليزي)</label>
                        <input style={inputStyle} value={orgNameEn} onChange={e => setOrgNameEn(e.target.value)} placeholder="Example Co." />
                      </div>
                      <div>
                        <label style={labelStyle}>القطاع</label>
                        <input style={inputStyle} value={orgIndustry} onChange={e => setOrgIndustry(e.target.value)} placeholder="تجزئة، بنوك، صحة..." />
                      </div>
                      <div>
                        <label style={labelStyle}>حجم المنشأة</label>
                        <select style={inputStyle} value={orgSize} onChange={e => setOrgSize(e.target.value as "small" | "medium" | "large")}>
                          <option value="small">صغيرة — أقل من 50 موظف</option>
                          <option value="medium">متوسطة — 50 إلى 500 موظف</option>
                          <option value="large">كبيرة — أكثر من 500 موظف</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={() => createOrg.mutate({ sessionToken, nameAr: orgNameAr, nameEn: orgNameEn, industry: orgIndustry, size: orgSize })}
                      disabled={!orgNameAr || createOrg.isPending}
                      style={{ padding: "0.6rem 1.5rem", borderRadius: "0.65rem", background: TEAL, color: "white", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", opacity: !orgNameAr ? 0.5 : 1 }}>
                      {createOrg.isPending ? "جارٍ الحفظ..." : "حفظ المؤسسة"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Orgs list */}
            {!orgs?.length ? (
              <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "var(--muted-foreground)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem", opacity: 0.5 }}>🏢</div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.35rem" }}>لا توجد مؤسسات بعد</div>
                <div style={{ fontSize: "0.82rem" }}>أضف مؤسستك الأولى للبدء في قياس المؤشرات</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "0.65rem" }}>
                {orgs.map((org: any) => (
                  <motion.div key={org.id} whileHover={{ y: -1 }}
                    onClick={() => { setSelectedOrgId(org.id); setView("reports"); }}
                    style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.85rem", padding: "1rem 1.1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.85rem", transition: "all 0.15s" }}>
                    {/* Icon */}
                    <div style={{ width: 46, height: 46, borderRadius: "0.75rem", background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                      🏢
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{org.nameAr}</div>
                      {org.nameEn && <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{org.nameEn}</div>}
                      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                        {org.industry && (
                          <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                            📌 {org.industry}
                          </span>
                        )}
                        <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "0.4rem", background: TEAL_DIM, color: TEAL }}>
                          {org.size === "small" ? "صغيرة" : org.size === "medium" ? "متوسطة" : "كبيرة"}
                        </span>
                      </div>
                    </div>
                    {/* Arrow + delete */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <button onClick={e => { e.stopPropagation(); if (confirm("حذف المؤسسة وجميع تقاريرها؟")) deleteOrg.mutate({ sessionToken, id: org.id }); }}
                        style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "0.85rem", padding: "0.25rem", opacity: 0.6 }}>
                        🗑
                      </button>
                      <span style={{ color: TEAL, fontSize: "1rem" }}>←</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ════════════════════════════════════════
            VIEW: Reports List
        ════════════════════════════════════════ */}
        {view === "reports" && selectedOrgId && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1rem" }}>{selectedOrg?.nameAr}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>التقارير الدورية — {reports?.length ?? 0} تقرير</div>
              </div>
              <button onClick={() => setView("new_report")}
                style={{ padding: "0.55rem 1.1rem", borderRadius: "0.65rem", background: TEAL, color: "white", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                + تقرير جديد
              </button>
            </div>

            {!reports?.length ? (
              <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "var(--muted-foreground)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem", opacity: 0.5 }}>📋</div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.35rem" }}>لا توجد تقارير بعد</div>
                <div style={{ fontSize: "0.82rem" }}>أنشئ تقريرك الأول لبدء قياس المؤشرات</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "0.65rem" }}>
                {reports.map((rep: any) => (
                  <motion.div key={rep.id} whileHover={{ y: -1 }}
                    onClick={() => { setSelectedReportId(rep.id); setView("report_detail"); }}
                    style={{ background: "var(--card)", border: `1px solid ${rep.status === "completed" ? GREEN : "var(--border)"}`, borderRadius: "0.85rem", padding: "1rem 1.1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.85rem", transition: "all 0.15s" }}>
                    <div style={{ width: 46, height: 46, borderRadius: "0.75rem", background: rep.status === "completed" ? GREEN_DIM : GOLD_DIM, border: `1px solid ${rep.status === "completed" ? GREEN : GOLD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                      {rep.status === "completed" ? "✅" : "📝"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{rep.titleAr}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                        {rep.periodType === "quarterly" ? "ربعي" : "شهري"} — {rep.periodLabel}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>{rep.periodStart} ← {rep.periodEnd}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem", borderRadius: "1rem", background: rep.status === "completed" ? GREEN_DIM : GOLD_DIM, color: rep.status === "completed" ? GREEN : GOLD, fontWeight: 700 }}>
                        {rep.status === "completed" ? "مكتمل" : "مسودة"}
                      </span>
                      <button onClick={e => { e.stopPropagation(); if (confirm("حذف هذا التقرير؟")) deleteReport.mutate({ sessionToken, reportId: rep.id }); }}
                        style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "0.82rem", opacity: 0.6 }}>
                        🗑
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ════════════════════════════════════════
            VIEW: New Report Form
        ════════════════════════════════════════ */}
        {view === "new_report" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.25rem" }}>إنشاء تقرير جديد</div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginBottom: "1.1rem" }}>اختر الفترة الزمنية والمؤشرات المراد قياسها</div>

            {/* Report info card */}
            <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.85rem", padding: "1.1rem", marginBottom: "0.85rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: TEAL, marginBottom: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>بيانات التقرير</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>عنوان التقرير (عربي) *</label>
                  <input style={inputStyle} value={reportTitleAr} onChange={e => setReportTitleAr(e.target.value)} placeholder="مثال: تقرير مؤشرات الربع الأول 2025" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>عنوان التقرير (إنجليزي)</label>
                  <input style={inputStyle} value={reportTitleEn} onChange={e => setReportTitleEn(e.target.value)} placeholder="Q1 2025 HR KPI Report" />
                </div>
                <div>
                  <label style={labelStyle}>نوع الفترة</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {[{ val: "quarterly", label: "ربعي" }, { val: "monthly", label: "شهري" }].map(opt => (
                      <button key={opt.val} onClick={() => setPeriodType(opt.val as "monthly" | "quarterly")}
                        style={{ flex: 1, padding: "0.55rem", borderRadius: "0.6rem", border: `1px solid ${periodType === opt.val ? TEAL : "var(--border)"}`, background: periodType === opt.val ? TEAL_DIM : "var(--input)", color: periodType === opt.val ? TEAL : "var(--muted-foreground)", cursor: "pointer", fontSize: "0.85rem", fontWeight: periodType === opt.val ? 700 : 400 }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>تسمية الفترة</label>
                  <input style={inputStyle} value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder={periodType === "quarterly" ? "Q1 2025" : "يناير 2025"} />
                </div>
                <div>
                  <label style={labelStyle}>تاريخ البداية</label>
                  <input type="date" style={inputStyle} value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>تاريخ النهاية</label>
                  <input type="date" style={inputStyle} value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Indicator selection */}
            <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.85rem", padding: "1.1rem", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: TEAL, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  اختر المؤشرات <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>({selectedKeys.size} مختار)</span>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button onClick={() => setSelectedKeys(new Set(BUILTIN_INDICATORS.map((i: any) => i.key)))}
                    style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem", borderRadius: "0.4rem", background: TEAL_DIM, color: TEAL, border: `1px solid ${TEAL_BORDER}`, cursor: "pointer" }}>
                    الكل
                  </button>
                  <button onClick={() => setSelectedKeys(new Set())}
                    style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem", borderRadius: "0.4rem", background: "var(--secondary)", color: "var(--muted-foreground)", border: `1px solid ${"var(--border)"}`, cursor: "pointer" }}>
                    إلغاء
                  </button>
                </div>
              </div>
              {groupedIndicators.map((cat: any) => (
                <div key={cat.key} style={{ marginBottom: "0.85rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: cat.color, marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: cat.color, display: "inline-block" }} />
                    {cat.ar}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.35rem" }}>
                    {cat.indicators.map((ind: any) => (
                      <label key={ind.key} style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.4rem 0.6rem", borderRadius: "0.5rem", border: `1px solid ${selectedKeys.has(ind.key) ? cat.color : "var(--border)"}`, background: selectedKeys.has(ind.key) ? `${cat.color}15` : "var(--input)", cursor: "pointer", fontSize: "0.78rem" }}>
                        <input type="checkbox" checked={selectedKeys.has(ind.key)}
                          onChange={e => {
                            const s = new Set(selectedKeys);
                            e.target.checked ? s.add(ind.key) : s.delete(ind.key);
                            setSelectedKeys(s);
                          }} style={{ accentColor: cat.color, flexShrink: 0 }} />
                        <span style={{ color: selectedKeys.has(ind.key) ? "var(--foreground)" : "var(--muted-foreground)" }}>{ind.nameAr}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom indicators */}
            <div style={{ background: "var(--card)", border: `1px dashed ${PURPLE}`, borderRadius: "0.85rem", padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: PURPLE, marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ✦ مؤشرات مخصصة (اختياري)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.5rem", alignItems: "end", marginBottom: "0.5rem" }}>
                <div>
                  <label style={labelStyle}>اسم المؤشر (عربي)</label>
                  <input style={inputStyle} value={newCustom.nameAr} onChange={e => setNewCustom(p => ({ ...p, nameAr: e.target.value }))} placeholder="معدل الرضا الوظيفي" />
                </div>
                <div>
                  <label style={labelStyle}>الاسم (إنجليزي)</label>
                  <input style={inputStyle} value={newCustom.nameEn} onChange={e => setNewCustom(p => ({ ...p, nameEn: e.target.value }))} placeholder="Job Satisfaction" />
                </div>
                <div>
                  <label style={labelStyle}>الوحدة</label>
                  <input style={inputStyle} value={newCustom.unit} onChange={e => setNewCustom(p => ({ ...p, unit: e.target.value }))} placeholder="% أو ريال أو عدد" />
                </div>
                <button onClick={() => { if (newCustom.nameAr) { setCustomIndicators(p => [...p, newCustom]); setNewCustom({ nameAr: "", nameEn: "", category: "custom", unit: "" }); } }}
                  disabled={!newCustom.nameAr}
                  style={{ padding: "0.6rem 0.85rem", borderRadius: "0.6rem", background: PURPLE, color: "white", border: "none", cursor: "pointer", fontWeight: 700, opacity: !newCustom.nameAr ? 0.5 : 1 }}>
                  +
                </button>
              </div>
              {customIndicators.map((ci, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", background: `${PURPLE}12`, borderRadius: "0.5rem", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                  <span style={{ flex: 1 }}>{ci.nameAr} {ci.unit && <span style={{ color: "var(--muted-foreground)" }}>({ci.unit})</span>}</span>
                  <button onClick={() => setCustomIndicators(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                if (!reportTitleAr || !periodLabel || !periodStart || !periodEnd) return;
                createReport.mutate({
                  sessionToken,
                  organizationId: selectedOrgId!,
                  titleAr: reportTitleAr,
                  titleEn: reportTitleEn,
                  periodType,
                  periodLabel,
                  periodStart,
                  periodEnd,
                  selectedIndicatorKeys: Array.from(selectedKeys),
                  customIndicators,
                });
              }}
              disabled={!reportTitleAr || !periodLabel || !periodStart || !periodEnd || createReport.isPending}
              style={{ width: "100%", padding: "0.8rem", borderRadius: "0.75rem", background: TEAL, color: "white", border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.95rem", opacity: (!reportTitleAr || !periodLabel) ? 0.5 : 1 }}>
              {createReport.isPending ? "جارٍ الإنشاء..." : "إنشاء التقرير وبدء التعبئة ←"}
            </button>
          </motion.div>
        )}

        {/* ════════════════════════════════════════
            VIEW: Report Detail / KPI Dashboard
        ════════════════════════════════════════ */}
        {view === "report_detail" && reportDetail && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

            {/* Report header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1rem" }}>{reportDetail.report.titleAr}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                  {reportDetail.report.periodType === "quarterly" ? "ربعي" : "شهري"} — {reportDetail.report.periodLabel}
                  <span style={{ margin: "0 0.4rem" }}>|</span>
                  {reportDetail.report.periodStart} ← {reportDetail.report.periodEnd}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button
                  onClick={() => updateStatus.mutate({ sessionToken, reportId: reportDetail.report.id, status: reportDetail.report.status === "completed" ? "draft" : "completed" })}
                  style={{ padding: "0.45rem 0.85rem", borderRadius: "0.6rem", background: reportDetail.report.status === "completed" ? GREEN_DIM : GOLD_DIM, color: reportDetail.report.status === "completed" ? GREEN : GOLD, border: `1px solid ${reportDetail.report.status === "completed" ? GREEN : GOLD_BORDER}`, cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>
                  {reportDetail.report.status === "completed" ? "✅ مكتمل" : "📝 مسودة"}
                </button>
                <button
                  onClick={() => window.open(`/api/hc-kpi-pdf/${reportDetail.report.id}`, "_blank")}
                  style={{ padding: "0.45rem 0.85rem", borderRadius: "0.6rem", background: TEAL_DIM, color: TEAL, border: `1px solid ${TEAL_BORDER}`, cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>
                  📄 PDF
                </button>
              </div>
            </div>

            {/* Summary stats */}
            {(() => {
              const entries = reportDetail.entries;
              const total = entries.length;
              const green = entries.filter((e: any) => e.trafficLight === "green").length;
              const yellow = entries.filter((e: any) => e.trafficLight === "yellow").length;
              const red = entries.filter((e: any) => e.trafficLight === "red").length;
              const filled = entries.filter((e: any) => e.trafficLight !== "grey").length;
              const avgScore = filled > 0
                ? entries.filter((e: any) => e.performanceScore).reduce((a: any, b: any) => a + Number(b.performanceScore ?? 0), 0) / (entries.filter((e: any) => e.performanceScore).length || 1)
                : 0;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", marginBottom: "1.1rem" }}>
                  {[
                    { label: "إجمالي", value: total, color: TEAL, bg: TEAL_DIM },
                    { label: "محقق", value: green, color: GREEN, bg: GREEN_DIM },
                    { label: "جيد", value: yellow, color: YELLOW, bg: YELLOW_DIM },
                    { label: "يحتاج تدخل", value: red, color: RED, bg: RED_DIM },
                    { label: "متوسط الأداء", value: `${Math.round(avgScore)}%`, color: GOLD, bg: GOLD_DIM },
                  ].map((s, i) => (
                    <div key={i} style={{ background: s.bg, borderRadius: "0.65rem", padding: "0.65rem 0.5rem", textAlign: "center" }}>
                      <div style={{ fontSize: "1.35rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* KPI entries grouped by category */}
            {HC_CATEGORIES.map((cat: any) => {
              const catEntries = reportDetail.entries.filter((e: any) => e.category === cat.key);
              if (!catEntries.length) return null;
              return (
                <div key={cat.key} style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", padding: "0 0.25rem" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: cat.color, display: "inline-block" }} />
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: cat.color }}>{cat.ar}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>({cat.en})</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", marginRight: "auto" }}>{catEntries.length} مؤشر</span>
                  </div>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {catEntries.map((entry: any) => {
                      const tc = trafficColor(entry.trafficLight ?? "grey");
                      const isEditing = editingEntryId === entry.id;
                      return (
                        <div key={entry.id} style={{ background: "var(--card)", border: `1px solid ${isEditing ? cat.color : "var(--border)"}`, borderRadius: "0.75rem", overflow: "hidden", transition: "border-color 0.2s" }}>
                          {/* Top color bar */}
                          <div style={{ height: 3, background: cat.color, opacity: 0.7 }} />
                          <div style={{ padding: "0.75rem 1rem" }}>
                            {/* Entry header */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{entry.indicatorNameAr}</div>
                                {entry.indicatorNameEn && <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>{entry.indicatorNameEn}</div>}
                              </div>
                              {/* Traffic dot + badge */}
                              <span style={{ padding: "0.18rem 0.55rem", borderRadius: "1rem", background: tc.bg, color: tc.text, fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: tc.dot, display: "inline-block" }} />
                                {tc.label}
                              </span>
                              {entry.performanceScore && (
                                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: tc.text }}>{Math.round(Number(entry.performanceScore))}%</span>
                              )}
                              <button onClick={() => {
                                if (isEditing) { setEditingEntryId(null); return; }
                                setEditingEntryId(entry.id);
                                setEntryForm({
                                  currentValue: entry.currentValue?.toString() ?? "",
                                  currentValueText: entry.currentValueText ?? "",
                                  benchmark: entry.benchmark ?? "",
                                  targetValue: entry.targetValue?.toString() ?? "",
                                  targetDate: entry.targetDate ?? "",
                                  initiative: entry.initiative ?? "",
                                  initiativeDate: entry.initiativeDate ?? "",
                                });
                              }} style={{ background: "none", border: "none", color: isEditing ? TEAL : "var(--muted-foreground)", cursor: "pointer", fontSize: "0.82rem", padding: "0.2rem" }}>
                                {isEditing ? "✕" : "✏️"}
                              </button>
                              {entry.isCustom === 1 && (
                                <button onClick={() => { if (confirm("حذف هذا المؤشر؟")) deleteEntry.mutate({ entryId: entry.id }); }}
                                  style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "0.82rem", opacity: 0.6 }}>
                                  🗑
                                </button>
                              )}
                            </div>

                            {/* Filled data display (not editing) */}
                            {!isEditing && (entry.currentValue || entry.currentValueText || entry.initiative) && (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.4rem", marginTop: "0.6rem" }}>
                                {(entry.currentValue || entry.currentValueText) && (
                                  <div style={{ background: "var(--secondary)", borderRadius: "0.5rem", padding: "0.4rem 0.6rem" }}>
                                    <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.15rem" }}>الوضع الحالي</div>
                                    <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                                      {entry.currentValue ? `${entry.currentValue} ${entry.unit ?? ""}` : entry.currentValueText}
                                    </div>
                                  </div>
                                )}
                                {entry.targetValue && (
                                  <div style={{ background: "var(--secondary)", borderRadius: "0.5rem", padding: "0.4rem 0.6rem" }}>
                                    <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.15rem" }}>الهدف</div>
                                    <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{entry.targetValue} {entry.unit ?? ""}</div>
                                    {entry.targetDate && <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>{entry.targetDate}</div>}
                                  </div>
                                )}
                                {entry.initiative && (
                                  <div style={{ background: "var(--secondary)", borderRadius: "0.5rem", padding: "0.4rem 0.6rem", gridColumn: "1 / -1" }}>
                                    <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.15rem" }}>المبادرة</div>
                                    <div style={{ fontSize: "0.8rem" }}>{entry.initiative}</div>
                                    {entry.initiativeDate && <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginTop: "0.1rem" }}>📅 {entry.initiativeDate}</div>}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Edit form */}
                            {isEditing && (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.75rem" }}>
                                <div>
                                  <label style={labelStyle}>الوضع الحالي (رقم)</label>
                                  <input type="number" style={inputStyle} value={entryForm.currentValue} onChange={e => setEntryForm(p => ({ ...p, currentValue: e.target.value }))} placeholder={`القيمة بـ ${entry.unit ?? ""}`} />
                                </div>
                                <div>
                                  <label style={labelStyle}>الوضع الحالي (وصف)</label>
                                  <input style={inputStyle} value={entryForm.currentValueText} onChange={e => setEntryForm(p => ({ ...p, currentValueText: e.target.value }))} placeholder="وصف الوضع الحالي" />
                                </div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                  <label style={labelStyle}>المعيار للقياس</label>
                                  <input style={inputStyle} value={entryForm.benchmark} onChange={e => setEntryForm(p => ({ ...p, benchmark: e.target.value }))} placeholder={entry.benchmark ?? "المعيار المرجعي..."} />
                                </div>
                                <div>
                                  <label style={labelStyle}>الهدف (رقم)</label>
                                  <input type="number" style={inputStyle} value={entryForm.targetValue} onChange={e => setEntryForm(p => ({ ...p, targetValue: e.target.value }))} placeholder={`الهدف بـ ${entry.unit ?? ""}`} />
                                </div>
                                <div>
                                  <label style={labelStyle}>تاريخ تحقيق الهدف</label>
                                  <input type="date" style={inputStyle} value={entryForm.targetDate} onChange={e => setEntryForm(p => ({ ...p, targetDate: e.target.value }))} />
                                </div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                  <label style={labelStyle}>المبادرة لتحقيق الهدف</label>
                                  <textarea style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} value={entryForm.initiative} onChange={e => setEntryForm(p => ({ ...p, initiative: e.target.value }))} placeholder="اكتب المبادرة أو الإجراء المقترح..." />
                                </div>
                                <div>
                                  <label style={labelStyle}>تاريخ تنفيذ المبادرة</label>
                                  <input type="date" style={inputStyle} value={entryForm.initiativeDate} onChange={e => setEntryForm(p => ({ ...p, initiativeDate: e.target.value }))} />
                                </div>
                                <div style={{ display: "flex", alignItems: "flex-end" }}>
                                  <button onClick={() => handleSaveEntry(entry.id)} disabled={updateEntry.isPending}
                                    style={{ width: "100%", padding: "0.6rem", borderRadius: "0.6rem", background: cat.color, color: "white", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                                    {updateEntry.isPending ? "جارٍ الحفظ..." : "💾 حفظ"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Custom entries */}
            {(() => {
              const customEntries = reportDetail.entries.filter((e: any) => e.category === "custom");
              if (!customEntries.length) return null;
              return (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", padding: "0 0.25rem" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: PURPLE, display: "inline-block" }} />
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: PURPLE }}>مؤشرات مخصصة</span>
                  </div>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {customEntries.map((entry: any) => {
                      const tc = trafficColor(entry.trafficLight ?? "grey");
                      const isEditing = editingEntryId === entry.id;
                      return (
                        <div key={entry.id} style={{ background: "var(--card)", border: `1px solid ${isEditing ? PURPLE : "var(--border)"}`, borderRadius: "0.75rem", overflow: "hidden" }}>
                          <div style={{ height: 3, background: PURPLE, opacity: 0.7 }} />
                          <div style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{entry.indicatorNameAr}</div>
                                {entry.indicatorNameEn && <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>{entry.indicatorNameEn}</div>}
                              </div>
                              <span style={{ padding: "0.18rem 0.55rem", borderRadius: "1rem", background: tc.bg, color: tc.text, fontSize: "0.7rem", fontWeight: 700 }}>{tc.label}</span>
                              <button onClick={() => {
                                if (isEditing) { setEditingEntryId(null); return; }
                                setEditingEntryId(entry.id);
                                setEntryForm({ currentValue: entry.currentValue?.toString() ?? "", currentValueText: entry.currentValueText ?? "", benchmark: entry.benchmark ?? "", targetValue: entry.targetValue?.toString() ?? "", targetDate: entry.targetDate ?? "", initiative: entry.initiative ?? "", initiativeDate: entry.initiativeDate ?? "" });
                              }} style={{ background: "none", border: "none", color: isEditing ? PURPLE : "var(--muted-foreground)", cursor: "pointer", fontSize: "0.82rem" }}>
                                {isEditing ? "✕" : "✏️"}
                              </button>
                              <button onClick={() => { if (confirm("حذف هذا المؤشر؟")) deleteEntry.mutate({ entryId: entry.id }); }}
                                style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "0.82rem", opacity: 0.6 }}>
                                🗑
                              </button>
                            </div>
                            {isEditing && (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.75rem" }}>
                                <div><label style={labelStyle}>الوضع الحالي (رقم)</label><input type="number" style={inputStyle} value={entryForm.currentValue} onChange={e => setEntryForm(p => ({ ...p, currentValue: e.target.value }))} /></div>
                                <div><label style={labelStyle}>الوضع الحالي (وصف)</label><input style={inputStyle} value={entryForm.currentValueText} onChange={e => setEntryForm(p => ({ ...p, currentValueText: e.target.value }))} /></div>
                                <div><label style={labelStyle}>الهدف</label><input type="number" style={inputStyle} value={entryForm.targetValue} onChange={e => setEntryForm(p => ({ ...p, targetValue: e.target.value }))} /></div>
                                <div><label style={labelStyle}>تاريخ الهدف</label><input type="date" style={inputStyle} value={entryForm.targetDate} onChange={e => setEntryForm(p => ({ ...p, targetDate: e.target.value }))} /></div>
                                <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>المبادرة</label><textarea style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} value={entryForm.initiative} onChange={e => setEntryForm(p => ({ ...p, initiative: e.target.value }))} /></div>
                                <div><label style={labelStyle}>تاريخ التنفيذ</label><input type="date" style={inputStyle} value={entryForm.initiativeDate} onChange={e => setEntryForm(p => ({ ...p, initiativeDate: e.target.value }))} /></div>
                                <div style={{ display: "flex", alignItems: "flex-end" }}><button onClick={() => handleSaveEntry(entry.id)} style={{ width: "100%", padding: "0.6rem", borderRadius: "0.6rem", background: PURPLE, color: "white", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>💾 حفظ</button></div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Add custom indicator to existing report */}
            <div style={{ background: "var(--card)", border: `1px dashed ${PURPLE}`, borderRadius: "0.85rem", padding: "0.85rem 1rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.78rem", color: PURPLE, marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ✦ إضافة مؤشر مخصص
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.5rem", alignItems: "end" }}>
                <div>
                  <label style={labelStyle}>اسم المؤشر (عربي)</label>
                  <input style={inputStyle} value={newCustom.nameAr} onChange={e => setNewCustom(p => ({ ...p, nameAr: e.target.value }))} placeholder="اسم المؤشر..." />
                </div>
                <div>
                  <label style={labelStyle}>الوحدة</label>
                  <input style={inputStyle} value={newCustom.unit} onChange={e => setNewCustom(p => ({ ...p, unit: e.target.value }))} placeholder="% أو ريال..." />
                </div>
                <button onClick={() => {
                  if (!newCustom.nameAr) return;
                  addCustom.mutate({ reportId: reportDetail.report.id, nameAr: newCustom.nameAr, nameEn: newCustom.nameEn, unit: newCustom.unit });
                  setNewCustom({ nameAr: "", nameEn: "", category: "custom", unit: "" });
                }} disabled={!newCustom.nameAr}
                  style={{ padding: "0.6rem 0.85rem", borderRadius: "0.6rem", background: PURPLE, color: "white", border: "none", cursor: "pointer", fontWeight: 700, opacity: !newCustom.nameAr ? 0.5 : 1 }}>
                  +
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
