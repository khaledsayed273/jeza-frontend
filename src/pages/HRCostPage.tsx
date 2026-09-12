import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowRight, BarChart3, Download, Calendar, TrendingUp, Users, Save, RotateCcw } from "lucide-react";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/api";
import * as XLSX from "xlsx";

const F = "'Cairo', sans-serif";
const FS = "'Noto Naskh Arabic', serif";

function fmt(n: number) {
  if (!n || isNaN(n)) return "0";
  return n.toLocaleString("ar-SA", { maximumFractionDigits: 0 });
}
function fmtD(n: number, d = 1) {
  if (!n || isNaN(n)) return "0";
  return n.toLocaleString("ar-SA", { maximumFractionDigits: d });
}

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

type MonthlyVals = Record<string, Record<number, number>>;

// ─── CostSection (supports actual vs planned) ─────────────────────────────────
function CostSection({ title, hint, color, items, values, onChange, plannedValues, onChangePlanned, showActualVsPlanned }: {
  title: string; hint: string; color: string;
  items: { id: string; label: string }[];
  values: Record<string, number>;
  onChange: (id: string, v: string) => void;
  plannedValues?: Record<string, number>;
  onChangePlanned?: (id: string, v: string) => void;
  showActualVsPlanned?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const total = items.reduce((s, i) => s + (values[i.id] || 0), 0);
  const plannedTotal = plannedValues ? items.reduce((s, i) => s + (plannedValues[i.id] || 0), 0) : 0;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${color}40` }}>
      <button className="w-full px-4 py-3 flex items-center justify-between" style={{ background: `${color}15` }}
        onClick={() => setOpen(o => !o)}>
        <div>
          <p className="text-xs font-bold text-right" style={{ fontFamily: F, color }}>{title}</p>
          <p className="text-[9px] text-right" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{hint}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black" style={{ fontFamily: FS, color }}>{fmt(total)} ر.س</span>
          <span style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="divide-y" style={{ borderTop: `1px solid ${color}20` }}>
          {showActualVsPlanned && (
            <div className="px-4 py-2 grid gap-2" style={{ background: "var(--secondary)", gridTemplateColumns: "1fr 90px 90px 80px" }}>
              <span className="text-[9px] font-bold" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>البند</span>
              <span className="text-[9px] font-bold text-center" style={{ fontFamily: F, color: "var(--success)" }}>فعلي</span>
              <span className="text-[9px] font-bold text-center" style={{ fontFamily: F, color: "oklch(0.72 0.15 55)" }}>مخطط</span>
              <span className="text-[9px] font-bold text-center" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>الفرق</span>
            </div>
          )}
          {items.map(item => {
            const actual = values[item.id] || 0;
            const planned = plannedValues?.[item.id] || 0;
            const diff = actual - planned;
            return (
              <div key={item.id} className="px-4 py-2.5 flex items-center gap-3" style={{ background: "var(--card)" }}>
                <span className="text-xs flex-1" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{item.label}</span>
                <input type="number" min="0" value={actual || ""} onChange={e => onChange(item.id, e.target.value)} placeholder="0"
                  style={{ width: "90px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "4px 8px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.7rem" }} />
                {showActualVsPlanned && onChangePlanned && (
                  <>
                    <input type="number" min="0" value={planned || ""} onChange={e => onChangePlanned(item.id, e.target.value)} placeholder="0"
                      style={{ width: "90px", background: "var(--secondary)", border: `1px solid ${"oklch(0.72 0.15 55)"}40`, borderRadius: "8px", padding: "4px 8px", color: "oklch(0.72 0.15 55)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.7rem" }} />
                    <span className="text-[10px] font-bold w-20 text-center" style={{ fontFamily: F, color: diff > 0 ? "oklch(0.60 0.20 15)" : diff < 0 ? "var(--success)" : "var(--muted-foreground)" }}>
                      {diff > 0 ? `+${fmt(diff)}` : diff < 0 ? `-${fmt(Math.abs(diff))}` : "—"}
                    </span>
                  </>
                )}
              </div>
            );
          })}
          {showActualVsPlanned && plannedValues && (
            <div className="px-4 py-2 flex items-center gap-3" style={{ background: `${color}10` }}>
              <span className="text-xs font-bold flex-1" style={{ fontFamily: F, color }}>إجمالي {title}</span>
              <span className="text-xs font-bold w-[90px] text-center" style={{ fontFamily: FS, color: "var(--success)" }}>{fmt(total)}</span>
              <span className="text-xs font-bold w-[90px] text-center" style={{ fontFamily: FS, color: "oklch(0.72 0.15 55)" }}>{fmt(plannedTotal)}</span>
              <span className="text-[10px] font-bold w-20 text-center" style={{ fontFamily: F, color: (total - plannedTotal) > 0 ? "oklch(0.60 0.20 15)" : "var(--success)" }}>
                {total - plannedTotal > 0 ? `+${fmt(total - plannedTotal)}` : total - plannedTotal < 0 ? `-${fmt(Math.abs(total - plannedTotal))}` : "—"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MonthlyBudgetSection ─────────────────────────────────────────────────────
function MonthlyBudgetSection({ title, hint, color, items, monthlyVals, onChangeMonthly }: {
  title: string; hint: string; color: string;
  items: { id: string; label: string }[];
  monthlyVals: MonthlyVals;
  onChangeMonthly: (id: string, m: number, v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const annualTotal = items.reduce((s, item) =>
    s + MONTHS_AR.reduce((ms, _, mi) => ms + (monthlyVals[item.id]?.[mi] || 0), 0), 0);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${color}40` }}>
      <button className="w-full px-4 py-3 flex items-center justify-between" style={{ background: `${color}15` }}
        onClick={() => setOpen(o => !o)}>
        <div>
          <p className="text-xs font-bold text-right" style={{ fontFamily: F, color }}>{title}</p>
          <p className="text-[9px] text-right" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{hint}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black" style={{ fontFamily: FS, color }}>{fmt(annualTotal)} ر.س</span>
          <span style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ minWidth: "900px", borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "var(--secondary)" }}>
                <th style={{ padding: "6px 12px", textAlign: "right", fontFamily: F, fontSize: "0.65rem", color: "var(--muted-foreground)", position: "sticky", right: 0, background: "var(--secondary)", minWidth: "120px" }}>البند</th>
                {MONTHS_AR.map(m => (
                  <th key={m} style={{ padding: "6px 8px", textAlign: "center", fontFamily: F, fontSize: "0.6rem", color: "var(--muted-foreground)", minWidth: "80px" }}>{m}</th>
                ))}
                <th style={{ padding: "6px 8px", textAlign: "center", fontFamily: F, fontSize: "0.65rem", color: "var(--success)", minWidth: "90px" }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const rowTotal = MONTHS_AR.reduce((s, _, mi) => s + (monthlyVals[item.id]?.[mi] || 0), 0);
                return (
                  <tr key={item.id} style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                    <td style={{ padding: "5px 12px", fontFamily: F, fontSize: "0.65rem", color: "var(--muted-foreground)", background: "var(--card)", position: "sticky", right: 0 }}>{item.label}</td>
                    {MONTHS_AR.map((_, mi) => (
                      <td key={mi} style={{ padding: "4px 4px", background: "var(--card)" }}>
                        <input type="number" min="0" value={monthlyVals[item.id]?.[mi] || ""}
                          onChange={e => onChangeMonthly(item.id, mi, e.target.value)} placeholder="0"
                          style={{ width: "72px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "3px 6px", color: "var(--foreground)", fontFamily: F, fontSize: "11px", outline: "none", direction: "ltr" }} />
                      </td>
                    ))}
                    <td style={{ padding: "5px 8px", textAlign: "center", fontFamily: FS, fontSize: "0.7rem", color, fontWeight: 700, background: "var(--card)" }}>{fmt(rowTotal)}</td>
                  </tr>
                );
              })}
              <tr style={{ background: "var(--secondary)", borderTop: `2px solid ${color}40` }}>
                <td style={{ padding: "6px 12px", fontFamily: F, fontSize: "0.65rem", fontWeight: 700, color: "var(--foreground)" }}>الإجمالي الشهري</td>
                {MONTHS_AR.map((_, mi) => {
                  const colTotal = items.reduce((s, item) => s + (monthlyVals[item.id]?.[mi] || 0), 0);
                  return (
                    <td key={mi} style={{ padding: "6px 8px", textAlign: "center", fontFamily: FS, fontSize: "0.7rem", color, fontWeight: 700 }}>{fmt(colTotal)}</td>
                  );
                })}
                <td style={{ padding: "6px 8px", textAlign: "center", fontFamily: FS, fontSize: "0.75rem", color: "var(--success)", fontWeight: 700 }}>{fmt(annualTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── HR Indicators ────────────────────────────────────────────────────────────
function HRIndicators({ grandTotal, totalStrategic }: { grandTotal: number; totalStrategic: number }) {
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [hrHeadcount, setHrHeadcount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const [totalSalaries, setTotalSalaries] = useState(0);

  const costPerEmp = totalEmployees > 0 ? grandTotal / totalEmployees : 0;
  const hrRatio = totalEmployees > 0 && hrHeadcount > 0 ? totalEmployees / hrHeadcount : 0;
  const hrCostPct = totalRevenue > 0 ? (grandTotal / totalRevenue * 100) : 0;
  const trainingPct = grandTotal > 0 ? (totalStrategic / grandTotal * 100) : 0;
  const hrToSalaryPct = totalSalaries > 0 ? (grandTotal / totalSalaries * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--primary)"}40` }}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} style={{ color: "var(--primary)" }} />
          <span className="text-xs font-bold" style={{ fontFamily: F, color: "var(--primary)" }}>مؤشرات الموارد البشرية (HR KPIs)</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "إجمالي الموظفين", val: totalEmployees, set: setTotalEmployees, hint: "لحساب التكلفة/موظف" },
            { label: "عدد موظفي HR", val: hrHeadcount, set: setHrHeadcount, hint: "لحساب نسبة HR" },
            { label: "الإيرادات الشهرية (ر.س)", val: totalRevenue, set: setTotalRevenue, hint: "لحساب % تكلفة HR" },
            { label: "إجمالي الرواتب الشهرية (ر.س)", val: totalSalaries, set: setTotalSalaries, hint: "لحساب نسبة HR/رواتب" },
          ].map(({ label, val, set: setter, hint }) => (
            <div key={label}>
              <p className="text-[9px] mb-0.5" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</p>
              <p className="text-[8px] mb-1" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{hint}</p>
              <input type="number" min="0" value={val || ""} onChange={ev => setter(parseFloat(ev.target.value) || 0)} placeholder="0"
                style={{ width: "100%", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "5px 8px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.7rem" }} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "تكلفة HR / موظف", val: fmt(costPerEmp) + " ر.س", color: "oklch(0.60 0.18 200)", show: totalEmployees > 0 },
            { label: "نسبة HR (1:X)", val: hrRatio > 0 ? `1 : ${fmtD(hrRatio)}` : "—", color: "var(--primary)", show: hrHeadcount > 0 && totalEmployees > 0 },
            { label: "تكلفة HR % إيرادات", val: hrCostPct > 0 ? `${fmtD(hrCostPct)}%` : "—", color: "oklch(0.65 0.18 55)", show: totalRevenue > 0 },
            { label: "% الاستثمار الاستراتيجي", val: `${fmtD(trainingPct)}%`, color: "var(--success)", show: grandTotal > 0 },
            { label: "تكاليف HR % من الرواتب", val: hrToSalaryPct > 0 ? `${fmtD(hrToSalaryPct)}%` : "—", color: "oklch(0.72 0.15 55)", show: totalSalaries > 0 },
          ].map(({ label, val, color, show }) => (
            <div key={label} className="rounded-lg p-2 text-center" style={{ background: "var(--secondary)", border: `1px solid ${show ? color : "var(--border)"}40`, opacity: show ? 1 : 0.5 }}>
              <p className="text-xs font-bold" style={{ fontFamily: FS, color: show ? color : "var(--muted-foreground)" }}>{val}</p>
              <p className="text-[9px] mt-0.5" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 rounded-lg" style={{ background: "var(--secondary)" }}>
          <p className="text-[9px] leading-relaxed" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>
            <strong style={{ color: "var(--muted-foreground)" }}>معايير SHRM:</strong> نسبة HR المثلى 1:100-150 موظف | تكلفة HR لا تتجاوز 5-8% من الإيرادات | الاستثمار الاستراتيجي يُنصح بـ 10-15% من إجمالي تكاليف HR
          </p>
        </div>
      </div>
      {grandTotal === 0 && (
        <div className="rounded-xl p-4 text-center" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
          <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>أدخل بيانات التكاليف في تبويب "الموازنة الشهرية" أولاً لتفعيل المؤشرات</p>
        </div>
      )}
    </div>
  );
}

// ─── Year Comparison ──────────────────────────────────────────────────────────
function YearComparison() {
  const YEAR = new Date().getFullYear();
  const [years, setYears] = useState([
    { year: YEAR - 1, capital: 0, opex: 0, strategic: 0 },
    { year: YEAR, capital: 0, opex: 0, strategic: 0 },
    { year: YEAR + 1, capital: 0, opex: 0, strategic: 0 },
  ]);

  const updateYear = (idx: number, field: "capital" | "opex" | "strategic", val: string) => {
    setYears(p => p.map((y, i) => i === idx ? { ...y, [field]: parseFloat(val) || 0 } : y));
  };

  const totals = years.map(y => y.capital + y.opex + y.strategic);

  function exportYearExcel() {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [
      ["مقارنة تكاليف الموارد البشرية عبر السنوات"],
      [],
      ["البند", ...years.map(y => y.year.toString())],
      ["التكاليف الرأسمالية", ...years.map(y => y.capital)],
      ["المصروفات التشغيلية", ...years.map(y => y.opex)],
      ["المصروفات الاستراتيجية", ...years.map(y => y.strategic)],
      ["الإجمالي السنوي", ...totals],
      [],
      ["نسبة التغيير (سنة لسنة)", ...totals.map((t, i) =>
        i === 0 ? "—" : totals[i - 1] > 0 ? `${((t - totals[i - 1]) / totals[i - 1] * 100).toFixed(1)}%` : "—")],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 30 }, ...years.map(() => ({ wch: 20 }))];
    XLSX.utils.book_append_sheet(wb, ws, "مقارنة السنوات");
    XLSX.writeFile(wb, "hr-cost-year-comparison.xlsx");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
        <p className="text-xs font-bold mb-3" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>أدخل تكاليف كل سنة (سنوي)</p>
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--secondary)" }}>
                <th style={{ padding: "8px 12px", textAlign: "right", fontFamily: F, fontSize: "0.65rem", color: "var(--muted-foreground)" }}>البند</th>
                {years.map(y => (
                  <th key={y.year} style={{ padding: "8px 12px", textAlign: "center", fontFamily: F, fontSize: "0.65rem", color: "var(--primary)" }}>{y.year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { field: "capital" as const, label: "التكاليف الرأسمالية", color: "oklch(0.60 0.18 200)" },
                { field: "opex" as const, label: "المصروفات التشغيلية", color: "oklch(0.65 0.18 55)" },
                { field: "strategic" as const, label: "المصروفات الاستراتيجية", color: "var(--primary)" },
              ].map(({ field, label, color }) => (
                <tr key={field} style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                  <td style={{ padding: "8px 12px", fontFamily: F, fontSize: "0.7rem", color }}>{label}</td>
                  {years.map((y, idx) => (
                    <td key={idx} style={{ padding: "6px 8px", textAlign: "center" }}>
                      <input type="number" min="0" value={y[field] || ""} onChange={ev => updateYear(idx, field, ev.target.value)} placeholder="0"
                        style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "5px 8px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.7rem" }} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid ${"var(--primary)"}40`, background: `${"var(--primary)"}10` }}>
                <td style={{ padding: "8px 12px", fontFamily: F, fontSize: "0.7rem", fontWeight: 700, color: "var(--foreground)" }}>الإجمالي السنوي</td>
                {totals.map((t, idx) => (
                  <td key={idx} style={{ padding: "8px 12px", textAlign: "center", fontFamily: FS, fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>{fmt(t)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {totals.some(t => t > 0) && (
        <>
          <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
            <p className="text-xs font-bold mb-3" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>المقارنة البيانية</p>
            <div className="space-y-3">
              {years.map((y, idx) => (
                <div key={y.year}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-bold" style={{ fontFamily: F, color: "var(--primary)" }}>{y.year}</span>
                    <span className="text-[10px]" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{fmt(totals[idx])} ر.س</span>
                  </div>
                  <div className="h-5 rounded-full overflow-hidden flex" style={{ background: "var(--secondary)" }}>
                    {[
                      { val: y.capital, color: "oklch(0.60 0.18 200)" },
                      { val: y.opex, color: "oklch(0.65 0.18 55)" },
                      { val: y.strategic, color: "var(--primary)" },
                    ].map(({ val, color }, si) => (
                      <div key={si} className="h-full transition-all duration-500"
                        style={{ width: `${totals[idx] > 0 ? (val / totals[idx] * 100) : 0}%`, background: color }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3">
              {[
                { label: "رأسمالية", color: "oklch(0.60 0.18 200)" },
                { label: "تشغيلية", color: "oklch(0.65 0.18 55)" },
                { label: "استراتيجية", color: "var(--primary)" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-[9px]" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
            <p className="text-xs font-bold mb-3" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>نسبة التغيير السنوي</p>
            {years.map((y, idx) => {
              if (idx === 0) return null;
              const prev = totals[idx - 1];
              const curr = totals[idx];
              const change = prev > 0 ? ((curr - prev) / prev * 100) : 0;
              return (
                <div key={y.year} className="flex justify-between items-center py-2" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                  <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{years[idx - 1].year} → {y.year}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ fontFamily: FS, color: change > 0 ? "oklch(0.60 0.20 15)" : change < 0 ? "var(--success)" : "var(--muted-foreground)" }}>
                      {change > 0 ? `+${fmtD(change)}%` : change < 0 ? `${fmtD(change)}%` : "—"}
                    </span>
                    <span className="text-[9px]" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>
                      ({change > 0 ? "زيادة" : change < 0 ? "انخفاض" : "لا تغيير"})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <button onClick={exportYearExcel}
        className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
        style={{ fontFamily: F, background: "var(--success)", color: "white" }}>
        <Download size={13} /> تصدير مقارنة السنوات Excel
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const LS_KEY = "hr_cost_data_v1";

export default function HRCostPage() {
  const [, navigate] = useLocation();
  const { t } = useLang();

  const { data: hrCostData } = api.hrCost.getAll.useQuery();
  const hrSections = useMemo(() => (hrCostData as any) ?? {}, [hrCostData]);
  const sections = hrSections?.sections ?? [];
  const CAPITAL_ITEMS = useMemo(() => sections[0]?.items ?? [], [sections]);
  const OPEX_ITEMS = useMemo(() => sections[1]?.items ?? [], [sections]);
  const STRATEGIC_ITEMS = useMemo(() => sections[2]?.items ?? [], [sections]);
  const ALL_SECTIONS = useMemo(() => [
    { key: "capital", title: sections[0]?.title ?? "", color: "oklch(0.60 0.18 200)", items: CAPITAL_ITEMS },
    { key: "opex", title: sections[1]?.title ?? "", color: "oklch(0.65 0.18 55)", items: OPEX_ITEMS },
    { key: "strategic", title: sections[2]?.title ?? "", color: "var(--primary)", items: STRATEGIC_ITEMS },
  ], [sections, CAPITAL_ITEMS, OPEX_ITEMS, STRATEGIC_ITEMS]);

  const [tab, setTab] = useState<"monthly" | "budget" | "indicators" | "years">("monthly");
  const [showActualVsPlanned, setShowActualVsPlanned] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Monthly (single value per item)
  const [capitalVals, setCapitalVals] = useState<Record<string, number>>({});
  const [opexVals, setOpexVals] = useState<Record<string, number>>({});
  const [strategicVals, setStrategicVals] = useState<Record<string, number>>({});

  // Planned values for actual vs planned
  const [capitalPlanned, setCapitalPlanned] = useState<Record<string, number>>({});
  const [opexPlanned, setOpexPlanned] = useState<Record<string, number>>({});
  const [strategicPlanned, setStrategicPlanned] = useState<Record<string, number>>({});

  // Annual budget (per month per item)
  const [capitalMonthly, setCapitalMonthly] = useState<MonthlyVals>({});
  const [opexMonthly, setOpexMonthly] = useState<MonthlyVals>({});
  const [strategicMonthly, setStrategicMonthly] = useState<MonthlyVals>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.capitalVals) setCapitalVals(d.capitalVals);
        if (d.opexVals) setOpexVals(d.opexVals);
        if (d.strategicVals) setStrategicVals(d.strategicVals);
        if (d.capitalPlanned) setCapitalPlanned(d.capitalPlanned);
        if (d.opexPlanned) setOpexPlanned(d.opexPlanned);
        if (d.strategicPlanned) setStrategicPlanned(d.strategicPlanned);
        if (d.capitalMonthly) setCapitalMonthly(d.capitalMonthly);
        if (d.opexMonthly) setOpexMonthly(d.opexMonthly);
        if (d.strategicMonthly) setStrategicMonthly(d.strategicMonthly);
      }
    } catch { /* ignore */ }
  }, []);

  const saveToLocalStorage = useCallback(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        capitalVals, opexVals, strategicVals,
        capitalPlanned, opexPlanned, strategicPlanned,
        capitalMonthly, opexMonthly, strategicMonthly,
      }));
      setSavedMsg("تم الحفظ ✓");
      setTimeout(() => setSavedMsg(""), 2000);
    } catch { /* ignore */ }
  }, [capitalVals, opexVals, strategicVals, capitalPlanned, opexPlanned, strategicPlanned, capitalMonthly, opexMonthly, strategicMonthly]);

  const clearAll = useCallback(() => {
    if (!confirm("هل تريد مسح جميع البيانات؟")) return;
    setCapitalVals({}); setOpexVals({}); setStrategicVals({});
    setCapitalPlanned({}); setOpexPlanned({}); setStrategicPlanned({});
    setCapitalMonthly({}); setOpexMonthly({}); setStrategicMonthly({});
    localStorage.removeItem(LS_KEY);
  }, []);

  const updCapital = (id: string, v: string) => setCapitalVals(p => ({ ...p, [id]: parseFloat(v) || 0 }));
  const updOpex = (id: string, v: string) => setOpexVals(p => ({ ...p, [id]: parseFloat(v) || 0 }));
  const updStrategic = (id: string, v: string) => setStrategicVals(p => ({ ...p, [id]: parseFloat(v) || 0 }));
  const updCapitalP = (id: string, v: string) => setCapitalPlanned(p => ({ ...p, [id]: parseFloat(v) || 0 }));
  const updOpexP = (id: string, v: string) => setOpexPlanned(p => ({ ...p, [id]: parseFloat(v) || 0 }));
  const updStrategicP = (id: string, v: string) => setStrategicPlanned(p => ({ ...p, [id]: parseFloat(v) || 0 }));
  const updCapitalM = (id: string, m: number, v: string) => setCapitalMonthly(p => ({ ...p, [id]: { ...p[id], [m]: parseFloat(v) || 0 } }));
  const updOpexM = (id: string, m: number, v: string) => setOpexMonthly(p => ({ ...p, [id]: { ...p[id], [m]: parseFloat(v) || 0 } }));
  const updStrategicM = (id: string, m: number, v: string) => setStrategicMonthly(p => ({ ...p, [id]: { ...p[id], [m]: parseFloat(v) || 0 } }));

  const totalCapital = useMemo(() => CAPITAL_ITEMS.reduce((s: number, i: { id: string; label: string }) => s + (capitalVals[i.id] || 0), 0), [capitalVals, CAPITAL_ITEMS]);
  const totalOpex = useMemo(() => OPEX_ITEMS.reduce((s: number, i: { id: string; label: string }) => s + (opexVals[i.id] || 0), 0), [opexVals, OPEX_ITEMS]);
  const totalStrategic = useMemo(() => STRATEGIC_ITEMS.reduce((s: number, i: { id: string; label: string }) => s + (strategicVals[i.id] || 0), 0), [strategicVals, STRATEGIC_ITEMS]);
  const grandTotal = totalCapital + totalOpex + totalStrategic;

  const totalCapitalP = useMemo(() => CAPITAL_ITEMS.reduce((s: number, i: { id: string; label: string }) => s + (capitalPlanned[i.id] || 0), 0), [capitalPlanned, CAPITAL_ITEMS]);
  const totalOpexP = useMemo(() => OPEX_ITEMS.reduce((s: number, i: { id: string; label: string }) => s + (opexPlanned[i.id] || 0), 0), [opexPlanned, OPEX_ITEMS]);
  const totalStrategicP = useMemo(() => STRATEGIC_ITEMS.reduce((s: number, i: { id: string; label: string }) => s + (strategicPlanned[i.id] || 0), 0), [strategicPlanned, STRATEGIC_ITEMS]);
  const grandTotalP = totalCapitalP + totalOpexP + totalStrategicP;

  const budgetTotal = useMemo(() => {
    const allItems = [...CAPITAL_ITEMS, ...OPEX_ITEMS, ...STRATEGIC_ITEMS];
    const allVals = { ...capitalMonthly, ...opexMonthly, ...strategicMonthly };
    return allItems.reduce((s: number, item: { id: string; label: string }) =>
      s + MONTHS_AR.reduce((ms: number, _: string, mi: number) => ms + (allVals[item.id]?.[mi] || 0), 0), 0);
  }, [capitalMonthly, opexMonthly, strategicMonthly, CAPITAL_ITEMS, OPEX_ITEMS, STRATEGIC_ITEMS]);

  const pct = (v: number) => grandTotal > 0 ? (v / grandTotal * 100).toFixed(1) : "0.0";

  function exportMonthlyExcel() {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [
      ["حاسبة تكاليف الموارد البشرية — الموازنة الشهرية"],
      [],
      showActualVsPlanned
        ? ["القسم", "البند", "فعلي (ر.س/شهر)", "مخطط (ر.س/شهر)", "الفرق", "فعلي سنوي", "مخطط سنوي"]
        : ["القسم", "البند", "المبلغ الشهري (ر.س)", "المبلغ السنوي (ر.س)"],
    ];
    ALL_SECTIONS.forEach((sec: any) => {
      sec.items.forEach((item: any) => {
        const vals = sec.key === "capital" ? capitalVals : sec.key === "opex" ? opexVals : strategicVals;
        const planned = sec.key === "capital" ? capitalPlanned : sec.key === "opex" ? opexPlanned : strategicPlanned;
        const v = vals[item.id] || 0;
        const p = planned[item.id] || 0;
        if (showActualVsPlanned) {
          rows.push([sec.title, item.label, v, p, v - p, v * 12, p * 12]);
        } else {
          rows.push([sec.title, item.label, v, v * 12]);
        }
      });
      const secTotal = sec.items.reduce((s: number, i: any) => {
        const vals = sec.key === "capital" ? capitalVals : sec.key === "opex" ? opexVals : strategicVals;
        return s + (vals[i.id] || 0);
      }, 0);
      rows.push([`إجمالي ${sec.title}`, "", secTotal, secTotal * 12]);
      rows.push([]);
    });
    rows.push(["الإجمالي الكلي", "", grandTotal, grandTotal * 12]);
    if (showActualVsPlanned) {
      rows.push(["الإجمالي المخطط", "", grandTotalP, grandTotalP * 12]);
      rows.push(["الفرق الكلي", "", grandTotal - grandTotalP, (grandTotal - grandTotalP) * 12]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, "الموازنة الشهرية");
    XLSX.writeFile(wb, "hr-cost-monthly.xlsx");
  }

  function exportBudgetExcel() {
    const wb = XLSX.utils.book_new();
    ALL_SECTIONS.forEach((sec: any) => {
      const allVals = sec.key === "capital" ? capitalMonthly : sec.key === "opex" ? opexMonthly : strategicMonthly;
      const rows: (string | number)[][] = [
        [sec.title],
        ["البند", ...MONTHS_AR, "الإجمالي السنوي"],
      ];
      sec.items.forEach((item: any) => {
        const monthVals = MONTHS_AR.map((_, mi) => allVals[item.id]?.[mi] || 0);
        const rowTotal = monthVals.reduce((s: number, v: number) => s + v, 0);
        rows.push([item.label, ...monthVals, rowTotal]);
      });
      const colTotals = MONTHS_AR.map((_, mi) =>
        sec.items.reduce((s: number, item: any) => s + (allVals[item.id]?.[mi] || 0), 0));
      rows.push(["الإجمالي الشهري", ...colTotals, colTotals.reduce((s, v) => s + v, 0)]);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{ wch: 30 }, ...MONTHS_AR.map(() => ({ wch: 12 })), { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws, sec.title.substring(0, 31));
    });
    XLSX.writeFile(wb, "hr-budget-annual.xlsx");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--card)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-2"
        style={{ background: "var(--card)", borderBottom: `1px solid ${"var(--border)"}` }}>
        <button onClick={() => navigate("/")} className="p-1.5 rounded-lg"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
          <ArrowRight size={14} />
        </button>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--primary)" }}>
          <BarChart3 size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate" style={{ fontFamily: FS, color: "var(--muted-foreground)" }}>
            {t("حاسبة تكاليف الموارد البشرية", "HR Cost Calculator")}
          </h1>
          <p className="text-[9px]" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>
            {t("رأسمالية + تشغيلية + استراتيجية", "Capital + Operational + Strategic")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {savedMsg && (
            <span className="text-[9px] font-bold hidden sm:inline" style={{ fontFamily: F, color: "var(--success)" }}>{savedMsg}</span>
          )}
          <button onClick={saveToLocalStorage}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: `${"var(--success)"}20`, color: "var(--success)", border: `1px solid ${"var(--success)"}40`, fontFamily: F }}>
            <Save size={11} />
          </button>
          <button onClick={clearAll}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: `${"oklch(0.60 0.20 15)"}20`, color: "oklch(0.60 0.20 15)", border: `1px solid ${"oklch(0.60 0.20 15)"}40`, fontFamily: F }}>
            <RotateCcw size={11} />
          </button>
          <button
            onClick={tab === "monthly" ? exportMonthlyExcel : exportBudgetExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: "var(--success)", color: "white", fontFamily: F, opacity: (tab === "indicators" || tab === "years") ? 0.4 : 1 }}
            disabled={tab === "indicators" || tab === "years"}>
            <Download size={12} />
            {t("Excel", "Excel")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 flex flex-wrap gap-2 max-w-3xl mx-auto">
        {[
          { key: "monthly" as const, label: "الموازنة الشهرية", icon: <BarChart3 size={12} /> },
          { key: "budget" as const, label: "الموازنة السنوية", icon: <Calendar size={12} /> },
          { key: "indicators" as const, label: "مؤشرات HR", icon: <TrendingUp size={12} /> },
          { key: "years" as const, label: "مقارنة السنوات", icon: <Users size={12} /> },
        ].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: tab === key ? "var(--primary)" : "var(--card)",
              color: tab === key ? "white" : "var(--muted-foreground)",
              border: `1px solid ${tab === key ? "var(--primary)" : "var(--border)"}`,
              fontFamily: F,
            }}>
            {icon}{label}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {tab === "monthly" ? (
          <>
            {/* فعلي vs مخطط toggle */}
            <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
              <div>
                <p className="text-xs font-bold" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>مقارنة فعلي vs مخطط</p>
                <p className="text-[9px]" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>تفعيل لإضافة عمود التكاليف المخططة</p>
              </div>
              <button onClick={() => setShowActualVsPlanned(p => !p)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ fontFamily: F, background: showActualVsPlanned ? "oklch(0.72 0.15 55)" : "var(--secondary)", color: showActualVsPlanned ? "white" : "var(--muted-foreground)", border: `1px solid ${showActualVsPlanned ? "oklch(0.72 0.15 55)" : "var(--border)"}` }}>
                {showActualVsPlanned ? "مفعّل ✓" : "تفعيل"}
              </button>
            </div>

            {/* فعلي vs مخطط summary */}
            {showActualVsPlanned && grandTotalP > 0 && (
              <div className="rounded-xl p-4" style={{ background: `${"oklch(0.72 0.15 55)"}15`, border: `1px solid ${"oklch(0.72 0.15 55)"}40` }}>
                <p className="text-xs font-bold mb-2" style={{ fontFamily: F, color: "oklch(0.72 0.15 55)" }}>ملخص فعلي مقابل مخطط</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "فعلي / شهر", val: grandTotal, color: "var(--primary)" },
                    { label: "مخطط / شهر", val: grandTotalP, color: "oklch(0.72 0.15 55)" },
                    { label: "الفرق", val: grandTotal - grandTotalP, color: (grandTotal - grandTotalP) > 0 ? "oklch(0.60 0.20 15)" : "var(--success)" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="rounded-lg p-2 text-center" style={{ background: "var(--secondary)" }}>
                      <p className="text-sm font-black" style={{ fontFamily: FS, color }}>{fmt(Math.abs(val))}</p>
                      <p className="text-[9px]" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label} ر.س</p>
                    </div>
                  ))}
                </div>
                {grandTotalP > 0 && (
                  <p className="text-[9px] mt-2" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>
                    {grandTotal > grandTotalP
                      ? `⚠️ تجاوز الميزانية بنسبة ${((grandTotal - grandTotalP) / grandTotalP * 100).toFixed(1)}%`
                      : `✅ ضمن الميزانية — وفّرت ${((grandTotalP - grandTotal) / grandTotalP * 100).toFixed(1)}%`}
                  </p>
                )}
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "الإجمالي الشهري", val: grandTotal, color: "var(--primary)" },
                { label: "الإجمالي السنوي", val: grandTotal * 12, color: "var(--success)" },
                { label: "رأسمالية", val: totalCapital, color: "oklch(0.60 0.18 200)" },
                { label: "تشغيلية + استراتيجية", val: totalOpex + totalStrategic, color: "oklch(0.65 0.18 55)" },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--card)", border: `1px solid ${color}40` }}>
                  <p className="text-xl font-black" style={{ fontFamily: FS, color }}>{fmt(val)}</p>
                  <p className="text-[9px] mt-0.5" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label} ر.س</p>
                </div>
              ))}
            </div>

            {/* توزيع نسبي */}
            {grandTotal > 0 && (
              <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
                <p className="text-xs font-bold mb-3" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>التوزيع النسبي للتكاليف</p>
                {[
                  { label: "رأسمالية", val: totalCapital, color: "oklch(0.60 0.18 200)" },
                  { label: "تشغيلية", val: totalOpex, color: "oklch(0.65 0.18 55)" },
                  { label: "استراتيجية", val: totalStrategic, color: "var(--primary)" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="mb-2">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[10px]" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</span>
                      <span className="text-[10px] font-bold" style={{ fontFamily: F, color }}>{pct(val)}% — {fmt(val)} ر.س</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct(val)}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <CostSection title="التكاليف الرأسمالية" hint="الأصول والبنية التحتية والمرافق"
              color={"oklch(0.60 0.18 200)"} items={CAPITAL_ITEMS} values={capitalVals} onChange={updCapital}
              plannedValues={showActualVsPlanned ? capitalPlanned : undefined}
              onChangePlanned={showActualVsPlanned ? updCapitalP : undefined}
              showActualVsPlanned={showActualVsPlanned} />
            <CostSection title="المصروفات التشغيلية" hint="التكاليف الجارية اليومية والشهرية"
              color={"oklch(0.65 0.18 55)"} items={OPEX_ITEMS} values={opexVals} onChange={updOpex}
              plannedValues={showActualVsPlanned ? opexPlanned : undefined}
              onChangePlanned={showActualVsPlanned ? updOpexP : undefined}
              showActualVsPlanned={showActualVsPlanned} />
            <CostSection title="المصروفات الاستراتيجية" hint="الاستثمار في رأس المال البشري"
              color={"var(--primary)"} items={STRATEGIC_ITEMS} values={strategicVals} onChange={updStrategic}
              plannedValues={showActualVsPlanned ? strategicPlanned : undefined}
              onChangePlanned={showActualVsPlanned ? updStrategicP : undefined}
              showActualVsPlanned={showActualVsPlanned} />

            {grandTotal > 0 && (
              <div className="rounded-xl p-4" style={{ background: `${"var(--primary)"}15`, border: `1px solid ${"var(--primary)"}50` }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold" style={{ fontFamily: F, color: "var(--foreground)" }}>إجمالي تكاليف الموارد البشرية / شهر</span>
                  <span className="text-2xl font-black" style={{ fontFamily: FS, color: "var(--primary)" }}>{fmt(grandTotal)} ر.س</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px]" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>إجمالي سنوي</span>
                  <span className="text-sm font-bold" style={{ fontFamily: F, color: "var(--success)" }}>{fmt(grandTotal * 12)} ر.س</span>
                </div>
              </div>
            )}
          </>
        ) : tab === "budget" ? (
          <>
            <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--success)"}40` }}>
              <p className="text-xs font-bold mb-1" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>
                إجمالي الموازنة السنوية (جميع الأقسام)
              </p>
              <p className="text-3xl font-black" style={{ fontFamily: FS, color: "var(--success)" }}>{fmt(budgetTotal)} ر.س</p>
              <p className="text-[9px] mt-1" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>
                اضغط على كل قسم لإدخال القيم الشهرية — يمكن تصدير الموازنة كملف Excel
              </p>
            </div>
            <MonthlyBudgetSection title="التكاليف الرأسمالية" hint="اضغط لتوسيع جدول الموازنة الشهرية"
              color={"oklch(0.60 0.18 200)"} items={CAPITAL_ITEMS} monthlyVals={capitalMonthly} onChangeMonthly={updCapitalM} />
            <MonthlyBudgetSection title="المصروفات التشغيلية" hint="اضغط لتوسيع جدول الموازنة الشهرية"
              color={"oklch(0.65 0.18 55)"} items={OPEX_ITEMS} monthlyVals={opexMonthly} onChangeMonthly={updOpexM} />
            <MonthlyBudgetSection title="المصروفات الاستراتيجية" hint="اضغط لتوسيع جدول الموازنة الشهرية"
              color={"var(--primary)"} items={STRATEGIC_ITEMS} monthlyVals={strategicMonthly} onChangeMonthly={updStrategicM} />
          </>
        ) : tab === "indicators" ? (
          <HRIndicators grandTotal={grandTotal} totalStrategic={totalStrategic} />
        ) : (
          <YearComparison />
        )}
      </div>
    </div>
  );
}
