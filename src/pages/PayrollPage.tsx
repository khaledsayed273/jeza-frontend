import { useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useExcelBranding } from "../contexts/ExcelBrandingContext";
import { buildStyledSheet } from "../lib/excelUtils";
import * as XLSX from "xlsx";
import { ArrowRight, Download, Plus, Trash2, Printer, RotateCcw, FileSpreadsheet, Calculator } from "lucide-react";
import { api } from "../lib/api";

const LOGO_URL_DEFAULT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663364198732/2vuJLs9j7vTiL4E4emfRJ8/muwakaba_logo_v2-SCNMsUQ2s4hs6UtaXq88Y7.webp";
// --- Theme (فاتح - أبيض) ────────────────────────────────────────────────────────────────────────────────────
const C = {
  bg:       "var(--background)",
  card:     "var(--card)",
  inner:    "var(--secondary)",
  deep:     "color-mix(in oklch, var(--secondary) 80%, var(--background))",
  border:   "var(--border)",
  primary:  "var(--primary)",
  accent:   "var(--primary)",
  green:    "var(--success-strong)",
  teal:     "oklch(0.48 0.16 185)",
  text:     "var(--foreground)",
  sub:      "var(--muted-foreground)",
  muted:    "var(--muted-foreground)",
  dim:      "var(--muted-foreground)",
};

// --- GOSI Rates ──────────────────────────────────────────────────────────────
const GOSI_EMPLOYEE_SAUDI = 0.10; // 9% تقاعد + 1% ادخار
const SANED_EMPLOYEE = 0.01;
const GOSI_EMPLOYEE_NON_SAUDI = 0.02; // ساند فقط

function getEmployeeGosiRate(isSaudi: boolean) {
  return isSaudi ? GOSI_EMPLOYEE_SAUDI + SANED_EMPLOYEE : GOSI_EMPLOYEE_NON_SAUDI;
}

function getEmployerGosiRate(year: number, gosiRatesData?: any): number {
  const rates = gosiRatesData?.rates;
  if (rates) {
    return (rates[year]?.employer ?? 10) / 100;
  }
  return (gosiRatesData?.rates?.[year]?.employer ?? 10) / 100;
}

// --- Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: string | number) => parseFloat(String(v)) || 0;

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const YEARS = [2024, 2025, 2026, 2027, 2028];

// -----------------------------------------------------------------------------
// TAB 1 — مسير الرواتب الجماعي
// -----------------------------------------------------------------------------
interface PayrollRow {
  id: number;
  name: string;
  nationality: "saudi" | "non-saudi";
  customGosiRate: boolean;   // هل يستخدم نسبة مخصصة
  customGosiPct: number;     // النسبة المخصصة للموظف (%)
  basic: number;
  housing: number;
  transport: number;
  otherAllowances: number;
  additions: number;
  otherDeductions: number;
}

let _rowId = 1;
const IHTAR_MIHANI_RATE = 0.02; // 2% إخطار مهني على صاحب العمل

const newRow = (): PayrollRow => ({
  id: _rowId++,
  name: "",
  nationality: "saudi",
  customGosiRate: false,
  customGosiPct: 11.0,
  basic: 0,
  housing: 0,
  transport: 0,
  otherAllowances: 0,
  additions: 0,
  otherDeductions: 0,
});

function calcRow(r: PayrollRow, gosiYear: number, gosiRatesData?: any) {
  const gross = r.basic + r.housing + r.transport + r.otherAllowances + r.additions;
  const gosiBase = r.basic + r.housing + r.transport + r.otherAllowances;
  // نسبة الموظف: إما مخصصة أو تلقائية حسب الجنسية
  const empRate = r.customGosiRate
    ? r.customGosiPct / 100
    : getEmployeeGosiRate(r.nationality === "saudi");
  const gosiDeduction = gosiBase * empRate;
  const totalDeductions = gosiDeduction + r.otherDeductions;
  const net = gross - totalDeductions;
  // حصة صاحب العمل: GOSI + 2% إخطار مهني
  const employerGosiRate = getEmployerGosiRate(gosiYear, gosiRatesData);
  const employerGosi = gosiBase * employerGosiRate;
  const ihtarMihani = gosiBase * IHTAR_MIHANI_RATE; // 2% إخطار مهني
  const totalEmployerCost = gross + employerGosi + ihtarMihani;
  return { gross, gosiBase, gosiDeduction, totalDeductions, net, employerGosi, empRate, ihtarMihani, totalEmployerCost };
}

function PayrollSheet() {
  const { t, lang, dir } = useLang();
  const branding = useExcelBranding();
  const [rows, setRows] = useState<PayrollRow[]>([newRow(), newRow(), newRow()]);
  const [gosiYear, setGosiYear] = useState(2026);
  const [payMonth, setPayMonth] = useState(new Date().getMonth());
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const { data: calculatorData } = api.calculator.getAll.useQuery();
  const gosiRatesData = calculatorData?.gosiRates;

  const calcs = useMemo(() => rows.map(r => calcRow(r, gosiYear, gosiRatesData)), [rows, gosiYear, gosiRatesData]);
  const totals = useMemo(() => calcs.reduce((a, c) => ({
    gross: a.gross + c.gross,
    gosiDeduction: a.gosiDeduction + c.gosiDeduction,
    otherDeductions: a.otherDeductions + rows[calcs.indexOf(c)].otherDeductions,
    net: a.net + c.net,
    employerGosi: a.employerGosi + c.employerGosi,
    ihtarMihani: a.ihtarMihani + c.ihtarMihani,
    totalEmployerCost: a.totalEmployerCost + c.totalEmployerCost,
  }), { gross: 0, gosiDeduction: 0, otherDeductions: 0, net: 0, employerGosi: 0, ihtarMihani: 0, totalEmployerCost: 0 }), [calcs, rows]);

  const addRow = () => setRows(p => [...p, newRow()]);
  const removeRow = (id: number) => setRows(p => p.filter(r => r.id !== id));
  const updateRow = (id: number, field: keyof PayrollRow, value: string | number | boolean) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const headers = ["م","اسم الموظف","الجنسية","الراتب الأساسي","بدل السكن","بدل النقل","بدلات أخرى","إضافات","إجمالي الراتب","الراتب الخاضع للاشتراك","نسبة الموظف","خصم التأمينات","خصومات أخرى","إجمالي الخصومات","صافي الراتب"];
    const data = rows.map((r, i) => {
      const c = calcs[i];
      return [
        i + 1,
        r.name || `موظف ${i + 1}`,
        r.nationality === "saudi" ? "سعودي" : "غير سعودي",
        r.basic, r.housing, r.transport, r.otherAllowances, r.additions,
        c.gross, c.gosiBase,
        `${(c.empRate * 100).toFixed(1)}%`,
        c.gosiDeduction, r.otherDeductions, c.totalDeductions, c.net,
      ];
    });
    data.push(["","","الإجمالي","","","","","",totals.gross,"","",totals.gosiDeduction,totals.otherDeductions,totals.gosiDeduction+totals.otherDeductions,totals.net]);

    // دمج الرأس مع البيانات (التوقيع: data, branding, title, colWidths)
    const colWidths = [4, 18, 8, 10, 10, 10, 10, 10, 12, 12, 8, 12, 12, 14, 12];
    const allRows: (string | number | null)[][] = [headers, ...data];
    const totalIdx = [allRows.length - 1]; // صف الإجمالي
    const ws = buildStyledSheet(allRows, branding, `مسير رواتب ${MONTHS[payMonth]} ${payYear}`, colWidths, totalIdx);
    XLSX.utils.book_append_sheet(wb, ws, "مسير الرواتب");

    // ورقة الملخص
    const summaryData = [
      ["الشهر", `${MONTHS[payMonth]} ${payYear}`],
      ["عدد الموظفين", rows.length],
      ["إجمالي الرواتب", totals.gross],
      ["إجمالي خصم التأمينات (الموظفين)", totals.gosiDeduction],
      ["حصة صاحب العمل (GOSI " + gosiYear + ")", totals.employerGosi],
      ["إخطار مهني 2% (على صاحب العمل)", totals.ihtarMihani],
      ["إجمالي الخصومات الأخرى", totals.otherDeductions],
      ["إجمالي صافي الرواتب", totals.net],
      ["إجمالي تكلفة المنشأة (رواتب + GOSI + إخطار)", totals.totalEmployerCost],
    ];
    const summaryRows: (string | number | null)[][] = [["البند", "القيمة"], ...summaryData];
    const wsSummary = buildStyledSheet(summaryRows, branding, "ملخص مسير الرواتب", [25, 15]);
    XLSX.utils.book_append_sheet(wb, wsSummary, "الملخص");

    XLSX.writeFile(wb, `مسير_رواتب_${MONTHS[payMonth]}_${payYear}.xlsx`);
  }

  const inputStyle = {
    background: C.inner,
    border: `1px solid ${C.border}`,
    color: C.text,
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "12px",
    fontFamily: "'Cairo', sans-serif",
    width: "100%",
    outline: "none",
  };

  return (
    <div>
      {/* ── إعدادات المسير ── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-3" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>إعدادات المسير</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* الشهر */}
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>شهر المسير</label>
            <select value={payMonth} onChange={e => setPayMonth(+e.target.value)} style={inputStyle}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          {/* السنة */}
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>سنة المسير</label>
            <select value={payYear} onChange={e => setPayYear(+e.target.value)} style={inputStyle}>
              {[2024,2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {/* سنة GOSI */}
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>سنة نسبة GOSI</label>
            <select value={gosiYear} onChange={e => setGosiYear(+e.target.value)} style={inputStyle}>
              {YEARS.map(y => <option key={y} value={y}>{y} — {((gosiRatesData?.rates?.[y]?.employer ?? 10)).toFixed(1)}%</option>)}
            </select>
          </div>
          {/* نسبة صاحب العمل */}
          <div className="flex flex-col justify-end">
            <div className="rounded-xl px-3 py-2 text-center" style={{ background: C.inner, border: `1px solid ${C.border}` }}>
              <p className="text-[9px] font-bold" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>حصة صاحب العمل</p>
              <p className="text-base font-black" style={{ color: C.accent, fontFamily: "'Cairo', sans-serif" }}>{((gosiRatesData?.rates?.[gosiYear]?.employer ?? 10)).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── جدول الموظفين ── */}
      <div className="rounded-2xl mb-4 overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
        {/* رأس الجدول */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
          <h3 className="text-sm font-black" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>
            بيانات الموظفين
          </h3>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{ background: C.primary, color: "white", fontFamily: "'Cairo', sans-serif" }}
          >
            <Plus size={12} /> إضافة موظف
          </button>
        </div>

        {/* الصفوف */}
        <div style={{ background: C.bg }}>
          {rows.map((row, idx) => {
            const c = calcs[idx];
            return (
              <div key={row.id} className="px-4 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                {/* صف العنوان */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black" style={{ color: C.accent, fontFamily: "'Cairo', sans-serif" }}>
                    موظف {idx + 1}
                  </span>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(row.id)} className="p-1 rounded-lg transition-all" style={{ color: C.muted }} title="حذف">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* الاسم والجنسية */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>اسم الموظف</label>
                    <input
                      type="text"
                      placeholder="أدخل الاسم"
                      value={row.name}
                      onChange={e => updateRow(row.id, "name", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>الجنسية</label>
                    <select value={row.nationality} onChange={e => updateRow(row.id, "nationality", e.target.value as "saudi" | "non-saudi")} style={inputStyle} disabled={row.customGosiRate}>
                      <option value="saudi">سعودي — {((GOSI_EMPLOYEE_SAUDI+SANED_EMPLOYEE)*100).toFixed(0)}%</option>
                      <option value="non-saudi">غير سعودي — {(GOSI_EMPLOYEE_NON_SAUDI*100).toFixed(0)}%</option>
                    </select>
                  </div>
                </div>
                {/* خصم التأمينات المخصص */}
                <div className="rounded-xl p-3 mb-3" style={{ background: C.inner, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>خصم التأمينات</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.customGosiRate}
                        onChange={e => updateRow(row.id, "customGosiRate", e.target.checked)}
                        style={{ accentColor: C.accent }}
                      />
                      <span className="text-[10px]" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>نسبة مخصصة</span>
                    </label>
                  </div>
                  {row.customGosiRate ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        step={0.5}
                        value={row.customGosiPct}
                        onChange={e => updateRow(row.id, "customGosiPct", num(e.target.value))}
                        style={{ ...inputStyle, width: "80px" }}
                      />
                      <span className="text-[10px]" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>% من الراتب الخاضع للاشتراك</span>
                      <span className="text-[10px] font-black" style={{ color: C.accent, fontFamily: "'Cairo', sans-serif" }}>= {fmt(calcs[idx].gosiDeduction)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black" style={{ color: C.accent, fontFamily: "'Cairo', sans-serif" }}>{(calcs[idx].empRate*100).toFixed(1)}% تلقائي</span>
                      <span className="text-[10px]" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>= {fmt(calcs[idx].gosiDeduction)}</span>
                    </div>
                  )}
                </div>

                {/* الراتب والبدلات */}
                <div className="grid grid-cols-2 gap-3 mb-3 sm:grid-cols-4">
                  {([
                    { label: "الراتب الأساسي", field: "basic" },
                    { label: "بدل السكن", field: "housing" },
                    { label: "بدل النقل", field: "transport" },
                    { label: "بدلات أخرى", field: "otherAllowances" },
                  ] as { label: string; field: "basic" | "housing" | "transport" | "otherAllowances" }[]).map(({ label, field }) => (
                    <div key={field}>
                      <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>{label}</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={(row[field] as number) || ""}
                        onChange={e => updateRow(row.id, field, num(e.target.value))}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>

                {/* إضافات وخصومات */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>إضافات أخرى</label>
                    <input type="number" min={0} placeholder="0" value={row.additions || ""} onChange={e => updateRow(row.id, "additions", num(e.target.value))} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>خصومات أخرى</label>
                    <input type="number" min={0} placeholder="0" value={row.otherDeductions || ""} onChange={e => updateRow(row.id, "otherDeductions", num(e.target.value))} style={inputStyle} />
                  </div>
                </div>

                {/* النتائج */}
                <div className="grid grid-cols-3 gap-2 rounded-xl p-3" style={{ background: C.inner, border: `1px solid ${C.border}` }}>
                  <div className="text-center">
                    <p className="text-[9px] font-bold mb-0.5" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>إجمالي الراتب</p>
                    <p className="text-xs font-black" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>{fmt(c.gross)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold mb-0.5" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>خصم التأمينات ({(c.empRate*100).toFixed(1)}%)</p>
                    <p className="text-xs font-black" style={{ color: "oklch(0.65 0.18 25)", fontFamily: "'Cairo', sans-serif" }}>- {fmt(c.gosiDeduction)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold mb-0.5" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>صافي الراتب</p>
                    <p className="text-xs font-black" style={{ color: C.green, fontFamily: "'Cairo', sans-serif" }}>{fmt(c.net)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* الإجمالي */}
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ background: C.card, borderTop: `1px solid ${C.border}` }}>
          <div className="text-center">
            <p className="text-[9px] font-bold mb-0.5" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>إجمالي الرواتب</p>
            <p className="text-sm font-black" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>{fmt(totals.gross)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold mb-0.5" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>إجمالي الخصومات</p>
            <p className="text-sm font-black" style={{ color: "oklch(0.65 0.18 25)", fontFamily: "'Cairo', sans-serif" }}>{fmt(totals.gosiDeduction + totals.otherDeductions)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold mb-0.5" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>إجمالي صافي الرواتب</p>
            <p className="text-sm font-black" style={{ color: C.green, fontFamily: "'Cairo', sans-serif" }}>{fmt(totals.net)}</p>
          </div>
        </div>
      </div>

      {/* ── حصة صاحب العمل ── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-3" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>تكاليف صاحب العمل الإضافية</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: C.inner, border: `1px solid ${C.border}` }}>
            <p className="text-[9px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>حصة صاحب العمل GOSI {gosiYear}</p>
            <p className="text-xs font-black" style={{ color: C.accent, fontFamily: "'Cairo', sans-serif" }}>{fmt(totals.employerGosi)}</p>
            <p className="text-[9px] mt-0.5" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>{((gosiRatesData?.rates?.[gosiYear]?.employer ?? 10)).toFixed(1)}% من الراتب الخاضع</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "oklch(0.97 0.02 55)", border: `1px solid oklch(0.85 0.08 55)` }}>
            <p className="text-[9px] font-bold mb-1" style={{ color: "oklch(0.45 0.15 55)", fontFamily: "'Cairo', sans-serif" }}>إخطار مهني 2%</p>
            <p className="text-xs font-black" style={{ color: "oklch(0.45 0.15 55)", fontFamily: "'Cairo', sans-serif" }}>{fmt(totals.ihtarMihani)}</p>
            <p className="text-[9px] mt-0.5" style={{ color: "oklch(0.55 0.10 55)", fontFamily: "'Cairo', sans-serif" }}>2% من الراتب الخاضع</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "oklch(0.96 0.03 145)", border: `1px solid oklch(0.82 0.12 145)` }}>
            <p className="text-[9px] font-bold mb-1" style={{ color: "oklch(0.40 0.18 145)", fontFamily: "'Cairo', sans-serif" }}>إجمالي تكلفة المنشأة</p>
            <p className="text-xs font-black" style={{ color: "oklch(0.40 0.18 145)", fontFamily: "'Cairo', sans-serif" }}>{fmt(totals.totalEmployerCost)}</p>
            <p className="text-[9px] mt-0.5" style={{ color: "oklch(0.50 0.12 145)", fontFamily: "'Cairo', sans-serif" }}>رواتب + GOSI + إخطار</p>
          </div>
        </div>
      </div>

      {/* ── زر التصدير ── */}
      <button
        onClick={exportExcel}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all"
        style={{ background: C.green, color: "white", fontFamily: "'Cairo', sans-serif", boxShadow: `0 4px 20px oklch(0.60 0.18 145 / 0.35)` }}
      >
        <Download size={16} />
        تصدير مسير الرواتب Excel
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TAB 2 — الحاسبة الفردية
// -----------------------------------------------------------------------------
function IndividualCalc() {
  const { t, lang } = useLang();
  const printRef = useRef<HTMLDivElement>(null);
  const { data: calculatorData } = api.calculator.getAll.useQuery();
  const gosiRatesData = calculatorData?.gosiRates;

  const [empName, setEmpName] = useState("");
  const [empTitle, setEmpTitle] = useState("");
  const [empId, setEmpId] = useState("");
  const [nationality, setNationality] = useState<"saudi" | "non-saudi">("saudi");
  const [gosiYear, setGosiYear] = useState(2026);

  // أيام العمل
  const [workMode, setWorkMode] = useState<"full" | "partial" | "join">("full");
  const [actualDays, setActualDays] = useState(30);
  const [joinDay, setJoinDay] = useState(1);

  // الراتب الأساسي
  const [basic, setBasic] = useState(0);

  // بدل السكن
  const [housingMode, setHousingMode] = useState<"pct25" | "pct20" | "pct15" | "amount">("pct25");
  const [housingAmount, setHousingAmount] = useState(0);

  // بدل النقل
  const [transportMode, setTransportMode] = useState<"pct20" | "pct15" | "pct10" | "amount">("pct20");
  const [transportAmount, setTransportAmount] = useState(0);

  // بدلات وإضافات وخصومات
  const [otherAllowances, setOtherAllowances] = useState(0);
  const [additions, setAdditions] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);

  // -- حسابات ──
  const workDays = workMode === "full" ? 30 : workMode === "partial" ? actualDays : 30 - joinDay + 1;
  const workRatio = Math.min(workDays / 30, 1);

  const housingCalc = housingMode === "pct25" ? basic * 0.25
    : housingMode === "pct20" ? basic * 0.20
    : housingMode === "pct15" ? basic * 0.15
    : housingAmount;

  const transportCalc = transportMode === "pct20" ? basic * 0.20
    : transportMode === "pct15" ? basic * 0.15
    : transportMode === "pct10" ? basic * 0.10
    : transportAmount;

  const basicPro   = basic * workRatio;
  const housingPro = housingCalc * workRatio;
  const transportPro = transportCalc * workRatio;
  const otherPro   = otherAllowances * workRatio;
  const addPro     = additions * workRatio;

  const gross = basicPro + housingPro + transportPro + otherPro + addPro;
  const gosiBase = basicPro + housingPro + transportPro + otherPro;
  const empRate = getEmployeeGosiRate(nationality === "saudi");
  const gosiDeduction = gosiBase * empRate;
  const totalDeductions = gosiDeduction + otherDeductions;
  const net = gross - totalDeductions;
  const employerGosi = gosiBase * ((gosiRatesData?.rates?.[gosiYear]?.employer ?? 10) / 100);

  const hasResult = basic > 0;

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html dir="rtl"><head><title>قسيمة راتب</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
        body { font-family: 'Cairo', sans-serif; background: #fff; color: #111; margin: 0; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 6px 10px; border: 1px solid #ddd; font-size: 12px; }
        th { background: #f5f5f5; font-weight: 700; }
        .header { text-align: center; margin-bottom: 20px; }
        .total-row { background: var(--secondary); font-weight: 900; }
        .net-row { background: #e8f5e9; font-weight: 900; font-size: 14px; }
        @media print { body { padding: 0; } }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  }

  function handleReset() {
    setEmpName(""); setEmpTitle(""); setEmpId("");
    setNationality("saudi"); setGosiYear(2026);
    setWorkMode("full"); setActualDays(30); setJoinDay(1);
    setBasic(0); setHousingMode("pct25"); setHousingAmount(0);
    setTransportMode("pct20"); setTransportAmount(0);
    setOtherAllowances(0); setAdditions(0); setOtherDeductions(0);
  }

  const inputStyle = {
    background: C.inner,
    border: `1px solid ${C.border}`,
    color: C.text,
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "13px",
    fontFamily: "'Cairo', sans-serif",
    width: "100%",
    outline: "none",
  };

  const segBtn = (active: boolean) => ({
    flex: 1,
    padding: "6px 4px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: 700,
    fontFamily: "'Cairo', sans-serif",
    background: active ? C.primary : "transparent",
    color: active ? "white" : C.muted,
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
      {/* ── العمود الأيمن: الإدخالات ── */}
      <div>
      {/* ── بيانات الموظف ── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-3" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>بيانات الموظف</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>اسم الموظف</label>
            <input type="text" placeholder="الاسم الكامل" value={empName} onChange={e => setEmpName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>المسمى الوظيفي</label>
            <input type="text" placeholder="المسمى" value={empTitle} onChange={e => setEmpTitle(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>رقم الهوية / الإقامة</label>
            <input type="text" placeholder="الرقم" value={empId} onChange={e => setEmpId(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>الجنسية</label>
            <select value={nationality} onChange={e => setNationality(e.target.value as "saudi" | "non-saudi")} style={inputStyle}>
              <option value="saudi">سعودي — خصم {((GOSI_EMPLOYEE_SAUDI+SANED_EMPLOYEE)*100).toFixed(0)}%</option>
              <option value="non-saudi">غير سعودي — خصم {(GOSI_EMPLOYEE_NON_SAUDI*100).toFixed(0)}%</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── أيام العمل ── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-3" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>أيام العمل</h3>
        <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: C.inner, border: `1px solid ${C.border}` }}>
          <button style={segBtn(workMode === "full")} onClick={() => setWorkMode("full")}>كامل الشهر (30)</button>
          <button style={segBtn(workMode === "partial")} onClick={() => setWorkMode("partial")}>أيام فعلية</button>
          <button style={segBtn(workMode === "join")} onClick={() => setWorkMode("join")}>من يوم المباشرة</button>
        </div>
        {workMode === "partial" && (
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>عدد أيام العمل الفعلية</label>
            <input type="number" min={1} max={30} value={actualDays} onChange={e => setActualDays(Math.min(30, Math.max(1, +e.target.value)))} style={inputStyle} />
          </div>
        )}
        {workMode === "join" && (
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>يوم المباشرة (من 1 إلى 30)</label>
            <input type="number" min={1} max={30} value={joinDay} onChange={e => setJoinDay(Math.min(30, Math.max(1, +e.target.value)))} style={inputStyle} />
            <p className="text-[10px] mt-1" style={{ color: C.dim, fontFamily: "'Cairo', sans-serif" }}>
              أيام العمل: {30 - joinDay + 1} يوم (من اليوم {joinDay} حتى نهاية الشهر)
            </p>
          </div>
        )}
        {workMode !== "full" && (
          <div className="mt-2 rounded-xl px-3 py-2 text-center" style={{ background: C.inner, border: `1px solid ${C.border}` }}>
            <span className="text-[10px] font-bold" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>نسبة الأيام: </span>
            <span className="text-sm font-black" style={{ color: C.accent, fontFamily: "'Cairo', sans-serif" }}>
              {workDays}/30 = {(workRatio * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* ── الراتب الأساسي ── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-3" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>الراتب الأساسي</h3>
        <input
          type="number"
          min={0}
          placeholder="أدخل الراتب الأساسي"
          value={basic || ""}
          onChange={e => setBasic(num(e.target.value))}
          style={{ ...inputStyle, fontSize: "16px", fontWeight: 700, textAlign: "center" }}
        />
      </div>

      {/* ── بدل السكن ── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-3" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>بدل السكن</h3>
        <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
          {[
            { key: "pct25", label: "25% من الأساسي", val: basic * 0.25 },
            { key: "pct20", label: "20% من الأساسي", val: basic * 0.20 },
            { key: "pct15", label: "15% من الأساسي", val: basic * 0.15 },
            { key: "amount", label: "مبلغ مخصص", val: housingAmount },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setHousingMode(opt.key as typeof housingMode)}
              className="rounded-xl p-2.5 text-center transition-all"
              style={{
                background: housingMode === opt.key ? C.primary : C.inner,
                border: `1px solid ${housingMode === opt.key ? C.primary : C.border}`,
                color: housingMode === opt.key ? "white" : C.sub,
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              <p className="text-[10px] font-bold">{opt.label}</p>
              {opt.key !== "amount" && basic > 0 && (
                <p className="text-xs font-black mt-0.5">{fmt(opt.val)}</p>
              )}
            </button>
          ))}
        </div>
        {housingMode === "amount" && (
          <input type="number" min={0} placeholder="أدخل مبلغ بدل السكن" value={housingAmount || ""} onChange={e => setHousingAmount(num(e.target.value))} style={inputStyle} />
        )}
        {housingMode !== "amount" && basic > 0 && (
          <div className="rounded-xl px-3 py-2 text-center" style={{ background: C.inner, border: `1px solid ${C.border}` }}>
            <span className="text-[10px] font-bold" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>بدل السكن: </span>
            <span className="text-sm font-black" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>{fmt(housingCalc)} ريال</span>
          </div>
        )}
      </div>

      {/* ── بدل النقل ── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-3" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>بدل النقل</h3>
        <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
          {[
            { key: "pct20", label: "20% من الأساسي", val: basic * 0.20 },
            { key: "pct15", label: "15% من الأساسي", val: basic * 0.15 },
            { key: "pct10", label: "10% من الأساسي", val: basic * 0.10 },
            { key: "amount", label: "مبلغ مخصص", val: transportAmount },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setTransportMode(opt.key as typeof transportMode)}
              className="rounded-xl p-2.5 text-center transition-all"
              style={{
                background: transportMode === opt.key ? C.teal : C.inner,
                border: `1px solid ${transportMode === opt.key ? C.teal : C.border}`,
                color: transportMode === opt.key ? "white" : C.sub,
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              <p className="text-[10px] font-bold">{opt.label}</p>
              {opt.key !== "amount" && basic > 0 && (
                <p className="text-xs font-black mt-0.5">{fmt(opt.val)}</p>
              )}
            </button>
          ))}
        </div>
        {transportMode === "amount" && (
          <input type="number" min={0} placeholder="أدخل مبلغ بدل النقل" value={transportAmount || ""} onChange={e => setTransportAmount(num(e.target.value))} style={inputStyle} />
        )}
        {transportMode !== "amount" && basic > 0 && (
          <div className="rounded-xl px-3 py-2 text-center" style={{ background: C.inner, border: `1px solid ${C.border}` }}>
            <span className="text-[10px] font-bold" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>بدل النقل: </span>
            <span className="text-sm font-black" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>{fmt(transportCalc)} ريال</span>
          </div>
        )}
      </div>

      {/* ── بدلات وإضافات وخصومات إضافية ── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-3" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>بدلات وإضافات وخصومات</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>بدلات أخرى</label>
            <input type="number" min={0} placeholder="0" value={otherAllowances || ""} onChange={e => setOtherAllowances(num(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>إضافات أخرى</label>
            <input type="number" min={0} placeholder="0" value={additions || ""} onChange={e => setAdditions(num(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>خصومات أخرى</label>
            <input type="number" min={0} placeholder="0" value={otherDeductions || ""} onChange={e => setOtherDeductions(num(e.target.value))} style={inputStyle} />
          </div>
        </div>
      </div>

      </div>{/* نهاية العمود الأيمن */}
      {/* ── العمود الأيسر: النتائج ── */}
      <div>
      {/* ── سنة GOSI ── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-black mb-3" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>سنة نسبة التأمينات (GOSI)</h3>
        <div className="flex gap-2 flex-wrap">
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => setGosiYear(y)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: gosiYear === y ? C.primary : C.inner,
                border: `1px solid ${gosiYear === y ? C.primary : C.border}`,
                color: gosiYear === y ? "white" : C.muted,
                fontFamily: "'Cairo', sans-serif",
                minWidth: "60px",
              }}
            >
              {y}<br /><span style={{ fontSize: "9px", opacity: 0.8 }}>{((gosiRatesData?.rates?.[y]?.employer ?? 10)).toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── قسيمة الراتب ── */}
      {hasResult && (
        <div className="rounded-2xl overflow-hidden mb-4" style={{ border: `1px solid ${C.border}` }}>
          {/* header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
            <h3 className="text-sm font-black" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>قسيمة الراتب</h3>
            <div className="flex gap-2">
              <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: C.inner, border: `1px solid ${C.border}`, color: C.muted, fontFamily: "'Cairo', sans-serif" }}>
                <RotateCcw size={11} /> إعادة
              </button>
              <button onClick={handlePrint} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: C.primary, color: "white", fontFamily: "'Cairo', sans-serif" }}>
                <Printer size={11} /> طباعة
              </button>
            </div>
          </div>

          {/* محتوى القسيمة */}
          <div ref={printRef} style={{ background: C.bg }}>
            {/* معلومات الموظف */}
            {(empName || empTitle || empId) && (
              <div className="px-4 py-3 grid grid-cols-3 gap-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                {empName && <div><p className="text-[9px] font-bold" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>الاسم</p><p className="text-xs font-black" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>{empName}</p></div>}
                {empTitle && <div><p className="text-[9px] font-bold" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>المسمى</p><p className="text-xs font-black" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>{empTitle}</p></div>}
                {empId && <div><p className="text-[9px] font-bold" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>الهوية</p><p className="text-xs font-black" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>{empId}</p></div>}
              </div>
            )}

            {/* الإيرادات */}
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
              <p className="text-[10px] font-black mb-2" style={{ color: C.accent, fontFamily: "'Cairo', sans-serif" }}>الإيرادات</p>
              {[
                { label: "الراتب الأساسي", val: basicPro, note: workMode !== "full" ? `(${workDays}/30 يوم)` : "" },
                { label: "بدل السكن", val: housingPro, note: housingMode !== "amount" ? `(${housingMode.replace("pct","")?.replace(/(\d+)/,"$1%")})` : "" },
                { label: "بدل النقل", val: transportPro, note: transportMode !== "amount" ? `(${transportMode.replace("pct","")?.replace(/(\d+)/,"$1%")})` : "" },
                ...(otherPro > 0 ? [{ label: "بدلات أخرى", val: otherPro, note: "" }] : []),
                ...(addPro > 0 ? [{ label: "إضافات", val: addPro, note: "" }] : []),
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <span className="text-xs" style={{ color: C.sub, fontFamily: "'Cairo', sans-serif" }}>{item.label} {item.note && <span style={{ color: C.dim, fontSize: "10px" }}>{item.note}</span>}</span>
                  <span className="text-xs font-bold" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>{fmt(item.val)} ريال</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-black" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>إجمالي الراتب</span>
                <span className="text-sm font-black" style={{ color: C.accent, fontFamily: "'Cairo', sans-serif" }}>{fmt(gross)} ريال</span>
              </div>
            </div>

            {/* الخصومات */}
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
              <p className="text-[10px] font-black mb-2" style={{ color: "oklch(0.65 0.18 25)", fontFamily: "'Cairo', sans-serif" }}>الخصومات</p>
              <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
                <span className="text-xs" style={{ color: C.sub, fontFamily: "'Cairo', sans-serif" }}>
                  خصم التأمينات ({(empRate*100).toFixed(1)}% × الراتب الخاضع للاشتراك)
                </span>
                <span className="text-xs font-bold" style={{ color: "oklch(0.65 0.18 25)", fontFamily: "'Cairo', sans-serif" }}>- {fmt(gosiDeduction)} ريال</span>
              </div>
              {otherDeductions > 0 && (
                <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <span className="text-xs" style={{ color: C.sub, fontFamily: "'Cairo', sans-serif" }}>خصومات أخرى</span>
                  <span className="text-xs font-bold" style={{ color: "oklch(0.65 0.18 25)", fontFamily: "'Cairo', sans-serif" }}>- {fmt(otherDeductions)} ريال</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-black" style={{ color: C.text, fontFamily: "'Cairo', sans-serif" }}>إجمالي الخصومات</span>
                <span className="text-sm font-black" style={{ color: "oklch(0.65 0.18 25)", fontFamily: "'Cairo', sans-serif" }}>- {fmt(totalDeductions)} ريال</span>
              </div>
            </div>

            {/* صافي الراتب */}
            <div className="px-4 py-4 flex items-center justify-between" style={{ background: "oklch(0.60 0.18 145 / 0.08)", borderBottom: `1px solid ${C.border}` }}>
              <span className="text-sm font-black" style={{ color: C.text, fontFamily: "'Noto Naskh Arabic', serif" }}>صافي الراتب</span>
              <span className="text-xl font-black" style={{ color: C.green, fontFamily: "'Cairo', sans-serif" }}>{fmt(net)} ريال</span>
            </div>

            {/* تكلفة صاحب العمل */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: C.card }}>
              <span className="text-xs" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>
                حصة صاحب العمل (GOSI {gosiYear} — {((gosiRatesData?.rates?.[gosiYear]?.employer ?? 10)).toFixed(1)}%)
              </span>
              <span className="text-xs font-bold" style={{ color: C.accent, fontFamily: "'Cairo', sans-serif" }}>{fmt(employerGosi)} ريال</span>
            </div>
          </div>
        </div>
      )}

      {/* زر إعادة التعيين */}
      {!hasResult && (
        <div className="rounded-2xl p-6 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-xs" style={{ color: C.muted, fontFamily: "'Cairo', sans-serif" }}>أدخل الراتب الأساسي لعرض قسيمة الراتب</p>
        </div>
      )}
      </div>{/* نهاية العمود الأيسر */}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Page
// -----------------------------------------------------------------------------
export default function PayrollPage() {
  const [, navigate] = useLocation();
  const { t, lang, dir, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { data: siteConfig } = api.config.getAll.useQuery();
  const LOGO_URL = siteConfig?.logo_url ?? LOGO_URL_DEFAULT;
  const [activeTab, setActiveTab] = useState<"sheet" | "individual">("sheet");

  return (
    <div className="min-h-screen" dir={dir} style={{ background: C.bg }}>
      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
        style={{ background: `${C.bg}f5`, borderColor: C.border }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ fontFamily: "'Cairo', sans-serif", color: C.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >
            <ArrowRight size={14} style={{ transform: dir === "ltr" ? "rotate(180deg)" : "none" }} />
            {t("رجوع", "Back")}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all"
              style={{ fontFamily: "'Cairo', sans-serif", background: "transparent", borderColor: C.border, color: C.muted }}
            >
              {lang === "ar" ? "EN" : "ع"}
            </button>
            <img src={LOGO_URL} alt="مواكبة" className="w-6 h-6 object-contain" />
            <span className="font-black text-xs" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: C.text }}>
              {t("مواكبة", "Muwakaba")}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* ── Header ── */}
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-widest uppercase mb-2" style={{ fontFamily: "'Cairo', sans-serif", color: C.dim }}>
            {t("مواكبة للموارد البشرية", "Muwakaba HR")}
          </p>
          <h1 className="text-2xl font-black mb-1" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: C.text }}>
            {t("مسير الرواتب", "Payroll")}
          </h1>
          <p className="text-xs" style={{ fontFamily: "'Cairo', sans-serif", color: C.muted }}>
            {t("مسير رواتب جماعي احترافي وحاسبة راتب فردية مع قسيمة راتب", "Professional group payroll sheet & individual salary calculator with pay slip")}
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="grid grid-cols-2 gap-1 mb-6 p-1 rounded-xl" style={{ background: C.inner, border: `1px solid ${C.border}` }}>
          <button
            onClick={() => setActiveTab("sheet")}
            className="py-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
            style={{ fontFamily: "'Cairo', sans-serif", background: activeTab === "sheet" ? C.green : "transparent", color: activeTab === "sheet" ? "white" : C.muted }}
          >
            <FileSpreadsheet size={13} />
            {t("مسير الرواتب", "Payroll Sheet")}
          </button>
          <button
            onClick={() => setActiveTab("individual")}
            className="py-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
            style={{ fontFamily: "'Cairo', sans-serif", background: activeTab === "individual" ? C.teal : "transparent", color: activeTab === "individual" ? "white" : C.muted }}
          >
            <Calculator size={13} />
            {t("الحاسبة الفردية", "Individual Calculator")}
          </button>
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "sheet" ? <PayrollSheet /> : <IndividualCalc />}
      </main>
    </div>
  );
}
