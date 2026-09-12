import ServiceRating from "@/components/ServiceRating";
import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/api";

// ─────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────
const BLUE = "oklch(0.55 0.22 240)";
const BLUE_DIM = "oklch(0.55 0.22 240 / 0.12)";
const BLUE_BORDER = "oklch(0.55 0.22 240 / 0.35)";
const GREEN = "oklch(0.58 0.18 145)";
const GREEN_DIM = "oklch(0.58 0.18 145 / 0.12)";
const GOLD = "var(--accent)";
const GOLD_DIM = "oklch(0.62 0.20 55 / 0.12)";
const GOLD_BORDER = "oklch(0.62 0.20 55 / 0.35)";
const RED = "oklch(0.58 0.22 25)";
const RED_DIM = "oklch(0.58 0.22 25 / 0.12)";
const PURPLE = "var(--primary)";
const PURPLE_DIM = "color-mix(in oklch, var(--primary) 12%, transparent)";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface LeaveEntry {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  note: string;
}

interface CalcResult {
  totalServiceDays: number;
  totalServiceYears: number;
  totalServiceMonths: number;
  earnedDays: number;
  usedDays: number;
  balanceDays: number;
  dailyRate: number;
  monthlyRate: number;
  breakdownByYear: { year: number; earned: number; used: number; balance: number }[];
  status: "positive" | "zero" | "negative";
  nextYearEarn: number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, diff);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ar-SA-u-ca-gregory", { year: "numeric", month: "long", day: "numeric" });
}

function toHijri(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-SA-u-ca-islamic", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

function calcLeave(
  startDate: string,
  calcDate: string,
  annualAllowance: number,
  prevUsed: number,
  prevBalance: number,
  hasPrevLeave: boolean,
  entries: LeaveEntry[]
): CalcResult | null {
  if (!startDate || !calcDate) return null;
  const start = new Date(startDate);
  const calc = new Date(calcDate);
  if (isNaN(start.getTime()) || isNaN(calc.getTime())) return null;
  if (calc < start) return null;

  // Total service in days
  const totalServiceDays = Math.floor((calc.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const totalServiceYears = Math.floor(totalServiceDays / 365);
  const totalServiceMonths = Math.floor((totalServiceDays % 365) / 30);

  // Daily accrual rate
  const dailyRate = annualAllowance / 365;
  const monthlyRate = (annualAllowance / 12);

  // Earned days = (service days / 365) * annual allowance
  const earnedDays = parseFloat((totalServiceDays * dailyRate).toFixed(2));

  // Used days from entries
  const usedFromEntries = entries.reduce((sum, e) => sum + (e.days || 0), 0);

  // Total used = previous used + entries
  // If has previous balance (already taken into account), we use prevUsed only
  let totalUsed: number;
  if (hasPrevLeave) {
    // prevBalance = earned so far - prevUsed, so prevUsed = earned - prevBalance
    // But user explicitly entered prevUsed, so we use it directly
    totalUsed = prevUsed + usedFromEntries;
  } else {
    totalUsed = usedFromEntries;
  }

  const balanceDays = parseFloat((earnedDays - totalUsed).toFixed(2));

  // Breakdown by year
  const breakdownByYear: { year: number; earned: number; used: number; balance: number }[] = [];
  for (let y = 1; y <= totalServiceYears + 1; y++) {
    const yearStart = addDays(startDate, (y - 1) * 365);
    const yearEnd = addDays(startDate, y * 365 - 1);
    const yearEndDate = new Date(yearEnd);
    if (yearEndDate > calc && y > totalServiceYears + 1) break;
    const daysInThisYear = Math.min(
      y <= totalServiceYears ? 365 : totalServiceDays % 365,
      totalServiceDays - (y - 1) * 365
    );
    if (daysInThisYear <= 0) break;
    const yearEarned = parseFloat((daysInThisYear * dailyRate).toFixed(2));
    breakdownByYear.push({ year: y, earned: yearEarned, used: 0, balance: yearEarned });
  }

  const nextYearEarn = annualAllowance;

  return {
    totalServiceDays,
    totalServiceYears,
    totalServiceMonths,
    earnedDays,
    usedDays: totalUsed,
    balanceDays,
    dailyRate,
    monthlyRate,
    breakdownByYear,
    status: balanceDays > 0 ? "positive" : balanceDays === 0 ? "zero" : "negative",
    nextYearEarn,
  };
}

// ─────────────────────────────────────────────
// Leave types (fallback)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function LeaveCalculatorPage() {
  const [, navigate] = useLocation();

  const { lang } = useLang();
  const { data: leaveTypesData } = api.leave.getAll.useQuery();
  const LEAVE_TYPES = useMemo(() => {
    const raw = (leaveTypesData as any) ?? [];
    return raw.map((lt: any) => ({ value: lt.value, label: lang === "ar" ? lt.labelAr : lt.labelEn }));
  }, [leaveTypesData, lang]);

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

  // ── Form state ──
  const [empName, setEmpName] = useState("");
  const [empId, setEmpId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [calcDate, setCalcDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [annualAllowance, setAnnualAllowance] = useState<number>(30);
  const [customAllowance, setCustomAllowance] = useState("");
  const [hasPrevLeave, setHasPrevLeave] = useState(false);
  const [prevUsed, setPrevUsed] = useState<number>(0);
  const [prevBalance, setPrevBalance] = useState<number>(0);

  // Leave entries
  const [entries, setEntries] = useState<LeaveEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState<Omit<LeaveEntry, "id" | "days">>({
    type: "annual", startDate: "", endDate: "", note: "",
  });

  const [result, setResult] = useState<CalcResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [additionalDeduction, setAdditionalDeduction] = useState("");
  const [additionalBonus, setAdditionalBonus] = useState("");

  const effectiveAllowance = annualAllowance === 0 ? (parseInt(customAllowance) || 30) : annualAllowance;

  const addEntry = () => {
    if (!newEntry.startDate || !newEntry.endDate) return;
    const days = daysBetween(newEntry.startDate, newEntry.endDate);
    setEntries(prev => [...prev, { ...newEntry, id: Date.now().toString(), days }]);
    setNewEntry({ type: "annual", startDate: "", endDate: "", note: "" });
    setShowAddEntry(false);
  };

  const removeEntry = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));

  const handleCalc = useCallback(() => {
    const r = calcLeave(startDate, calcDate, effectiveAllowance, prevUsed, prevBalance, hasPrevLeave, entries);
    setResult(r);
    setShowResult(true);
    setTimeout(() => {
      document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [startDate, calcDate, effectiveAllowance, prevUsed, prevBalance, hasPrevLeave, entries]);

  const handleReset = () => {
    setEmpName(""); setEmpId(""); setStartDate(""); setCalcDate(new Date().toISOString().split("T")[0]);
    setAnnualAllowance(30); setCustomAllowance(""); setHasPrevLeave(false);
    setPrevUsed(0); setPrevBalance(0); setEntries([]); setResult(null); setShowResult(false);
    setAdditionalDeduction("");
    setAdditionalBonus("");
  };

  const deductionDays = parseFloat(additionalDeduction) || 0;
  const bonusDays = parseFloat(additionalBonus) || 0;
  const finalBalance = result ? parseFloat((result.balanceDays - deductionDays + bonusDays).toFixed(2)) : 0;
  const finalStatus = finalBalance > 0 ? "positive" : finalBalance === 0 ? "zero" : "negative";

  const totalUsedDays = entries.reduce((s, e) => s + e.days, 0) + (hasPrevLeave ? prevUsed : 0);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background: "var(--background)",
        borderBottom: `1px solid ${BLUE_BORDER}`,
        padding: "0.9rem 1.25rem",
        display: "flex", alignItems: "center", gap: "0.75rem",
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(12px)",
      }}>
        <button onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: BLUE, cursor: "pointer", fontSize: "1.1rem", padding: "0.2rem 0.4rem", borderRadius: "0.4rem" }}>
          ←
        </button>
        <div style={{ width: 38, height: 38, borderRadius: "0.65rem", background: BLUE_DIM, border: `1px solid ${BLUE_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
          🗓️
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: BLUE }}>حاسبة أرصدة الإجازات</div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>Leave Balance Calculator</div>
        </div>
        <button onClick={handleReset}
          style={{ marginRight: "auto", padding: "0.4rem 0.85rem", borderRadius: "0.6rem", background: "var(--secondary)", color: "var(--muted-foreground)", border: `1px solid ${"var(--border)"}`, cursor: "pointer", fontSize: "0.78rem" }}>
          إعادة تعيين
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.25rem 1rem" }}>

        {/* Hero */}
        <div style={{
          background: `linear-gradient(135deg, ${BLUE_DIM} 0%, oklch(0.55 0.22 220 / 0.08) 100%)`,
          border: `1px solid ${BLUE_BORDER}`,
          borderRadius: "1rem",
          padding: "1.1rem 1.4rem",
          marginBottom: "1.25rem",
          display: "flex", alignItems: "center", gap: "1rem",
        }}>
          <div style={{ fontSize: "2.2rem", lineHeight: 1 }}>🏖️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.2rem" }}>احسب رصيد إجازة موظفك بدقة</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1.6 }}>
              بناءً على تاريخ المباشرة، الرصيد المتفق عليه، والإجازات المستخدمة
            </div>
          </div>
        </div>

        {/* ── Section 1: Employee Info ── */}
        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.85rem", padding: "1.1rem", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <span style={{ width: 24, height: 24, borderRadius: "0.4rem", background: BLUE_DIM, border: `1px solid ${BLUE_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>👤</span>
            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: BLUE }}>بيانات الموظف</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={labelStyle}>اسم الموظف</label>
              <input style={inputStyle} value={empName} onChange={e => setEmpName(e.target.value)} placeholder="اختياري" />
            </div>
            <div>
              <label style={labelStyle}>رقم الهوية / الموظف</label>
              <input style={inputStyle} value={empId} onChange={e => setEmpId(e.target.value)} placeholder="اختياري" />
            </div>
            <div>
              <label style={labelStyle}>تاريخ المباشرة *</label>
              <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
              {startDate && <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>هـ: {toHijri(startDate)}</div>}
            </div>
            <div>
              <label style={labelStyle}>تاريخ احتساب الرصيد *</label>
              <input type="date" style={inputStyle} value={calcDate} onChange={e => setCalcDate(e.target.value)} />
              {calcDate && <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>هـ: {toHijri(calcDate)}</div>}
            </div>
          </div>
        </div>

        {/* ── Section 2: Annual Allowance ── */}
        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.85rem", padding: "1.1rem", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <span style={{ width: 24, height: 24, borderRadius: "0.4rem", background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>📋</span>
            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: GOLD }}>الرصيد السنوي المتفق عليه</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {[
              { val: 30, label: "30 يوم", sub: "الحد الأقصى نظامياً" },
              { val: 21, label: "21 يوم", sub: "الحد الأدنى نظامياً" },
              { val: 0, label: "رقم آخر", sub: "أدخل الرقم يدوياً" },
            ].map(opt => (
              <button key={opt.val} onClick={() => setAnnualAllowance(opt.val)}
                style={{ flex: 1, minWidth: 100, padding: "0.65rem 0.5rem", borderRadius: "0.65rem", border: `1px solid ${annualAllowance === opt.val ? GOLD : "var(--border)"}`, background: annualAllowance === opt.val ? GOLD_DIM : "var(--input)", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: annualAllowance === opt.val ? GOLD : "var(--foreground)" }}>{opt.label}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>{opt.sub}</div>
              </button>
            ))}
          </div>
          {annualAllowance === 0 && (
            <div>
              <label style={labelStyle}>عدد أيام الإجازة السنوية</label>
              <input type="number" style={inputStyle} value={customAllowance} onChange={e => setCustomAllowance(e.target.value)} placeholder="مثال: 25" min="1" max="365" />
            </div>
          )}
          <div style={{ padding: "0.6rem 0.85rem", borderRadius: "0.6rem", background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, fontSize: "0.78rem", color: GOLD, marginTop: "0.5rem" }}>
            💡 نظام العمل السعودي: 21 يوم للسنوات الأولى، 30 يوم بعد 5 سنوات خدمة متواصلة
          </div>
        </div>

        {/* ── Section 3: Previous Leaves ── */}
        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.85rem", padding: "1.1rem", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <span style={{ width: 24, height: 24, borderRadius: "0.4rem", background: PURPLE_DIM, border: `1px solid ${PURPLE}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>📂</span>
            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: PURPLE }}>الإجازات السابقة</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {[
              { val: false, label: "لا توجد إجازات سابقة" },
              { val: true, label: "نعم، توجد إجازات سابقة" },
            ].map(opt => (
              <button key={String(opt.val)} onClick={() => setHasPrevLeave(opt.val)}
                style={{ flex: 1, padding: "0.6rem", borderRadius: "0.6rem", border: `1px solid ${hasPrevLeave === opt.val ? PURPLE : "var(--border)"}`, background: hasPrevLeave === opt.val ? PURPLE_DIM : "var(--input)", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", color: hasPrevLeave === opt.val ? PURPLE : "var(--muted-foreground)" }}>
                {opt.label}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {hasPrevLeave && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", paddingTop: "0.25rem" }}>
                  <div>
                    <label style={labelStyle}>عدد أيام الإجازة التي حصل عليها</label>
                    <input type="number" style={inputStyle} value={prevUsed || ""} onChange={e => setPrevUsed(Number(e.target.value))} placeholder="مثال: 15" min="0" />
                    <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>مجموع الأيام المستخدمة قبل هذا الحساب</div>
                  </div>
                  <div>
                    <label style={labelStyle}>الرصيد المتبقي من السابق (اختياري)</label>
                    <input type="number" style={inputStyle} value={prevBalance || ""} onChange={e => setPrevBalance(Number(e.target.value))} placeholder="مثال: 5" min="0" />
                    <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>للتحقق من صحة الحساب</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Section 4: Leave Entries ── */}
        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.85rem", padding: "1.1rem", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: 24, height: 24, borderRadius: "0.4rem", background: RED_DIM, border: `1px solid ${RED}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>📅</span>
              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: RED }}>الإجازات المستخدمة</span>
            </div>
            <button onClick={() => setShowAddEntry(v => !v)}
              style={{ padding: "0.4rem 0.85rem", borderRadius: "0.55rem", background: showAddEntry ? "var(--secondary)" : RED_DIM, color: showAddEntry ? "var(--muted-foreground)" : RED, border: `1px solid ${showAddEntry ? "var(--border)" : RED}30`, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>
              {showAddEntry ? "✕ إلغاء" : "+ إضافة إجازة"}
            </button>
          </div>

          {/* Add entry form */}
          <AnimatePresence>
            {showAddEntry && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: "0.85rem" }}>
                <div style={{ background: "var(--secondary)", borderRadius: "0.65rem", padding: "0.85rem", border: `1px solid ${RED}25` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginBottom: "0.65rem" }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>نوع الإجازة</label>
                      <select style={inputStyle} value={newEntry.type} onChange={e => setNewEntry(p => ({ ...p, type: e.target.value }))}>
                        {LEAVE_TYPES.map((lt: any) => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>تاريخ بداية الإجازة</label>
                      <input type="date" style={inputStyle} value={newEntry.startDate} onChange={e => setNewEntry(p => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>تاريخ نهاية الإجازة</label>
                      <input type="date" style={inputStyle} value={newEntry.endDate} onChange={e => setNewEntry(p => ({ ...p, endDate: e.target.value }))} />
                    </div>
                    {newEntry.startDate && newEntry.endDate && (
                      <div style={{ gridColumn: "1 / -1", padding: "0.4rem 0.75rem", borderRadius: "0.5rem", background: RED_DIM, fontSize: "0.8rem", color: RED, fontWeight: 700 }}>
                        📌 عدد الأيام: {daysBetween(newEntry.startDate, newEntry.endDate)} يوم
                      </div>
                    )}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>ملاحظة (اختياري)</label>
                      <input style={inputStyle} value={newEntry.note} onChange={e => setNewEntry(p => ({ ...p, note: e.target.value }))} placeholder="مثال: إجازة صيفية 2024" />
                    </div>
                  </div>
                  <button onClick={addEntry} disabled={!newEntry.startDate || !newEntry.endDate}
                    style={{ padding: "0.55rem 1.25rem", borderRadius: "0.6rem", background: RED, color: "white", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", opacity: (!newEntry.startDate || !newEntry.endDate) ? 0.5 : 1 }}>
                    إضافة الإجازة
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Entries list */}
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
              لا توجد إجازات مضافة بعد
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.45rem" }}>
              {entries.map(entry => {
                const lt = LEAVE_TYPES.find((lt: any) => lt.value === entry.type);
                return (
                  <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.6rem 0.85rem", background: "var(--secondary)", borderRadius: "0.6rem", border: `1px solid ${"var(--border)"}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{lt?.label ?? entry.type}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
                        {formatDate(entry.startDate)} ← {formatDate(entry.endDate)}
                      </div>
                      {entry.note && <div style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>{entry.note}</div>}
                    </div>
                    <div style={{ padding: "0.2rem 0.6rem", borderRadius: "1rem", background: RED_DIM, color: RED, fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>
                      {entry.days} يوم
                    </div>
                    <button onClick={() => removeEntry(entry.id)}
                      style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: "0.9rem", opacity: 0.6 }}>
                      ✕
                    </button>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.4rem 0.5rem", fontSize: "0.8rem", color: RED, fontWeight: 700 }}>
                إجمالي الإجازات المدخلة: {entries.reduce((s, e) => s + e.days, 0)} يوم
              </div>
            </div>
          )}
        </div>

        {/* ── Adjustments (Deduction + Bonus) ── */}
        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.85rem", padding: "1rem", marginBottom: "0.75rem" }}>
          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--muted-foreground)", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            ⚙️ تعديلات اختيارية على الرصيد
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
            {/* Deduction */}
            <div style={{ background: RED_DIM, border: `1px solid ${RED}25`, borderRadius: "0.65rem", padding: "0.75rem" }}>
              <label style={{ ...labelStyle, color: RED }}>➖ خصم أيام (اختياري)</label>
              <input
                type="number"
                min="0"
                value={additionalDeduction}
                onChange={e => setAdditionalDeduction(e.target.value)}
                placeholder="مثال: 5"
                style={{ ...inputStyle, borderColor: deductionDays > 0 ? RED : "var(--border)" }}
              />
              {deductionDays > 0 && (
                <div style={{ marginTop: "0.35rem", fontSize: "0.72rem", color: RED, fontWeight: 700 }}>
                  سيُخصم {deductionDays} يوم
                </div>
              )}
            </div>
            {/* Bonus */}
            <div style={{ background: GREEN_DIM, border: `1px solid ${GREEN}25`, borderRadius: "0.65rem", padding: "0.75rem" }}>
              <label style={{ ...labelStyle, color: GREEN }}>➕ مبلغ إضافي (اختياري)</label>
              <input
                type="number"
                min="0"
                value={additionalBonus}
                onChange={e => setAdditionalBonus(e.target.value)}
                placeholder="مثال: 3"
                style={{ ...inputStyle, borderColor: bonusDays > 0 ? GREEN : "var(--border)" }}
              />
              {bonusDays > 0 && (
                <div style={{ marginTop: "0.35rem", fontSize: "0.72rem", color: GREEN, fontWeight: 700 }}>
                  سيُضاف {bonusDays} يوم
                </div>
              )}
            </div>
          </div>
          {(deductionDays > 0 || bonusDays > 0) && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted-foreground)", padding: "0.4rem 0.65rem", background: "var(--secondary)", borderRadius: "0.5rem" }}>
              💡 سيظهر الرصيد النهائي بعد تطبيق هذه التعديلات في نتيجة الحساب
            </div>
          )}
        </div>

        {/* ── Calculate Button ── */}
        <button
          onClick={handleCalc}
          disabled={!startDate || !calcDate || (annualAllowance === 0 && !customAllowance)}
          style={{
            width: "100%", padding: "0.9rem", borderRadius: "0.85rem",
            background: (!startDate || !calcDate) ? "var(--secondary)" : `linear-gradient(135deg, ${BLUE} 0%, oklch(0.55 0.22 220) 100%)`,
            color: (!startDate || !calcDate) ? "var(--muted-foreground)" : "white",
            border: "none", cursor: (!startDate || !calcDate) ? "not-allowed" : "pointer",
            fontWeight: 800, fontSize: "1rem",
            boxShadow: (!startDate || !calcDate) ? "none" : `0 4px 20px ${BLUE}40`,
            transition: "all 0.2s",
          }}>
          🧮 احسب رصيد الإجازة
        </button>

        {/* ── Result Section ── */}
        <AnimatePresence>
          {showResult && result && (
            <motion.div id="result-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              style={{ marginTop: "1.25rem" }}>

              {/* Result header */}
              <div style={{
                background: finalStatus === "positive"
                  ? `linear-gradient(135deg, ${GREEN_DIM} 0%, oklch(0.58 0.18 160 / 0.08) 100%)`
                  : finalStatus === "negative"
                    ? `linear-gradient(135deg, ${RED_DIM} 0%, oklch(0.58 0.22 10 / 0.08) 100%)`
                    : BLUE_DIM,
                border: `1px solid ${finalStatus === "positive" ? GREEN : finalStatus === "negative" ? RED : BLUE}50`,
                borderRadius: "1rem",
                padding: "1.25rem 1.5rem",
                marginBottom: "0.85rem",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                  {finalStatus === "positive" ? "✅" : finalStatus === "negative" ? "⚠️" : "⏸️"}
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.5rem", color: finalStatus === "positive" ? GREEN : finalStatus === "negative" ? RED : BLUE }}>
                  {finalBalance > 0 ? "+" : ""}{finalBalance} يوم
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                  {finalStatus === "positive" ? "رصيد إجازة متاح" : finalStatus === "negative" ? "تجاوز في الإجازة" : "رصيد صفر"}
                </div>
                {(deductionDays > 0 || bonusDays > 0) && (
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap", marginTop: "0.4rem" }}>
                    {deductionDays > 0 && (
                      <div style={{ fontSize: "0.78rem", color: RED, padding: "0.3rem 0.75rem", background: RED_DIM, borderRadius: "1rem", display: "inline-block" }}>
                        ➖ {deductionDays} يوم خصم
                      </div>
                    )}
                    {bonusDays > 0 && (
                      <div style={{ fontSize: "0.78rem", color: GREEN, padding: "0.3rem 0.75rem", background: GREEN_DIM, borderRadius: "1rem", display: "inline-block" }}>
                        ➕ {bonusDays} يوم إضافي
                      </div>
                    )}
                  </div>
                )}
                {empName && <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>الموظف: {empName} {empId && `(${empId})`}</div>}
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.85rem" }}>
                {[
                  { label: "مدة الخدمة", value: `${result.totalServiceYears}س ${result.totalServiceMonths}ش`, sub: `${result.totalServiceDays} يوم`, color: BLUE, bg: BLUE_DIM },
                  { label: "الأيام المستحقة", value: `${result.earnedDays}`, sub: "يوم مستحق", color: GREEN, bg: GREEN_DIM },
                  { label: "الأيام المستخدمة", value: `${result.usedDays}`, sub: "يوم مستخدم", color: RED, bg: RED_DIM },
                ].map((s, i) => (
                  <div key={i} style={{ background: s.bg, borderRadius: "0.75rem", padding: "0.85rem 0.6rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                    <div style={{ fontSize: "0.62rem", color: "var(--muted-foreground)", marginTop: "0.15rem" }}>{s.sub}</div>
                    <div style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginTop: "0.1rem", fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Detailed breakdown */}
              <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.85rem", padding: "1rem", marginBottom: "0.85rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: BLUE, marginBottom: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  📊 تفاصيل الحساب
                </div>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {[
                    { label: "تاريخ المباشرة", value: `${formatDate(startDate)} | ${toHijri(startDate)}` },
                    { label: "تاريخ الاحتساب", value: `${formatDate(calcDate)} | ${toHijri(calcDate)}` },
                    { label: "الرصيد السنوي المتفق عليه", value: `${effectiveAllowance} يوم / سنة` },
                    { label: "معدل الاستحقاق اليومي", value: `${result.dailyRate.toFixed(4)} يوم / يوم` },
                    { label: "معدل الاستحقاق الشهري", value: `${result.monthlyRate.toFixed(2)} يوم / شهر` },
                    { label: "إجمالي أيام الخدمة", value: `${result.totalServiceDays} يوم` },
                    { label: "إجمالي الأيام المستحقة", value: `${result.earnedDays} يوم`, highlight: true, color: GREEN },
                    { label: "إجمالي الأيام المستخدمة", value: `${result.usedDays} يوم`, highlight: true, color: RED },
                    ...(deductionDays > 0 || bonusDays > 0 ? [{ label: "الرصيد قبل التعديل", value: `${result.balanceDays} يوم`, highlight: false, color: BLUE }] : []),
                    ...(deductionDays > 0 ? [{ label: "خصم إضافي", value: `− ${deductionDays} يوم`, highlight: false, color: RED }] : []),
                    ...(bonusDays > 0 ? [{ label: "مبلغ إضافي", value: `+ ${bonusDays} يوم`, highlight: false, color: GREEN }] : []),
                    { label: "الرصيد النهائي", value: `${finalBalance} يوم`, highlight: true, color: finalStatus === "positive" ? GREEN : RED },
                  ].map((row, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "0.45rem 0.65rem", borderRadius: "0.5rem",
                      background: row.highlight ? `${row.color}12` : "var(--secondary)",
                      border: row.highlight ? `1px solid ${row.color}30` : "none",
                    }}>
                      <span style={{ fontSize: "0.8rem", color: row.highlight ? row.color : "var(--muted-foreground)" }}>{row.label}</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: row.highlight ? 800 : 600, color: row.highlight ? row.color : "var(--foreground)" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Used leaves breakdown */}
              {(entries.length > 0 || hasPrevLeave) && (
                <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.85rem", padding: "1rem", marginBottom: "0.85rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", color: RED, marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    📋 تفصيل الإجازات المستخدمة
                  </div>
                  {hasPrevLeave && prevUsed > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0.65rem", background: PURPLE_DIM, borderRadius: "0.5rem", marginBottom: "0.4rem", fontSize: "0.8rem" }}>
                      <span style={{ color: PURPLE }}>إجازات سابقة (قبل هذا الحساب)</span>
                      <span style={{ fontWeight: 700, color: PURPLE }}>{prevUsed} يوم</span>
                    </div>
                  )}
                  {entries.map(entry => {
                const lt = LEAVE_TYPES.find((lt: any) => lt.value === entry.type);
                    return (
                      <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.65rem", background: "var(--secondary)", borderRadius: "0.5rem", marginBottom: "0.35rem", fontSize: "0.8rem" }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{lt?.label}</span>
                          <span style={{ color: "var(--muted-foreground)", marginRight: "0.5rem" }}>{formatDate(entry.startDate)} ← {formatDate(entry.endDate)}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: RED }}>{entry.days} يوم</span>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.4rem 0.65rem", borderTop: `1px solid ${"var(--border)"}`, marginTop: "0.4rem", fontWeight: 800, fontSize: "0.85rem", color: RED }}>
                    الإجمالي: {result.usedDays} يوم
                  </div>
                </div>
              )}

              {/* Legal note */}
              <div style={{ padding: "0.85rem 1rem", borderRadius: "0.75rem", background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, fontSize: "0.75rem", color: GOLD, lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>⚖️ ملاحظة قانونية</div>
                وفقاً لنظام العمل السعودي (المادة 109): يستحق العامل إجازة سنوية بأجر كامل لا تقل عن 21 يوماً، وتصبح 30 يوماً بعد 5 سنوات خدمة متواصلة لدى صاحب العمل. الحساب يعتمد على الأيام الفعلية للخدمة.
              </div>

              {/* Print button */}
              <button onClick={() => window.print()}
                style={{ width: "100%", marginTop: "0.85rem", padding: "0.7rem", borderRadius: "0.75rem", background: BLUE_DIM, color: BLUE, border: `1px solid ${BLUE_BORDER}`, cursor: "pointer", fontWeight: 700, fontSize: "0.88rem" }}>
                🖨️ طباعة النتيجة
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer */}
        <div style={{ height: "2rem" }} />
      </div>
      <ServiceRating serviceId="leave-calculator" serviceName="حاسبة أرصدة الإجازات" />
    </div>
  );
}
