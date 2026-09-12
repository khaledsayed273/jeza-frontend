import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Users, Plus, Trash2, Download, TrendingUp, BarChart2, Target, RefreshCw } from "lucide-react";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import * as XLSX from "xlsx";
import { useExcelBranding } from "../contexts/ExcelBrandingContext";
import { ExcelBrandingBar } from "../components/ExcelBrandingBar";
import { buildStyledSheet } from "../lib/excelUtils";
import { api } from "../lib/api";

const F = "'Cairo', sans-serif";
const FS = "'Noto Naskh Arabic', serif";

function fmt(n: number) {
  if (!n || isNaN(n)) return "0";
  return n.toLocaleString("ar-SA", { maximumFractionDigits: 0 });
}
function num(v: string) { return parseFloat(v) || 0; }
function fmtD(n: number, d = 1) {
  if (!n || isNaN(n)) return "0";
  return n.toLocaleString("ar-SA", { maximumFractionDigits: d });
}

interface Emp {
  id: string; name: string; dept: string; nationality: "saudi" | "non-saudi"; years: number;
  basic: number; housing: number; transport: number; comm: number; food: number; other: number;
  health: number; recruitment: number; training: number;
  workPermit: number; iqama: number; tickets: number; agencyFee: number;
}

function newEmp(id: string): Emp {
  return { id, name: "", dept: "", nationality: "saudi", years: 1, basic: 0, housing: 0, transport: 0, comm: 0, food: 0, other: 0, health: 0, recruitment: 0, training: 0, workPermit: 0, iqama: 0, tickets: 0, agencyFee: 0 };
}

// جدول نسب التأمينات الاجتماعية حسب السنة (التدرج الجديد من يوليو 2025)
function getGosiRates(year: number, isSaudi: boolean, gosiRatesData?: any) {
  if (!isSaudi) return { employer: 2, saned: 0 };
  const rates = gosiRatesData?.rates ?? {};
  return rates[year] ?? rates[2026] ?? { employer: 11.75, saned: 2 };
}

function calc(e: Emp, gosiYear = 2026, gosiRatesData?: any) {
  const gross = e.basic + e.housing + e.transport + e.comm + e.food + e.other;
  // الراتب الخاضع للاشتراك في التأمينات الاجتماعية:
  // أساسي + سكن + نقل + بدلات أخرى ثابتة (comm, food, other)
  // لا تشمل: العمولة المتغيرة، البدلات الاستثنائية
  // ملاحظة: في هذه الحاسبة يُعامَل comm وfood وother كبدلات ثابتة خاضعة
  const gosiBase = e.basic + e.housing + e.transport + e.comm + e.food + e.other;
  const rates = getGosiRates(gosiYear, e.nationality === "saudi", gosiRatesData);
  const gosi = gosiBase * rates.employer / 100;
  const sanad = gosiBase * rates.saned / 100;
  // نهاية الخدمة: نصف راتب شهري عن كل سنة للسنوات الخمس الأولى، راتب شهري كامل بعدها
  const eos = e.years <= 5
    ? (e.basic * 0.5) / 12
    : e.basic / 12;
  // مخصص الإجازة: 21 يوم للسنوات الأولى، 30 يوم بعد 5 سنوات
  const leaveDays = e.years >= 5 ? 30 : 21;
  const leave = (gross / 30) * leaveDays / 12;
  // تكلفة التوظيف: تُستهلك على متوسط عمر الموظف (24 شهراً)
  const rec = e.recruitment / 24;
  // ميزانية التدريب: سنوية تُقسَّم على 12
  const train = e.training / 12;
  // تكاليف العامل غير السعودي: إقامة سنوية + تصريح عمل سنوي + تذاكر كل سنتين + رسوم استقدام كل سنتين
  const ns = e.nationality === "non-saudi"
    ? (e.iqama / 12) + (e.workPermit / 12) + (e.tickets / 24) + (e.agencyFee / 24)
    : 0;
  const ihtarMihani = e.nationality === "saudi" ? gosiBase * 0.02 : 0; // 2% إخطار مهني على صاحب العمل (للسعوديين فقط)
  const direct = gross + gosi + sanad + e.health;
  const hidden = eos + leave + rec + train + ns + ihtarMihani;
  const total = direct + hidden;
  return { gross, gosi, sanad, ihtarMihani, eos, leave, rec, train, ns, direct, hidden, total, hourly: total / (22 * 8) };
}

// ─── Row ─────────────────────────────────────────────────────────────────────
function Row({ label, hint, value, onChange, color }: { label: string; hint?: string; value: number; onChange: (v: string) => void; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ fontFamily: F, color: color || "var(--muted-foreground)" }}>{label}</p>
        {hint && <p className="text-xs mt-0.5 leading-relaxed" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{hint}</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <input type="number" min="0"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          style={{
            width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`,
            borderRadius: "8px", padding: "6px 10px",
            color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem",
          }}
        />
        <span className="text-xs w-6 font-medium" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>ر.س</span>
      </div>
    </div>
  );
}

function ResRow({ label, value, color, bold, hint }: { label: string; value: number; color?: string; bold?: boolean; hint?: string }) {
  return (
    <div className="flex items-start justify-between py-2" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
      <div>
        <span className={`text-sm ${bold ? "font-bold" : "font-medium"}`} style={{ fontFamily: F, color: color || "var(--muted-foreground)" }}>{label}</span>
        {hint && <p className="text-xs mt-0.5" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{hint}</p>}
      </div>
      <span className={`text-sm ${bold ? "font-bold" : "font-medium"} flex-shrink-0 mr-2`} style={{ fontFamily: F, color: color || "var(--foreground)" }}>{fmt(value)} ر.س</span>
    </div>
  );
}
function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-2">
      <div className="w-1.5 h-5 rounded" style={{ background: color }} />
      <span className="text-sm font-bold" style={{ fontFamily: F, color }}>{label}</span>
    </div>
  );
}

// ─── Single Employee ──────────────────────────────────────────────────────────
function SingleCalc() {
  const [e, setE] = useState<Emp>(newEmp("1"));
  const [gosiYear, setGosiYear] = useState(2026);
  const { data: calculatorData } = api.calculator.getAll.useQuery();
  const gosiRatesData = calculatorData?.gosiRates;
  const r = useMemo(() => calc(e, gosiYear, gosiRatesData), [e, gosiYear, gosiRatesData]);
  const set = (f: keyof Emp, v: string | number) =>
    setE(p => ({ ...p, [f]: typeof v === "string" && f !== "name" && f !== "nationality" && f !== "dept" ? num(v) : v }));
  const branding = useExcelBranding();
  const currentGosiRates = getGosiRates(gosiYear, e.nationality === "saudi", gosiRatesData);

  // ROI
  const [revenue, setRevenue] = useState(0);
  const roi = r.total > 0 && revenue > 0 ? ((revenue - r.total) / r.total * 100) : 0;

  const { data: employeeMarketData } = api.employeeMarket.getAll.useQuery();

  // مقارنة السوق
  type MarketRow = { title: string; sector: string; min: number; avg: number; max: number };
  const MARKET_DATA: MarketRow[] = employeeMarketData ?? [];
  const [selectedJob, setSelectedJob] = useState("");
  const marketRow = MARKET_DATA.find(m => m.title === selectedJob);
  const basicVsMarket = marketRow ? (e.basic - marketRow.avg) : 0;

  // نطاقات
  const [currentSaudi, setCurrentSaudi] = useState(0);
  const [totalEmp, setTotalEmp] = useState(0);
  const [targetPct, setTargetPct] = useState(0);
  const currentPct = totalEmp > 0 ? (currentSaudi / totalEmp * 100) : 0;
  const neededSaudi = totalEmp > 0 && targetPct > 0 ? Math.ceil(totalEmp * targetPct / 100) - currentSaudi : 0;
  const nitaqatGap = neededSaudi > 0 ? neededSaudi * r.total : 0;

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [
      ["حاسبة تكاليف الموظفين — تقرير مفصّل"],
      [],
      ["بيانات الموظف"],
      ["الاسم", e.name || "—"],
      ["الإدارة", e.dept || "—"],
      ["الجنسية", e.nationality === "saudi" ? "سعودي" : "غير سعودي"],
      ["سنوات الخدمة", e.years],
      [],
      ["الراتب والبدلات", "ريال/شهر"],
      ["الراتب الأساسي", e.basic],
      ["بدل السكن", e.housing],
      ["بدل النقل", e.transport],
      ["بدل الاتصالات", e.comm],
      ["بدل الغذاء", e.food],
      ["بدلات أخرى", e.other],
      ["إجمالي الراتب والبدلات", r.gross],
      [],
      ["التكاليف المباشرة", "ريال/شهر"],
      ["إجمالي الراتب والبدلات", r.gross],
      [`تأمينات صاحب العمل: ${currentGosiRates.employer}% (${gosiYear}) × الراتب الخاضع للاشتراك (${r.gross.toLocaleString("ar-SA")} ر.س)`, r.gosi],
      [`ساند صاحب العمل: ${currentGosiRates.saned}% × الراتب الخاضع`, r.sanad],
      ["التأمين الصحي", e.health],
      ["إجمالي التكاليف المباشرة", r.direct],
      [],
      ["التكاليف الخفية (شهرياً)", "ريال/شهر", "الأساس"],
      ["مخصص نهاية الخدمة", r.eos, e.years <= 5 ? "نصف راتب/سنة (أقل من 5 سنوات)" : "راتب كامل/سنة (أكثر من 5 سنوات)"],
      ["مخصص الإجازة السنوية", r.leave, `${e.years >= 5 ? 30 : 21} يوم سنوياً`],
      ["تكلفة التوظيف (مستهلكة)", r.rec, "إجمالي التوظيف ÷ 24 شهراً (متوسط عمر الموظف)"],
      ["ميزانية التدريب (شهرية)", r.train, "ميزانية التدريب السنوية ÷ 12"],
    ];
    if (e.nationality === "non-saudi") {
      rows.push(
        ["رسوم الإقامة (شهرية)", e.iqama / 12, "الرسوم السنوية ÷ 12"],
        ["رسوم تصريح العمل (شهرية)", e.workPermit / 12, "الرسوم السنوية ÷ 12"],
        ["تذاكر السفر (شهرية)", e.tickets / 24, "التذاكر كل سنتين ÷ 24"],
        ["رسوم الاستقدام (شهرية)", e.agencyFee / 24, "رسوم الاستقدام ÷ 24 شهراً"],
      );
    }
    rows.push(
      ...(e.nationality === "saudi" ? [[`إخطار مهني 2% × الراتب الخاضع للاشتراك (${r.gross.toLocaleString("ar-SA")} ر.س)`, r.ihtarMihani, "2% على صاحب العمل للسعوديين فقط"]] : []),
      ["إجمالي التكاليف الخفية", r.hidden],
      [],
      ["ملخص التكلفة الفعلية"],
      ["التكلفة الفعلية / شهر", r.total],
      ["التكلفة الفعلية / سنة", r.total * 12],
      ["تكلفة ساعة العمل", r.hourly],
      ["نسبة التكاليف الخفية", `${r.total > 0 ? (r.hidden / r.total * 100).toFixed(1) : 0}%`],
    );
    // تحديد صفوف الإجمالي (indices بعد صف الرؤوس)
    const totalRowIndices: number[] = [];
    rows.forEach((row, i) => {
      if (i > 0 && typeof row[0] === "string" && (
        row[0].includes("إجمالي") || row[0].includes("ملخص")
      )) totalRowIndices.push(i - 1);
    });
    const ws = buildStyledSheet(rows, branding, "تقرير تكاليف الموظف", [36, 20, 40], totalRowIndices);
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الموظف");
    XLSX.writeFile(wb, `employee-cost-${e.name || "report"}.xlsx`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── النموذج ── */}
      <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
        <SectionHeader label="بيانات الموظف" color={"var(--primary)"} />
        <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>الاسم (اختياري)</p>
          <input type="text" value={e.name} onChange={ev => set("name", ev.target.value)} placeholder="—"
            style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", fontSize: "0.9375rem" }} />
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>الإدارة (اختياري)</p>
          <input type="text" value={e.dept} onChange={ev => set("dept", ev.target.value)} placeholder="—"
            style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", fontSize: "0.9375rem" }} />
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>الجنسية</p>
          <select value={e.nationality} onChange={ev => set("nationality", ev.target.value)}
            style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", cursor: "pointer", fontSize: "0.9375rem" }}>
            <option value="saudi">سعودي</option>
            <option value="non-saudi">غير سعودي</option>
          </select>
        </div>
        {/* سنة الاشتراك في التأمينات */}
        <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <div>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>سنة الاشتراك في التأمينات</p>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--accent)" }}>صاحب العمل: {currentGosiRates.employer}% + ساند: {currentGosiRates.saned}%</p>
          </div>
          <select value={gosiYear} onChange={ev => setGosiYear(Number(ev.target.value))}
            style={{ width: "110px", background: "var(--secondary)", border: `1px solid color-mix(in oklch, var(--accent) 25%, transparent)`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", cursor: "pointer", fontSize: "0.9375rem" }}>
            <option value={2024}>2024 — 9%</option>
            <option value={2025}>2025 — 9.5%</option>
            <option value={2026}>2026 — 10%</option>
            <option value={2027}>2027 — 10.5%</option>
            <option value={2028}>2028 — 11%</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <div>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>سنوات الخدمة</p>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>تؤثر على نهاية الخدمة والإجازة</p>
          </div>
          <input type="number" min="0" value={e.years || ""} onChange={ev => set("years", ev.target.value)} placeholder="1"
            style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
        </div>

        <SectionHeader label="الراتب والبدلات (ريال/شهر)" color={"var(--success-strong)"} />
        <Row label="الراتب الأساسي" hint="أساس احتساب GOSI ونهاية الخدمة" value={e.basic} onChange={v => set("basic", v)} color={"var(--foreground)"} />
        <Row label="بدل السكن" value={e.housing} onChange={v => set("housing", v)} />
        <Row label="بدل النقل" value={e.transport} onChange={v => set("transport", v)} />
        <Row label="بدل الاتصالات" value={e.comm} onChange={v => set("comm", v)} />
        <Row label="بدل الغذاء" value={e.food} onChange={v => set("food", v)} />
        <Row label="بدلات أخرى" value={e.other} onChange={v => set("other", v)} />

        <SectionHeader label="تكاليف إضافية" color={"oklch(0.52 0.15 55)"} />
        <Row label="التأمين الصحي" hint="ريال/شهر" value={e.health} onChange={v => set("health", v)} />
        <Row
          label="تكلفة التوظيف (الإجمالية)"
          hint="أدخل إجمالي ما أُنفق على التوظيف (إعلانات، مقابلات، وكالات). يُستهلك تلقائياً على 24 شهراً"
          value={e.recruitment}
          onChange={v => set("recruitment", v)}
        />
        <Row
          label="ميزانية التدريب (سنوية)"
          hint="إجمالي ميزانية التدريب السنوية. تُقسَّم تلقائياً على 12 شهراً"
          value={e.training}
          onChange={v => set("training", v)}
        />

        {e.nationality === "non-saudi" && (
          <>
            <SectionHeader label="تكاليف العامل غير السعودي" color={"var(--danger-strong)"} />
            <Row label="رسوم الإقامة (سنوية)" hint="تُقسَّم تلقائياً على 12 شهراً" value={e.iqama} onChange={v => set("iqama", v)} color={"var(--danger-strong)"} />
            <Row label="رسوم تصريح العمل (سنوية)" hint="تُقسَّم تلقائياً على 12 شهراً" value={e.workPermit} onChange={v => set("workPermit", v)} color={"var(--danger-strong)"} />
            <Row label="تذاكر السفر والإجازة" hint="تُجدَّد كل سنتين — تُقسَّم على 24 شهراً" value={e.tickets} onChange={v => set("tickets", v)} color={"var(--danger-strong)"} />
            <Row label="رسوم شركة الاستقدام" hint="رسوم لمرة واحدة — تُستهلك على 24 شهراً" value={e.agencyFee} onChange={v => set("agencyFee", v)} color={"var(--danger-strong)"} />
          </>
        )}
      </div>

      {/* ── النتائج ── */}
      <div className="space-y-3">
        {/* رسالة توجيهية عند عدم إدخال الراتب */}
        {e.basic === 0 && (
          <div className="rounded-xl p-6 text-center" style={{ background: "var(--secondary)", border: "2px dashed var(--border)" }}>
            <div className="text-4xl mb-3">📊</div>
            <p className="text-base font-bold mb-1" style={{ fontFamily: F, color: "var(--primary)" }}>أدخل بيانات الموظف لتظهر النتائج</p>
            <p className="text-sm" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>ابدأ بإدخال الراتب الأساسي على الأقل</p>
          </div>
        )}
        {/* KPIs */}
        {e.basic > 0 && <div className="grid grid-cols-2 gap-3">
          {[
            { label: "التكلفة الفعلية/شهر", val: r.total, color: "var(--primary)" },
            { label: "التكلفة السنوية", val: r.total * 12, color: "var(--success-strong)" },
            { label: "التكاليف الخفية/شهر", val: r.hidden, color: "var(--accent)" },
            { label: "تكلفة ساعة العمل", val: r.hourly, color: "var(--danger-strong)" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: "var(--card)", border: `2px solid ${color}`, boxShadow: `0 2px 8px ${color}20` }}>
              <p className="text-2xl font-black" style={{ fontFamily: FS, color }}>{fmt(val)}</p>
              <p className="text-sm font-medium mt-1" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</p>
              <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>ر.س</p>
            </div>
          ))}
        </div>}

        {e.basic > 0 && <>

        {/* التكاليف المباشرة */}
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p className="text-base font-bold mb-3" style={{ fontFamily: F, color: "var(--success-strong)" }}>التكاليف المباشرة</p>
          <ResRow label="الراتب الأساسي" value={e.basic} />
          <ResRow label="إجمالي البدلات" value={e.housing + e.transport + e.comm + e.food + e.other} />
          <ResRow
            label={`تأمينات صاحب العمل: ${currentGosiRates.employer}% (${gosiYear}) × الراتب الخاضع للاشتراك`}
            hint={`الراتب الخاضع = إجمالي الراتب والبدلات = ${fmt(e.basic + e.housing + e.transport + e.comm + e.food + e.other)} ر.س`}
            value={r.gosi}
          />
          {e.nationality === "saudi" && <ResRow label={`ساند صاحب العمل: ${currentGosiRates.saned}% × الراتب الخاضع للاشتراك`} value={r.sanad} />}
          <ResRow label="التأمين الصحي" value={e.health} />
          <ResRow label="إجمالي المباشرة" value={r.direct} color={"var(--success-strong)"} bold />
        </div>

        {/* التكاليف الخفية */}
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
          <p className="text-base font-bold mb-3" style={{ fontFamily: F, color: "var(--accent)" }}>التكاليف الخفية (شهرياً)</p>
          <ResRow
            label="مخصص نهاية الخدمة"
            hint={e.years <= 5 ? "نصف راتب/سنة (سنوات الخدمة ≤ 5)" : "راتب كامل/سنة (سنوات الخدمة > 5)"}
            value={r.eos}
          />
          <ResRow
            label="مخصص الإجازة السنوية"
            hint={`${e.years >= 5 ? 30 : 21} يوم سنوياً ÷ 12`}
            value={r.leave}
          />
          <ResRow
            label="تكلفة التوظيف (مستهلكة)"
            hint="إجمالي التوظيف ÷ 24 شهراً"
            value={r.rec}
          />
          <ResRow
            label="ميزانية التدريب (شهرية)"
            hint="الميزانية السنوية ÷ 12"
            value={r.train}
          />
          {e.nationality === "non-saudi" && (
            <ResRow label="تكاليف العامل غير السعودي" hint="إقامة + تصريح + تذاكر + استقدام" value={r.ns} color={"var(--danger-strong)"} />
          )}
          {e.nationality === "saudi" && (
            <ResRow
              label="إخطار مهني: 2% × الراتب الخاضع للاشتراك"
              hint={`2% × ${fmt(e.basic + e.housing + e.transport + e.comm + e.food + e.other)} ر.س`}
              value={r.ihtarMihani}
              color={"var(--info-strong)"}
            />
          )}
          <ResRow label="إجمالي الخفية" value={r.hidden} color={"oklch(0.52 0.15 55)"} bold />
        </div>

        {/* الإجمالي */}
        <div className="rounded-xl p-4" style={{ background: `${"var(--primary)"}15`, border: `1px solid ${"var(--primary)"}50` }}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold" style={{ fontFamily: F, color: "var(--foreground)" }}>إجمالي التكلفة الفعلية / شهر</span>
            <span className="text-lg font-black" style={{ fontFamily: FS, color: "var(--primary)" }}>{fmt(r.total)} ر.س</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>نسبة التكاليف الخفية</span>
            <span className="text-xs font-bold" style={{ fontFamily: F, color: "var(--accent)" }}>
              {r.total > 0 ? (r.hidden / r.total * 100).toFixed(1) : 0}%
            </span>
          </div>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>
            وفق معايير SHRM وCIPD تتراوح التكاليف الخفية بين 20-35% من إجمالي تكلفة الموظف
          </p>
        </div>

        {/* ── مقارنة السوق ── */}
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid color-mix(in oklch, var(--accent) 25%, transparent)` }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} style={{ color: "var(--accent)" }} />
            <span className="text-xs font-bold" style={{ fontFamily: F, color: "var(--accent)" }}>مقارنة بمعدلات السوق</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>اختر المسمى الوظيفي</p>
            <select value={selectedJob} onChange={ev => setSelectedJob(ev.target.value)}
              style={{ width: "150px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", cursor: "pointer", fontSize: "0.9375rem" }}>
              <option value="">— اختر —</option>
              {MARKET_DATA.map(m => <option key={m.title} value={m.title}>{m.title}</option>)}
            </select>
          </div>
          {marketRow && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs" style={{ fontFamily: F }}>
                <span style={{ color: "var(--muted-foreground)" }}>القطاع: {marketRow.sector}</span>
                <span style={{ color: basicVsMarket >= 0 ? "var(--success-strong)" : "var(--danger-strong)", fontWeight: 700 }}>
                  {basicVsMarket >= 0 ? `+${fmt(basicVsMarket)}` : `-${fmt(Math.abs(basicVsMarket))}`} ر.س عن المتوسط
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "الحد الأدنى", val: marketRow.min, color: "var(--danger-strong)" },
                  { label: "المتوسط", val: marketRow.avg, color: "var(--accent)" },
                  { label: "الحد الأعلى", val: marketRow.max, color: "var(--success-strong)" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="rounded-lg p-2 text-center" style={{ background: "var(--secondary)", border: `1px solid ${color}30` }}>
                    <p className="text-xs font-bold" style={{ fontFamily: FS, color }}>{fmt(val)}</p>
                    <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</p>
                  </div>
                ))}
              </div>
              {e.basic > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[9px] mb-1" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>
                    <span>{fmt(marketRow.min)}</span>
                    <span style={{ color: "var(--primary)" }}>راتبك: {fmt(e.basic)}</span>
                    <span>{fmt(marketRow.max)}</span>
                  </div>
                  <div className="h-2 rounded-full relative" style={{ background: "var(--secondary)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, (marketRow.avg - marketRow.min) / (marketRow.max - marketRow.min) * 100))}%`, background: "color-mix(in oklch, var(--accent) 35%, transparent)" }} />
                    <div className="absolute top-0 h-full w-0.5 rounded" style={{ left: `${Math.min(100, Math.max(0, (e.basic - marketRow.min) / (marketRow.max - marketRow.min) * 100))}%`, background: "var(--primary)" }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ربط نطاقات ── */}
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--success-strong)"}40` }}>
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} style={{ color: "var(--success-strong)" }} />
            <span className="text-xs font-bold" style={{ fontFamily: F, color: "var(--success-strong)" }}>ربط بنطاقات السعودة</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "السعوديون الحاليون", val: currentSaudi, set: setCurrentSaudi },
              { label: "إجمالي الموظفين", val: totalEmp, set: setTotalEmp },
              { label: "نسبة السعودة المستهدفة %", val: targetPct, set: setTargetPct },
            ].map(({ label, val, set: setter }) => (
              <div key={label}>
                <p className="text-xs mb-1" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</p>
                <input type="number" min="0" value={val || ""} onChange={ev => setter(num(ev.target.value))} placeholder="0"
                  style={{ width: "100%", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
              </div>
            ))}
          </div>
          {totalEmp > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>نسبة السعودة الحالية</span>
                <span className="text-xs font-bold" style={{ fontFamily: F, color: currentPct >= targetPct && targetPct > 0 ? "var(--success-strong)" : "var(--danger-strong)" }}>
                  {currentPct.toFixed(1)}%
                </span>
              </div>
              {targetPct > 0 && (
                <>
                  <div className="flex justify-between items-center py-1.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                    <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>السعوديون المطلوبون إضافياً</span>
                    <span className="text-xs font-bold" style={{ fontFamily: F, color: neededSaudi > 0 ? "oklch(0.52 0.15 55)" : "var(--success-strong)" }}>
                      {neededSaudi > 0 ? `${neededSaudi} موظف` : "✅ تجاوزت الهدف"}
                    </span>
                  </div>
                  {neededSaudi > 0 && r.total > 0 && (
                    <div className="flex justify-between items-center py-1.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                      <div>
                        <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>تكلفة الفرق الشهرية</span>
                        <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>بناءً على تكلفة الموظف الحالي</p>
                      </div>
                      <span className="text-xs font-bold" style={{ fontFamily: F, color: "var(--accent)" }}>{fmt(nitaqatGap)} ر.س</span>
                    </div>
                  )}
                  <div className="mt-1">
                    <div className="flex justify-between text-[9px] mb-1" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>
                      <span>0%</span>
                      <span>الهدف: {targetPct}%</span>
                      <span>100%</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "var(--secondary)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, currentPct)}%`, background: currentPct >= targetPct ? "var(--success-strong)" : "oklch(0.52 0.15 55)" }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* زر التصدير */}
        <button onClick={exportExcel}
          className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
          style={{ fontFamily: F, background: "var(--success-strong)", color: "white" }}>
          <Download size={13} /> تصدير تقرير Excel
        </button>
        </>
        }
      </div>
    </div>
  );
}

//// ─── Department Calculator ────────────────────────────────────────────
function DeptCalc() {
  const [list, setList] = useState<Emp[]>([newEmp("e1")]);
  const [gosiYear, setGosiYear] = useState(2026);
  const branding = useExcelBranding();
  const { data: calculatorData } = api.calculator.getAll.useQuery();
  const gosiRatesData = calculatorData?.gosiRates;

  const add = () => setList(p => [...p, newEmp(`e${Date.now()}`)]);
  const remove = (id: string) => { if (list.length > 1) setList(p => p.filter(e => e.id !== id)); };
  const upd = (id: string, f: keyof Emp, v: string | number) =>
    setList(p => p.map(e => e.id === id ? { ...e, [f]: typeof v === "string" && f !== "name" && f !== "nationality" && f !== "dept" ? num(v) : v } : e));

  const calcs = useMemo(() => list.map(e => ({ e, r: calc(e, gosiYear, gosiRatesData) })), [list, gosiYear, gosiRatesData]);
  const totalM = calcs.reduce((s, { r }) => s + r.total, 0);
  const totalH = calcs.reduce((s, { r }) => s + r.hidden, 0);

  function exportDeptExcel() {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [
      ["حاسبة تكاليف الإدارة — تقرير مفصّل"],
      [],
      ["الموظف", "الإدارة", "الجنسية", "سنوات الخدمة", "الراتب الإجمالي", "تأمينات صاحب العمل × الراتب الخاضع للاشتراك", "ساند × الراتب الخاضع", "تأمين صحي", "إخطار مهني 2%", "تكاليف خفية", "التكلفة الفعلية/شهر", "التكلفة السنوية"],
    ];
    calcs.forEach(({ e, r }, idx) => {
      rows.push([
        e.name || `موظف ${idx + 1}`,
        e.dept || "—",
        e.nationality === "saudi" ? "سعودي" : "غير سعودي",
        e.years,
        r.gross, r.gosi, r.sanad, e.health, r.ihtarMihani, r.hidden, r.total, r.total * 12,
      ]);
    });
    rows.push([]);
    rows.push(["الإجمالي", "", "", "", "", "", "", "", totalH, totalM, totalM * 12]);
    const totalRowIdx = rows.length - 2; // صف الإجمالي
    const ws = buildStyledSheet(rows, branding, "تقرير تكاليف الإدارة", [20, 18, 14, 14, 18, 14, 12, 14, 14, 18, 22, 18], [totalRowIdx]);
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الإدارة");
    XLSX.writeFile(wb, "dept-cost-report.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* سنة التأمينات */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>سنة الاشتراك في التأمينات:</span>
        {[2024, 2025, 2026, 2027].map(y => (
          <button key={y} onClick={() => setGosiYear(y)}
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
            style={{ background: gosiYear === y ? "var(--primary)" : "color-mix(in oklch, var(--primary) 15%, transparent)", color: gosiYear === y ? "var(--primary-foreground)" : "var(--primary)", border: `1px solid color-mix(in oklch, var(--primary) 30%, transparent)` }}>
            {y} — {getGosiRates(y, true, gosiRatesData).employer}%
          </button>
        ))}
      </div>
      {/* ملخص */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "إجمالي شهري", val: totalM, color: "var(--primary)" },
          { label: "إجمالي سنوي", val: totalM * 12, color: "var(--success-strong)" },
          { label: "متوسط/موظف", val: list.length ? totalM / list.length : 0, color: "var(--accent)" },
          { label: "تكاليف خفية", val: totalH, color: "var(--danger-strong)" },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--card)", border: `1px solid ${color}40` }}>
            <p className="text-xl font-black" style={{ fontFamily: FS, color }}>{fmt(val)}</p>
            <p className="text-xs mt-0.5" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label} ر.س</p>
          </div>
        ))}
      </div>

      {/* قائمة الموظفين */}
      {calcs.map(({ e, r }, idx) => (
        <div key={e.id} className="rounded-2xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold" style={{ fontFamily: F, color: "var(--primary)" }}>موظف {idx + 1}</span>
            <button onClick={() => remove(e.id)} className="p-1 rounded-lg" style={{ background: `${"var(--danger-strong)"}20`, color: "var(--danger-strong)" }}>
              <Trash2 size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4">
            {[
              { label: "الاسم", field: "name" as keyof Emp, type: "text" },
              { label: "الإدارة", field: "dept" as keyof Emp, type: "text" },
            ].map(({ label, field, type }) => (
              <div key={field} className="flex items-center justify-between gap-2 py-1.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</span>
                <input type={type} value={(e[field] as string) || ""} onChange={ev => upd(e.id, field, ev.target.value)} placeholder="—"
                  style={{ width: "90px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "6px 10px", color: "var(--foreground)", fontFamily: F, fontSize: "14px", outline: "none" }} />
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 py-1.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
              <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>الجنسية</span>
              <select value={e.nationality} onChange={ev => upd(e.id, "nationality", ev.target.value)}
                style={{ width: "90px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "6px 10px", color: "var(--foreground)", fontFamily: F, fontSize: "14px", outline: "none", cursor: "pointer" }}>
                <option value="saudi">سعودي</option>
                <option value="non-saudi">غير سعودي</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 mt-1">
            {[
              { label: "الراتب الأساسي", field: "basic" as keyof Emp },
              { label: "إجمالي البدلات", field: "housing" as keyof Emp },
              { label: "التأمين الصحي (شهري)", field: "health" as keyof Emp },
            ].map(({ label, field }) => (
              <div key={field} className="flex items-center justify-between gap-2 py-1.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</span>
                <input type="number" min="0" value={(e[field] as number) || ""} onChange={ev => upd(e.id, field, ev.target.value)} placeholder="0"
                  style={{ width: "90px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "6px 10px", color: "var(--foreground)", fontFamily: F, fontSize: "14px", outline: "none", direction: "ltr" }} />
              </div>
            ))}
          </div>

          {e.nationality === "non-saudi" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 mt-1">
              {[
                { label: "إقامة (سنوي)", field: "iqama" as keyof Emp },
                { label: "تصريح عمل (سنوي)", field: "workPermit" as keyof Emp },
                { label: "تذاكر سفر (كل سنتين)", field: "tickets" as keyof Emp },
              ].map(({ label, field }) => (
                <div key={field} className="flex items-center justify-between gap-2 py-1.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                  <span className="text-xs" style={{ fontFamily: F, color: "var(--danger-strong)" }}>{label}</span>
                  <input type="number" min="0" value={(e[field] as number) || ""} onChange={ev => upd(e.id, field, ev.target.value)} placeholder="0"
                    style={{ width: "90px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "6px 10px", color: "var(--foreground)", fontFamily: F, fontSize: "14px", outline: "none", direction: "ltr" }} />
                </div>
              ))}
            </div>
          )}

          {e.nationality === "saudi" && r.ihtarMihani > 0 && (
            <div className="flex items-center justify-between rounded-lg px-3 py-1.5 mt-1" style={{ background: "oklch(0.65 0.18 200 / 0.08)", border: "1px solid oklch(0.65 0.18 200 / 0.25)" }}>
              <span className="text-xs" style={{ fontFamily: F, color: "oklch(0.55 0.18 200)" }}>إخطار مهني 2% × {fmt(r.gross)} ر.س</span>
              <span className="text-xs font-bold" style={{ fontFamily: FS, color: "oklch(0.55 0.18 200)" }}>{fmt(r.ihtarMihani)} ر.س</span>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg px-3 py-2 mt-2" style={{ background: `${"var(--primary)"}15`, border: `1px solid ${"var(--primary)"}30` }}>
            <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>التكلفة الفعلية / شهر</span>
            <span className="text-sm font-black" style={{ fontFamily: FS, color: "var(--primary)" }}>{fmt(r.total)} ر.س</span>
          </div>
        </div>
      ))}

      <button onClick={add} className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
        style={{ fontFamily: F, background: `${"var(--primary)"}15`, color: "var(--primary)", border: `1px dashed ${"var(--primary)"}50` }}>
        <Plus size={13} /> إضافة موظف
      </button>

      {list.length > 0 && (
        <button onClick={exportDeptExcel}
          className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
          style={{ fontFamily: F, background: "var(--success-strong)", color: "white" }}>
          <Download size={13} /> تصدير تقرير الإدارة Excel
        </button>
      )}

      {list.length > 1 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${"var(--border)"}` }}>
          <div className="px-3 py-2" style={{ background: "var(--secondary)" }}>
            <p className="text-xs font-bold" style={{ fontFamily: F, color: "var(--primary)" }}>ملخص الإدارة</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontFamily: F }}>
              <thead>
                <tr style={{ background: "var(--background)" }}>
                  {["الموظف", "الإدارة", "الجنسية", "الراتب الإجمالي", "تكاليف خفية", "التكلفة/شهر"].map(h => (
                    <th key={h} className="px-3 py-2 text-right text-[10px] font-bold" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calcs.map(({ e, r }, idx) => (
                  <tr key={e.id} style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--foreground)" }}>{e.name || `موظف ${idx + 1}`}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>{e.dept || "—"}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ background: e.nationality === "saudi" ? `${"var(--success-strong)"}20` : `${"var(--danger-strong)"}20`, color: e.nationality === "saudi" ? "var(--success-strong)" : "var(--danger-strong)" }}>
                        {e.nationality === "saudi" ? "سعودي" : "غير سعودي"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>{fmt(r.gross)} ر.س</td>
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--accent)" }}>{fmt(r.hidden)} ر.س</td>
                    <td className="px-3 py-2 text-[10px] font-bold" style={{ color: "var(--primary)" }}>{fmt(r.total)} ر.س</td>
                  </tr>
                ))}
                <tr style={{ borderTop: `2px solid ${"var(--primary)"}40`, background: "var(--secondary)" }}>
                  <td className="px-3 py-2 text-[10px] font-bold" style={{ color: "var(--foreground)" }} colSpan={5}>الإجمالي الشهري</td>
                  <td className="px-3 py-2 text-sm font-black" style={{ color: "var(--primary)" }}>{fmt(totalM)} ر.س</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─// ─── Bulk Calculator ────────────────────────────────────────────
function BulkCalc() {
  // وضع الحساب: موحد (راتب واحد + أسماء) أو جدول سريع (كل موظف بسطر)
  const [mode, setMode] = useState<"unified" | "table">("unified");
  const [gosiYear, setGosiYear] = useState(2026);
  const branding = useExcelBranding();
  const { data: calculatorData } = api.calculator.getAll.useQuery();
  const gosiRatesData = calculatorData?.gosiRates;

  // ── وضع موحد ──
  const [uBasic, setUBasic] = useState(0);
  const [uHousing, setUHousing] = useState(0);
  const [uTransport, setUTransport] = useState(0);
  const [uOther, setUOther] = useState(0);
  const [uHealth, setUHealth] = useState(0);
  const [uNat, setUNat] = useState<"saudi" | "non-saudi">("saudi");
  const [uYears, setUYears] = useState(1);
  const [uIqama, setUIqama] = useState(0);
  const [uWorkPermit, setUWorkPermit] = useState(0);
  const [uTickets, setUTickets] = useState(0);
  // قائمة الأسماء: يمكن كتابة أسماء أو عدد فقط
  const [namesText, setNamesText] = useState("");
  const [bulkCount, setBulkCount] = useState(1);

  const unifiedEmp = useMemo<Emp>(() => ({
    id: "u", name: "", dept: "", nationality: uNat, years: uYears,
    basic: uBasic, housing: uHousing, transport: uTransport, comm: 0, food: 0, other: uOther,
    health: uHealth, recruitment: 0, training: 0,
    workPermit: uWorkPermit, iqama: uIqama, tickets: uTickets, agencyFee: 0,
  }), [uNat, uYears, uBasic, uHousing, uTransport, uOther, uHealth, uWorkPermit, uIqama, uTickets]);

  const uResult = useMemo(() => calc(unifiedEmp, gosiYear, gosiRatesData), [unifiedEmp, gosiYear, gosiRatesData]);

  // استخراج الأسماء من النص
  const names = useMemo(() => {
    const lines = namesText.split(/[\n,،]/).map(s => s.trim()).filter(Boolean);
    return lines.length > 0 ? lines : Array.from({ length: bulkCount }, (_, i) => `موظف ${i + 1}`);
  }, [namesText, bulkCount]);

  const count = namesText.trim() ? names.length : bulkCount;
  const totalM = uResult.total * count;
  const totalY = totalM * 12;

  // ── وضع الجدول السريع ──
  interface QuickRow { id: string; name: string; basic: string; housing: string; nat: "saudi" | "non-saudi"; years: string; health: string; }
  const [rows, setRows] = useState<QuickRow[]>([{ id: "r1", name: "", basic: "", housing: "", nat: "saudi", years: "1", health: "" }]);
  const addRow = () => setRows(p => [...p, { id: `r${Date.now()}`, name: "", basic: "", housing: "", nat: "saudi", years: "1", health: "" }]);
  const removeRow = (id: string) => { if (rows.length > 1) setRows(p => p.filter(r => r.id !== id)); };
  const updRow = (id: string, f: keyof QuickRow, v: string) => setRows(p => p.map(r => r.id === id ? { ...r, [f]: v } : r));

  const tableCalcs = useMemo(() => rows.map(r => {
    const e: Emp = {
      id: r.id, name: r.name, dept: "", nationality: r.nat, years: num(r.years) || 1,
      basic: num(r.basic), housing: num(r.housing), transport: 0, comm: 0, food: 0, other: 0,
      health: num(r.health), recruitment: 0, training: 0,
      workPermit: 0, iqama: 0, tickets: 0, agencyFee: 0,
    };
    return { r, res: calc(e, gosiYear, gosiRatesData) };
  }), [rows, gosiYear, gosiRatesData]);
  const tableTotal = tableCalcs.reduce((s, { res }) => s + res.total, 0);

  // ── تصدير Excel ──
  function exportUnified() {
    const wb = XLSX.utils.book_new();
    const header = [["حاسبة التكاليف الجماعية — وضع موحد"], [], ["البند", "المبلغ/شهر (ر.س)", "ملاحظة"]];
    const costRows: (string | number)[][] = [
      ["الراتب الأساسي", uBasic, ""],
      ["بدل السكن", uHousing, ""],
      ["بدل النقل", uTransport, ""],
      ["بدلات أخرى", uOther, ""],
      ["التأمين الصحي", uHealth, ""],
      [`تأمينات صاحب العمل: ${getGosiRates(gosiYear, uNat === "saudi", gosiRatesData).employer}% (${gosiYear}) × الراتب الخاضع (${uResult.gross.toLocaleString("ar-SA")} ر.س)`, uResult.gosi, ""],
      [`ساند صاحب العمل: ${getGosiRates(gosiYear, uNat === "saudi", gosiRatesData).saned}%`, uResult.sanad, ""],
      ["مخصص نهاية الخدمة", uResult.eos, "شهري"],
      ["مخصص الإجازة", uResult.leave, "شهري"],
    ];
    if (uNat === "saudi") {
      costRows.push([`إخطار مهني 2% × الراتب الخاضع (${uResult.gross.toLocaleString("ar-SA")} ر.س)`, uResult.ihtarMihani, "2% على صاحب العمل للسعوديين فقط"]);
    }
    if (uNat === "non-saudi") {
      costRows.push(["تكاليف العامل غير السعودي", uResult.ns, "إقامة + تصريح + تذاكر"]);
    }
    const summaryRows: (string | number)[][] = [
      [],
      ["ملخص التكاليف"],
      ["تكلفة الموظف الواحد/شهر", uResult.total],
      ["تكلفة الموظف الواحد/سنة", uResult.total * 12],
      [],
      ["عدد الموظفين", count],
      ["إجمالي التكاليف الشهرية", totalM],
      ["إجمالي التكاليف السنوية", totalY],
      [],
      ["قائمة الأسماء"],
      ...names.map((n, i) => [i + 1, n, uResult.total, uResult.total * 12]),
    ];
    const allRows = [...header, ...costRows, ...summaryRows];
    const totalIdx = allRows.findIndex(r => typeof r[0] === "string" && r[0].includes("إجمالي التكاليف السنوية"));
    const ws = buildStyledSheet(allRows, branding, "تقرير التكاليف الجماعية", [30, 20, 20], totalIdx >= 0 ? [totalIdx - 1] : []);
    XLSX.utils.book_append_sheet(wb, ws, "التكاليف الجماعية");
    XLSX.writeFile(wb, "bulk-cost-unified.xlsx");
  }

  function exportTable() {
    const wb = XLSX.utils.book_new();
    const rows2: (string | number)[][] = [
      ["حاسبة التكاليف الجماعية — جدول سريع"],
      [],
      ["#", "الاسم", "الجنسية", "سنوات الخدمة", "الراتب الأساسي", "البدلات", "التأمين الصحي", "إخطار مهني 2%", "تكاليف مباشرة", "تكاليف خفية", "التكلفة/شهر", "التكلفة/سنة"],
    ];
    tableCalcs.forEach(({ r, res }, i) => {
      rows2.push([i + 1, r.name || `موظف ${i + 1}`, r.nat === "saudi" ? "سعودي" : "غير سعودي", num(r.years), num(r.basic), num(r.housing), num(r.health), res.ihtarMihani, res.direct, res.hidden, res.total, res.total * 12]);
    });
    rows2.push([], ["الإجمالي", "", "", "", "", "", "", "", "", tableTotal, tableTotal * 12]);
    const totalRowIdx2 = rows2.length - 2;
    const ws = buildStyledSheet(rows2, branding, "تقرير الجدول السريع", [5, 20, 14, 14, 18, 14, 14, 14, 18, 16, 18, 16], [totalRowIdx2]);
    XLSX.utils.book_append_sheet(wb, ws, "الجدول السريع");
    XLSX.writeFile(wb, "bulk-cost-table.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* سنة التأمينات */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>سنة الاشتراك في التأمينات:</span>
        {[2024, 2025, 2026, 2027].map(y => (
          <button key={y} onClick={() => setGosiYear(y)}
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
            style={{ background: gosiYear === y ? "var(--primary)" : "color-mix(in oklch, var(--primary) 15%, transparent)", color: gosiYear === y ? "var(--primary-foreground)" : "var(--primary)", border: `1px solid color-mix(in oklch, var(--primary) 30%, transparent)` }}>
            {y} — {getGosiRates(y, true, gosiRatesData).employer}%
          </button>
        ))}
      </div>
      {/* اختيار الوضع */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
        {[
          { k: "unified", l: "راتب موحد + أسماء" },
          { k: "table", l: "جدول سريع" },
        ].map(({ k, l }) => (
          <button key={k} onClick={() => setMode(k as "unified" | "table")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ fontFamily: F, background: mode === k ? "oklch(0.52 0.15 55)" : "transparent", color: mode === k ? "white" : "var(--muted-foreground)" }}>
            {l}
          </button>
        ))}
      </div>

      {mode === "unified" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── النموذج الموحد ── */}
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
              <SectionHeader label="بنود الراتب الموحد" color={"oklch(0.52 0.15 55)"} />
              <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>الجنسية</p>
                <select value={uNat} onChange={e => setUNat(e.target.value as "saudi" | "non-saudi")}
                  style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", cursor: "pointer", fontSize: "0.9375rem" }}>
                  <option value="saudi">سعودي</option>
                  <option value="non-saudi">غير سعودي</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                <div>
                  <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>سنوات الخدمة</p>
                  <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>تؤثر على نهاية الخدمة</p>
                </div>
                <input type="number" min="1" value={uYears || ""} onChange={e => setUYears(num(e.target.value) || 1)} placeholder="1"
                  style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
              </div>
              <Row label="الراتب الأساسي" value={uBasic} onChange={v => setUBasic(num(v))} />
              <Row label="بدل السكن" value={uHousing} onChange={v => setUHousing(num(v))} />
              <Row label="بدل النقل" value={uTransport} onChange={v => setUTransport(num(v))} />
              <Row label="بدلات أخرى" value={uOther} onChange={v => setUOther(num(v))} />
              <Row label="التأمين الصحي" value={uHealth} onChange={v => setUHealth(num(v))} />
              {uNat === "non-saudi" && (
                <>
                  <SectionHeader label="تكاليف العامل غير السعودي (سنوية)" color={"var(--danger-strong)"} />
                  <Row label="رسوم الإقامة (سنوي)" value={uIqama} onChange={v => setUIqama(num(v))} color={"var(--danger-strong)"} />
                  <Row label="تصريح العمل (سنوي)" value={uWorkPermit} onChange={v => setUWorkPermit(num(v))} color={"var(--danger-strong)"} />
                  <Row label="تذاكر السفر (كل سنتين)" value={uTickets} onChange={v => setUTickets(num(v))} color={"var(--danger-strong)"} />
                </>
              )}
            </div>

            {/* قائمة الأسماء أو العدد */}
            <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
              <SectionHeader label="الموظفون" color={"oklch(0.52 0.15 55)"} />
              <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                <div>
                  <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>عدد الموظفين</p>
                  <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>يُستخدم إذا لم تكتب أسماء</p>
                </div>
                <input type="number" min="1" value={bulkCount || ""} onChange={e => setBulkCount(Math.max(1, num(e.target.value)))} placeholder="1"
                  style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
              </div>
              <div className="py-2.5">
                <p className="text-xs mb-1.5" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>أسماء الموظفين (اختياري)</p>
                <p className="text-xs mb-2" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>اكتب اسماً في كل سطر أو افصل بفاصلة — سيتجاهل عدد الموظفين أعلاه</p>
                <textarea
                  value={namesText}
                  onChange={e => setNamesText(e.target.value)}
                  placeholder="أحمد محمد&#10;خالد عبدالله&#10;سارة أحمد&#10;..."
                  rows={6}
                  style={{
                    width: "100%", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`,
                    borderRadius: "10px", padding: "10px", color: "var(--foreground)", fontFamily: F,
                    outline: "none", fontSize: "0.9375rem", resize: "vertical", lineHeight: "1.8",
                  }}
                />
                {namesText.trim() && (
                  <p className="text-xs mt-1" style={{ fontFamily: F, color: "var(--success-strong)" }}>
                    ✓ تم اكتشاف {names.length} اسم
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── النتائج الموحدة ── */}
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "تكلفة الموظف/شهر", val: uResult.total, color: "var(--accent)" },
                { label: "تكلفة الموظف/سنة", val: uResult.total * 12, color: "var(--success-strong)" },
                { label: `إجمالي ${count} موظف/شهر`, val: totalM, color: "var(--primary)" },
                { label: `إجمالي ${count} موظف/سنة`, val: totalY, color: "var(--danger-strong)" },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--card)", border: `1px solid ${color}40` }}>
                  <p className="text-lg font-black" style={{ fontFamily: FS, color }}>{fmt(val)}</p>
                  <p className="text-xs mt-0.5" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label} ر.س</p>
                </div>
              ))}
            </div>

            {/* تفصيل تكلفة الموظف الواحد */}
            <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
              <SectionHeader label="تفصيل تكلفة الموظف الواحد" color={"oklch(0.52 0.15 55)"} />
              <ResRow label="الراتب الإجمالي" value={uResult.gross} />
              <ResRow
                label={`تأمينات صاحب العمل: ${getGosiRates(gosiYear, uNat === "saudi", gosiRatesData).employer}% (${gosiYear}) × الراتب الخاضع للاشتراك`}
                hint={`الراتب الخاضع = إجمالي الراتب والبدلات = ${fmt(uResult.gross)} ر.س`}
                value={uResult.gosi}
              />
              <ResRow label={`ساند صاحب العمل: ${getGosiRates(gosiYear, uNat === "saudi", gosiRatesData).saned}% × الراتب الخاضع`} value={uResult.sanad} />
              <ResRow label="التأمين الصحي" value={uHealth} />
              <ResRow label="إجمالي المباشرة" value={uResult.direct} bold />
              <ResRow label="مخصص نهاية الخدمة" value={uResult.eos} color={"oklch(0.52 0.15 55)"} />
              <ResRow label="مخصص الإجازة" value={uResult.leave} color={"oklch(0.52 0.15 55)"} />
              {uNat === "non-saudi" && <ResRow label="تكاليف غير السعودي" value={uResult.ns} color={"var(--danger-strong)"} />}
              {uNat === "saudi" && uResult.ihtarMihani > 0 && (
                <ResRow
                  label={`إخطار مهني: 2% × ${fmt(uResult.gross)} ر.س (الراتب الخاضع)`}
                  value={uResult.ihtarMihani}
                  color={"var(--info-strong)"}
                />
              )}
              <ResRow label="إجمالي الخفية" value={uResult.hidden} color={"oklch(0.52 0.15 55)"} bold />
            </div>

            {/* قائمة الأسماء */}
            {names.length > 0 && names.length <= 50 && (
              <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
                <SectionHeader label={`قائمة الموظفين (${count})`} color={"oklch(0.52 0.15 55)"} />
                <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
                  {names.map((name, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: "var(--secondary)" }}>
                      <span className="text-xs" style={{ fontFamily: F, color: "var(--foreground)" }}>{name}</span>
                      <span className="text-xs font-bold" style={{ fontFamily: FS, color: "var(--accent)" }}>{fmt(uResult.total)} ر.س</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {names.length > 50 && (
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
                <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>تم اكتشاف {names.length} موظف — راجع تقرير Excel للقائمة الكاملة</p>
              </div>
            )}

            <button onClick={exportUnified}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              style={{ fontFamily: F, background: "var(--success-strong)", color: "white" }}>
              <Download size={13} /> تصدير تقرير Excel ({count} موظف)
            </button>
          </div>
        </div>
      ) : (
        /* ── وضع الجدول السريع ── */
        <div className="space-y-4">
          {/* ملخص */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "إجمالي شهري", val: tableTotal, color: "var(--primary)" },
              { label: "إجمالي سنوي", val: tableTotal * 12, color: "var(--success-strong)" },
              { label: "متوسط/موظف", val: rows.length ? tableTotal / rows.length : 0, color: "var(--accent)" },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--card)", border: `1px solid ${color}40` }}>
                <p className="text-xl font-black" style={{ fontFamily: FS, color }}>{fmt(val)}</p>
                <p className="text-xs mt-0.5" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label} ر.س</p>
              </div>
            ))}
          </div>

          {/* الجدول */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                <thead>
                  <tr style={{ background: "var(--secondary)" }}>
                    {["#", "الاسم", "الجنسية", "سنوات", "الأساسي", "البدلات", "التأمين", "التكلفة/شهر", ""].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "right", fontFamily: F, fontSize: "0.9375rem", color: "var(--muted-foreground)", fontWeight: 700, borderBottom: `1px solid ${"var(--border)"}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableCalcs.map(({ r, res }, idx) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
                      <td style={{ padding: "6px 10px", fontFamily: F, fontSize: "0.9375rem", color: "var(--muted-foreground)" }}>{idx + 1}</td>
                      <td style={{ padding: "6px 6px" }}>
                        <input type="text" value={r.name} onChange={e => updRow(r.id, "name", e.target.value)} placeholder={`موظف ${idx + 1}`}
                          style={{ width: "100px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "6px 10px", color: "var(--foreground)", fontFamily: F, fontSize: "14px", outline: "none" }} />
                      </td>
                      <td style={{ padding: "6px 6px" }}>
                        <select value={r.nat} onChange={e => updRow(r.id, "nat", e.target.value)}
                          style={{ width: "85px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "3px 6px", color: "var(--foreground)", fontFamily: F, fontSize: "14px", outline: "none", cursor: "pointer" }}>
                          <option value="saudi">سعودي</option>
                          <option value="non-saudi">غير سعودي</option>
                        </select>
                      </td>
                      <td style={{ padding: "6px 6px" }}>
                        <input type="number" min="1" value={r.years} onChange={e => updRow(r.id, "years", e.target.value)} placeholder="1"
                          style={{ width: "55px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "3px 6px", color: "var(--foreground)", fontFamily: F, fontSize: "14px", outline: "none", direction: "ltr" }} />
                      </td>
                      <td style={{ padding: "6px 6px" }}>
                        <input type="number" min="0" value={r.basic} onChange={e => updRow(r.id, "basic", e.target.value)} placeholder="0"
                          style={{ width: "80px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "3px 6px", color: "var(--foreground)", fontFamily: F, fontSize: "14px", outline: "none", direction: "ltr" }} />
                      </td>
                      <td style={{ padding: "6px 6px" }}>
                        <input type="number" min="0" value={r.housing} onChange={e => updRow(r.id, "housing", e.target.value)} placeholder="0"
                          style={{ width: "80px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "3px 6px", color: "var(--foreground)", fontFamily: F, fontSize: "14px", outline: "none", direction: "ltr" }} />
                      </td>
                      <td style={{ padding: "6px 6px" }}>
                        <input type="number" min="0" value={r.health} onChange={e => updRow(r.id, "health", e.target.value)} placeholder="0"
                          style={{ width: "70px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "6px", padding: "3px 6px", color: "var(--foreground)", fontFamily: F, fontSize: "14px", outline: "none", direction: "ltr" }} />
                      </td>
                      <td style={{ padding: "6px 10px", fontFamily: FS, fontSize: "0.9375rem", fontWeight: 700, color: "var(--primary)" }}>{fmt(res.total)} ر.س</td>
                      <td style={{ padding: "6px 6px" }}>
                        <button onClick={() => removeRow(r.id)} style={{ background: `${"var(--danger-strong)"}20`, color: "var(--danger-strong)", border: "none", borderRadius: "6px", padding: "3px 7px", cursor: "pointer", fontSize: "14px" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "var(--secondary)", borderTop: `2px solid ${"var(--primary)"}40` }}>
                    <td colSpan={7} style={{ padding: "8px 10px", fontFamily: F, fontSize: "0.9375rem", fontWeight: 700, color: "var(--foreground)" }}>الإجمالي الشهري</td>
                    <td style={{ padding: "8px 10px", fontFamily: FS, fontSize: "0.8rem", fontWeight: 900, color: "var(--primary)" }}>{fmt(tableTotal)} ر.س</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={addRow} className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              style={{ fontFamily: F, background: `${"oklch(0.52 0.15 55)"}15`, color: "var(--accent)", border: `1px dashed ${"oklch(0.52 0.15 55)"}50` }}>
              <Plus size={13} /> إضافة موظف
            </button>
            <button onClick={exportTable} className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              style={{ fontFamily: F, background: "var(--success-strong)", color: "white" }}>
              <Download size={13} /> تصدير Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Comparison Tab: Saudi vs Non-Saudi ────────────────────────────────────────────────────────────────────────────────────────
function ComparisonCalc() {
  const [basic, setBasic] = useState(0);
  const [housing, setHousing] = useState(0);
  const [transport, setTransport] = useState(0);
  const [health, setHealth] = useState(0);
  const [years, setYears] = useState(1);
  const [iqama, setIqama] = useState(1200);
  const [workPermit, setWorkPermit] = useState(800);
  const [tickets, setTickets] = useState(3000);
  const [agencyFee, setAgencyFee] = useState(5000);
  const [gosiYear, setGosiYear] = useState(2026);
  const { data: calculatorData } = api.calculator.getAll.useQuery();
  const gosiRatesData = calculatorData?.gosiRates;

  const saudiEmp = useMemo<Emp>(() => ({
    id: "s", name: "سعودي", dept: "", nationality: "saudi", years,
    basic, housing, transport, comm: 0, food: 0, other: 0,
    health, recruitment: 0, training: 0,
    workPermit: 0, iqama: 0, tickets: 0, agencyFee: 0,
  }), [basic, housing, transport, health, years]);

  const nonSaudiEmp = useMemo<Emp>(() => ({
    id: "ns", name: "غير سعودي", dept: "", nationality: "non-saudi", years,
    basic, housing, transport, comm: 0, food: 0, other: 0,
    health, recruitment: 0, training: 0,
    workPermit, iqama, tickets, agencyFee,
  }), [basic, housing, transport, health, years, workPermit, iqama, tickets, agencyFee]);

  const sR = useMemo(() => calc(saudiEmp, gosiYear, gosiRatesData), [saudiEmp, gosiYear, gosiRatesData]);
  const nsR = useMemo(() => calc(nonSaudiEmp, gosiYear, gosiRatesData), [nonSaudiEmp, gosiYear, gosiRatesData]);
  const diff = sR.total - nsR.total;
  const saudiGosiRates = getGosiRates(gosiYear, true, gosiRatesData);

  function exportCompExcel() {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [
      ["مقارنة تكلفة سعودي مقابل غير سعودي"],
      [],
      ["البند", "سعودي (ر.س/شهر)", "غير سعودي (ر.س/شهر)", "الفرق"],
      ["الراتب الإجمالي", sR.gross, nsR.gross, sR.gross - nsR.gross],
      [`تأمينات صاحب العمل: ${saudiGosiRates.employer}% سعودي / 2% غير سعودي (${gosiYear}) × الراتب الخاضع`, sR.gosi, nsR.gosi, sR.gosi - nsR.gosi],
      ["ساند", sR.sanad, nsR.sanad, sR.sanad - nsR.sanad],
      ["التأمين الصحي", health, health, 0],
      ["إجمالي المباشرة", sR.direct, nsR.direct, sR.direct - nsR.direct],
      [],
      ["إخطار مهني 2% × الراتب الخاضع (للسعوديين فقط)", sR.ihtarMihani, nsR.ihtarMihani, sR.ihtarMihani - nsR.ihtarMihani],
      ["مخصص نهاية الخدمة", sR.eos, nsR.eos, sR.eos - nsR.eos],
      ["مخصص الإجازة", sR.leave, nsR.leave, sR.leave - nsR.leave],
      ["تكاليف خاصة بغير السعودي", 0, nsR.ns, -nsR.ns],
      ["إجمالي الخفية", sR.hidden, nsR.hidden, sR.hidden - nsR.hidden],
      [],
      ["التكلفة الفعلية / شهر", sR.total, nsR.total, sR.total - nsR.total],
      ["التكلفة الفعلية / سنة", sR.total * 12, nsR.total * 12, (sR.total - nsR.total) * 12],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 32 }, { wch: 22 }, { wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, "مقارنة الجنسيات");
    XLSX.writeFile(wb, "saudi-vs-nonsaudi-comparison.xlsx");
  }

  const compRows = [
    { label: "الراتب الإجمالي", s: sR.gross, ns: nsR.gross },
    { label: `تأمينات صاحب العمل (${gosiYear})`, s: sR.gosi, ns: nsR.gosi, hint: `${saudiGosiRates.employer}% سعودي / 2% غير سعودي × الراتب الخاضع للاشتراك في التأمينات الاجتماعية` },
    { label: "ساند صاحب العمل: 0.75% × الراتب الخاضع للاشتراك", s: sR.sanad, ns: nsR.sanad, hint: "للسعوديين فقط" },
    { label: "التأمين الصحي", s: health, ns: health },
    { label: "إجمالي المباشرة", s: sR.direct, ns: nsR.direct, bold: true },
    { label: "إخطار مهني 2% × الراتب الخاضع للاشتراك", s: sR.ihtarMihani, ns: nsR.ihtarMihani, hint: "للسعوديين فقط" },
    { label: "مخصص نهاية الخدمة", s: sR.eos, ns: nsR.eos },
    { label: "مخصص الإجازة", s: sR.leave, ns: nsR.leave },
    { label: "تكاليف غير السعودي", s: 0, ns: nsR.ns, hint: "إقامة + تصريح + تذاكر + استقدام" },
    { label: "إجمالي الخفية", s: sR.hidden, ns: nsR.hidden, bold: true },
    { label: "التكلفة الفعلية / شهر", s: sR.total, ns: nsR.total, bold: true, highlight: true },
    { label: "التكلفة الفعلية / سنة", s: sR.total * 12, ns: nsR.total * 12, bold: true },
  ];

  return (
    <div className="space-y-4">
      {/* سنة التأمينات */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>سنة الاشتراك في التأمينات:</span>
        {[2024, 2025, 2026, 2027].map(y => (
          <button key={y} onClick={() => setGosiYear(y)}
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
            style={{ background: gosiYear === y ? "var(--primary)" : `${"var(--primary)"}20`, color: gosiYear === y ? "white" : "var(--primary)", border: `1px solid ${"var(--primary)"}40` }}>
            {y} — {getGosiRates(y, true, gosiRatesData).employer}%
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
          <SectionHeader label="بيانات مشتركة (نفس الراتب)" color={"var(--primary)"} />
          <p className="text-xs mb-2" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>أدخل بيانات الراتب مرة واحدة — ستُحسب التكلفة لكلا الجنسيتين</p>
          {[
            { label: "الراتب الأساسي", val: basic, set: setBasic },
            { label: "بدل السكن", val: housing, set: setHousing },
            { label: "بدل النقل", val: transport, set: setTransport },
            { label: "التأمين الصحي (شهري)", val: health, set: setHealth },
          ].map(({ label, val, set: setter }) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
              <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</p>
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" value={val || ""} onChange={ev => setter(num(ev.target.value))} placeholder="0"
                  style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
                <span className="text-xs w-6" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>ر.س</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>سنوات الخدمة</p>
            <input type="number" min="1" value={years || ""} onChange={ev => setYears(num(ev.target.value) || 1)} placeholder="1"
              style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
          </div>
          <SectionHeader label="تكاليف العامل غير السعودي" color={"var(--danger-strong)"} />
          {[
            { label: "رسوم الإقامة (سنوية)", val: iqama, set: setIqama },
            { label: "رسوم تصريح العمل (سنوية)", val: workPermit, set: setWorkPermit },
            { label: "تذاكر السفر (كل سنتين)", val: tickets, set: setTickets },
            { label: "رسوم الاستقدام (مرة واحدة)", val: agencyFee, set: setAgencyFee },
          ].map(({ label, val, set: setter }) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
              <p className="text-xs" style={{ fontFamily: F, color: "var(--danger-strong)" }}>{label}</p>
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" value={val || ""} onChange={ev => setter(num(ev.target.value))} placeholder="0"
                  style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
                <span className="text-xs w-6" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>ر.س</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--card)", border: `1px solid ${"var(--success-strong)"}40` }}>
              <p className="text-xs font-bold mb-1" style={{ fontFamily: F, color: "var(--success-strong)" }}>سعودي</p>
              <p className="text-xl font-black" style={{ fontFamily: FS, color: "var(--success-strong)" }}>{fmt(sR.total)}</p>
              <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>ر.س / شهر</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--card)", border: `1px solid ${"var(--danger-strong)"}40` }}>
              <p className="text-xs font-bold mb-1" style={{ fontFamily: F, color: "var(--danger-strong)" }}>غير سعودي</p>
              <p className="text-xl font-black" style={{ fontFamily: FS, color: "var(--danger-strong)" }}>{fmt(nsR.total)}</p>
              <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>ر.س / شهر</p>
            </div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: diff >= 0 ? `${"var(--danger-strong)"}15` : `${"var(--success-strong)"}15`, border: `1px solid ${diff >= 0 ? "var(--danger-strong)" : "var(--success-strong)"}40` }}>
            <p className="text-xs font-bold" style={{ fontFamily: F, color: diff >= 0 ? "var(--danger-strong)" : "var(--success-strong)" }}>
              {diff >= 0 ? `السعودي أغلى بـ ${fmt(Math.abs(diff))} ر.س/شهر` : `غير السعودي أغلى بـ ${fmt(Math.abs(diff))} ر.س/شهر`}
            </p>
            <p className="text-xs mt-0.5" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{fmt(Math.abs(diff) * 12)} ر.س/سنة</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${"var(--border)"}` }}>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--secondary)" }}>
                    <th style={{ padding: "8px 10px", textAlign: "right", fontFamily: F, fontSize: "0.9375rem", color: "var(--muted-foreground)", fontWeight: 700 }}>البند</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontFamily: F, fontSize: "0.9375rem", color: "var(--success-strong)", fontWeight: 700 }}>سعودي</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontFamily: F, fontSize: "0.9375rem", color: "var(--danger-strong)", fontWeight: 700 }}>غير سعودي</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontFamily: F, fontSize: "0.9375rem", color: "var(--accent)", fontWeight: 700 }}>الفرق</th>
                  </tr>
                </thead>
                <tbody>
                  {compRows.map(({ label, s, ns, bold, hint, highlight }: { label: string; s: number; ns: number; bold?: boolean; hint?: string; highlight?: boolean }) => {
                    const d = s - ns;
                    return (
                      <tr key={label} style={{ borderTop: `1px solid ${"var(--border)"}`, background: highlight ? `${"var(--primary)"}10` : "transparent" }}>
                        <td style={{ padding: "6px 10px" }}>
                          <p className={`text-[10px] ${bold ? "font-bold" : ""}`} style={{ fontFamily: F, color: bold ? "var(--foreground)" : "var(--muted-foreground)" }}>{label}</p>
                          {hint && <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{hint}</p>}
                        </td>
                        <td style={{ padding: "6px 10px", textAlign: "center", fontFamily: FS, fontSize: "0.9375rem", fontWeight: bold ? 700 : 400, color: "var(--success-strong)" }}>{fmt(s)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "center", fontFamily: FS, fontSize: "0.9375rem", fontWeight: bold ? 700 : 400, color: "var(--danger-strong)" }}>{fmt(ns)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "center", fontFamily: F, fontSize: "0.9375rem", fontWeight: bold ? 700 : 400, color: d > 0 ? "var(--danger-strong)" : d < 0 ? "var(--success-strong)" : "var(--muted-foreground)" }}>
                          {d > 0 ? `+${fmt(d)}` : d < 0 ? `-${fmt(Math.abs(d))}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={exportCompExcel}
            className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            style={{ fontFamily: F, background: "var(--success-strong)", color: "white" }}>
            <Download size={13} /> تصدير تقرير المقارنة Excel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Turnover Cost Tab ────────────────────────────────────────────────────────
function TurnoverCalc() {
  const [basic, setBasic] = useState(0);
  const [housing, setHousing] = useState(0);
  const [years, setYears] = useState(1);
  const [recruitCost, setRecruitCost] = useState(0);
  const [trainingCost, setTrainingCost] = useState(0);
  const [lowProdMonths, setLowProdMonths] = useState(3);
  const [lowProdPct, setLowProdPct] = useState(50);

  const gross = basic + housing;
  const annualSalary = gross * 12;
  const eos = years <= 5 ? basic * 0.5 * years : (basic * 0.5 * 5) + (basic * (years - 5));
  const lowProdCost = gross * lowProdMonths * (lowProdPct / 100);
  const totalTurnover = eos + recruitCost + trainingCost + lowProdCost;
  const pctOfAnnual = annualSalary > 0 ? (totalTurnover / annualSalary * 100) : 0;

  function exportTurnoverExcel() {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [
      ["حاسبة تكلفة الاستبدال (Turnover Cost)"],
      [],
      ["البند", "المبلغ (ر.س)", "الملاحظة"],
      ["الراتب الأساسي", basic, ""],
      ["بدل السكن", housing, ""],
      ["إجمالي الراتب الشهري", gross, ""],
      ["الراتب السنوي", annualSalary, ""],
      ["سنوات الخدمة", years, ""],
      [],
      ["مكوّنات تكلفة الاستبدال"],
      ["مكافأة نهاية الخدمة", eos, years <= 5 ? "نصف راتب/سنة (≤5 سنوات)" : "راتب كامل/سنة (>5 سنوات)"],
      ["تكلفة التوظيف الجديد", recruitCost, "إعلانات + مقابلات + وكالات"],
      ["تكلفة التدريب والتأهيل", trainingCost, "برامج التدريب الأولي"],
      ["تكلفة الإنتاجية المنخفضة", lowProdCost, `${lowProdMonths} شهر × ${lowProdPct}% من الراتب`],
      [],
      ["إجمالي تكلفة الاستبدال", totalTurnover, ""],
      ["نسبة من الراتب السنوي", `${pctOfAnnual.toFixed(1)}%`, "معيار SHRM: 50-200%"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 36 }, { wch: 22 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, "تكلفة الاستبدال");
    XLSX.writeFile(wb, "turnover-cost.xlsx");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
        <SectionHeader label="بيانات الموظف المغادر" color={"var(--danger-strong)"} />
        {[
          { label: "الراتب الأساسي", val: basic, set: setBasic },
          { label: "بدل السكن", val: housing, set: setHousing },
        ].map(({ label, val, set: setter }) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</p>
            <div className="flex items-center gap-1.5">
              <input type="number" min="0" value={val || ""} onChange={ev => setter(num(ev.target.value))} placeholder="0"
                style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
              <span className="text-xs w-6" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>ر.س</span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <div>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>سنوات الخدمة</p>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>تؤثر على مكافأة نهاية الخدمة</p>
          </div>
          <input type="number" min="1" value={years || ""} onChange={ev => setYears(num(ev.target.value) || 1)} placeholder="1"
            style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
        </div>
        <SectionHeader label="تكاليف الاستبدال" color={"oklch(0.52 0.15 55)"} />
        <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <div>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>تكلفة التوظيف الجديد</p>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>إعلانات + مقابلات + وكالات توظيف</p>
          </div>
          <div className="flex items-center gap-1.5">
            <input type="number" min="0" value={recruitCost || ""} onChange={ev => setRecruitCost(num(ev.target.value))} placeholder="0"
              style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
            <span className="text-xs w-6" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>ر.س</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <div>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>تكلفة التدريب والتأهيل</p>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>برامج التدريب الأولي للموظف الجديد</p>
          </div>
          <div className="flex items-center gap-1.5">
            <input type="number" min="0" value={trainingCost || ""} onChange={ev => setTrainingCost(num(ev.target.value))} placeholder="0"
              style={{ width: "110px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
            <span className="text-xs w-6" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>ر.س</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <div>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>فترة الإنتاجية المنخفضة (شهور)</p>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>حتى يصل الموظف الجديد للكفاءة الكاملة</p>
          </div>
          <div className="flex items-center gap-1.5">
            <input type="number" min="1" max="12" value={lowProdMonths || ""} onChange={ev => setLowProdMonths(num(ev.target.value) || 1)} placeholder="3"
              style={{ width: "60px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
            <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>شهر</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <div>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>نسبة الإنتاجية خلال الفترة</p>
            <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>كم يُنجز الموظف الجديد من العمل الكامل؟</p>
          </div>
          <div className="flex items-center gap-1.5">
            <input type="number" min="0" max="100" value={lowProdPct || ""} onChange={ev => setLowProdPct(num(ev.target.value))} placeholder="50"
              style={{ width: "60px", background: "var(--secondary)", border: `1px solid ${"var(--border)"}`, borderRadius: "8px", padding: "7px 10px", color: "var(--foreground)", fontFamily: F, outline: "none", direction: "ltr", fontSize: "0.9375rem" }} />
            <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>%</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "مكافأة نهاية الخدمة", val: eos, color: "var(--danger-strong)" },
            { label: "تكلفة التوظيف", val: recruitCost, color: "var(--accent)" },
            { label: "تكلفة التدريب", val: trainingCost, color: "var(--info-strong)" },
            { label: "إنتاجية منخفضة", val: lowProdCost, color: "var(--primary)" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--card)", border: `1px solid ${color}40` }}>
              <p className="text-lg font-black" style={{ fontFamily: FS, color }}>{fmt(val)}</p>
              <p className="text-xs mt-0.5" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label} ر.س</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-4" style={{ background: `${"var(--danger-strong)"}15`, border: `1px solid ${"var(--danger-strong)"}50` }}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold" style={{ fontFamily: F, color: "var(--foreground)" }}>إجمالي تكلفة الاستبدال</span>
            <span className="text-2xl font-black" style={{ fontFamily: FS, color: "var(--danger-strong)" }}>{fmt(totalTurnover)} ر.س</span>
          </div>
          {annualSalary > 0 && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>نسبة من الراتب السنوي</span>
              <span className="text-sm font-bold" style={{ fontFamily: F, color: pctOfAnnual > 150 ? "var(--danger-strong)" : pctOfAnnual > 75 ? "oklch(0.52 0.15 55)" : "var(--success-strong)" }}>
                {fmtD(pctOfAnnual)}%
              </span>
            </div>
          )}
          <p className="text-xs mt-2 leading-relaxed" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>
            وفق معايير SHRM: تكلفة الاستبدال تتراوح بين 50-200% من الراتب السنوي
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
          <SectionHeader label="تفصيل التكاليف" color={"oklch(0.52 0.15 55)"} />
          {[
            { label: "مكافأة نهاية الخدمة", val: eos, hint: years <= 5 ? "نصف راتب/سنة" : "راتب كامل/سنة", color: "var(--danger-strong)" },
            { label: "تكلفة التوظيف الجديد", val: recruitCost, color: "var(--accent)" },
            { label: "تكلفة التدريب والتأهيل", val: trainingCost, color: "var(--info-strong)" },
            { label: "تكلفة الإنتاجية المنخفضة", val: lowProdCost, hint: `${lowProdMonths} شهر × ${lowProdPct}% من الراتب`, color: "var(--primary)" },
          ].map(({ label, val, hint, color }) => (
            <div key={label} className="flex items-start justify-between py-1.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
              <div>
                <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</p>
                {hint && <p className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{hint}</p>}
              </div>
              <span className="text-xs font-bold" style={{ fontFamily: F, color }}>{fmt(val)} ر.س</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs font-bold" style={{ fontFamily: F, color: "var(--foreground)" }}>الإجمالي</span>
            <span className="text-sm font-black" style={{ fontFamily: FS, color: "var(--danger-strong)" }}>{fmt(totalTurnover)} ر.س</span>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
          <p className="text-base font-bold mb-3" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>معيار SHRM للمقارنة</p>
          {[
            { label: "وظائف منخفضة المهارة", pct: "50%", color: "var(--success-strong)" },
            { label: "وظائف متوسطة المهارة", pct: "75-100%", color: "var(--accent)" },
            { label: "وظائف عالية المهارة / قيادية", pct: "100-200%", color: "var(--danger-strong)" },
          ].map(({ label, pct, color }) => (
            <div key={label} className="flex justify-between items-center py-1" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
              <span className="text-xs" style={{ fontFamily: F, color: "var(--muted-foreground)" }}>{label}</span>
              <span className="text-xs font-bold" style={{ fontFamily: F, color }}>{pct} من الراتب السنوي</span>
            </div>
          ))}
          {annualSalary > 0 && (
            <div className="mt-2 p-2 rounded-lg" style={{ background: `${"var(--primary)"}15` }}>
              <p className="text-xs font-bold text-center" style={{ fontFamily: F, color: "var(--primary)" }}>
                نطاق التكلفة المتوقع: {fmt(annualSalary * 0.5)} — {fmt(annualSalary * 2)} ر.س
              </p>
            </div>
          )}
        </div>
        <button onClick={exportTurnoverExcel}
          className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
          style={{ fontFamily: F, background: "var(--success-strong)", color: "white" }}>
          <Download size={13} /> تصدير تقرير الاستبدال Excel
        </button>
      </div>
    </div>
  );
}

// ─── Mode Selection Card ─────────────────────────────────────────────────────
const MODES = [
  {
    key: "single" as const,
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="24" cy="16" r="9" fill="color-mix(in oklch, var(--primary) 15%, transparent)" stroke="var(--primary)" strokeWidth="2"/>
        <path d="M8 40c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "إدخال بيانات موظف واحد",
    subtitle: "Single Employee Cost",
    desc: "احسب التكلفة الفعلية الشاملة لموظف واحد بما فيها التكاليف الخفية وفق معايير SHRM & CIPD",
    badge: "الأكثر استخداماً",
    badgeColor: "var(--primary)",
    accent: "var(--primary)",
    features: ["الراتب والبدلات", "التأمينات الاجتماعية", "نهاية الخدمة والإجازة", "ROI ومقارنة السوق"],
  },
  {
    key: "dept" as const,
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="14" cy="16" r="7" fill="oklch(0.55 0.18 145 / 0.15)" stroke="var(--success-strong)" strokeWidth="2"/>
        <circle cx="34" cy="16" r="7" fill="oklch(0.55 0.18 145 / 0.15)" stroke="var(--success-strong)" strokeWidth="2"/>
        <circle cx="24" cy="14" r="7" fill="oklch(0.55 0.18 145 / 0.15)" stroke="var(--success-strong)" strokeWidth="2"/>
        <path d="M4 40c0-5.523 4.477-10 10-10M44 40c0-5.523-4.477-10-10-10M14 40c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="var(--success-strong)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "إدخال بيانات كافة الموظفين",
    subtitle: "Full Workforce Cost Analysis",
    desc: "أدخل بيانات جميع موظفي المنشأة أو الإدارة واحصل على تقرير شامل للتكاليف الكلية",
    badge: "تقرير شامل",
    badgeColor: "var(--success-strong)",
    accent: "var(--success-strong)",
    features: ["إضافة موظفين متعددين", "ملخص تكاليف الإدارة", "توزيع السعوديين/غير السعوديين", "تصدير Excel"],
  },
  {
    key: "compare" as const,
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <rect x="4" y="8" width="18" height="32" rx="4" fill="oklch(0.62 0.20 55 / 0.15)" stroke="var(--accent)" strokeWidth="2"/>
        <rect x="26" y="8" width="18" height="32" rx="4" fill="color-mix(in oklch, var(--primary) 15%, transparent)" stroke="var(--primary)" strokeWidth="2"/>
        <path d="M13 20h8M13 26h5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M35 20h-8M35 26h-5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="13" cy="14" r="3" fill="oklch(0.62 0.20 55 / 0.3)" stroke="var(--accent)" strokeWidth="1.5"/>
        <circle cx="35" cy="14" r="3" fill="color-mix(in oklch, var(--primary) 30%, transparent)" stroke="var(--primary)" strokeWidth="1.5"/>
      </svg>
    ),
    title: "المقارنة بين سعودي وغير سعودي",
    subtitle: "Saudi vs Non-Saudi Cost Comparison",
    desc: "قارن التكلفة الفعلية الكاملة بين توظيف مواطن سعودي ومقيم غير سعودي بنفس الراتب",
    badge: "قرار استراتيجي",
    badgeColor: "var(--accent)",
    accent: "var(--accent)",
    features: ["مقارنة التأمينات الاجتماعية", "تكاليف الإقامة والتصاريح", "تأثير نطاقات السعودة", "توصية مالية واضحة"],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EmployeeCostPage() {
  const [, navigate] = useLocation();
  const { t } = useLang();
  const [tab, setTab] = useState<"single" | "dept" | "compare" | null>(null);

  // ── Landing: mode selection ──
  if (!tab) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: F }} dir="rtl">
        {/* Header */}
        <div className="sticky top-0 z-10 px-5 py-4 flex items-center gap-3"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", boxShadow: "0 1px 8px color-mix(in oklch, var(--primary) 6%, transparent)" }}>
          <button onClick={() => navigate("/")} className="p-2 rounded-xl transition-all hover:bg-secondary"
            style={{ color: "var(--muted-foreground)" }}>
            <ArrowRight size={18} />
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <Users size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>
              {t("حاسبة تكاليف الموظفين", "Employee Cost Calculator")}
            </h1>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {t("التكلفة الفعلية = الراتب + التكاليف الخفية | وفق SHRM & CIPD", "True Cost = Salary + Hidden Costs | Per SHRM & CIPD")}
            </p>
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-4xl mx-auto px-5 pt-12 pb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-sm font-semibold"
            style={{ background: "color-mix(in oklch, var(--primary) 8%, transparent)", border: "1px solid color-mix(in oklch, var(--primary) 25%, transparent)", color: "var(--primary)" }}>
            <span>📊</span>
            <span>وفق معايير SHRM & CIPD الدولية</span>
          </div>
          <h2 className="text-3xl font-black mb-3 leading-tight" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>
            اختر نوع الحساب
          </h2>
          <p className="text-base leading-relaxed max-w-lg mx-auto" style={{ color: "var(--muted-foreground)" }}>
            احسب التكلفة الفعلية الشاملة للموظفين بما تشمل التكاليف الخفية التي يغفل عنها أصحاب العمل
          </p>
        </div>

        {/* Mode Cards */}
        <div className="max-w-5xl mx-auto px-5 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {MODES.map((mode) => (
              <button
                key={mode.key}
                onClick={() => setTab(mode.key)}
                className="group text-right rounded-2xl p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]"
                style={{
                  background: "var(--card)",
                  border: `2px solid var(--border)`,
                  boxShadow: "0 2px 12px color-mix(in oklch, var(--primary) 5%, transparent)",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = mode.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--foreground)")}
              >
                {/* Badge */}
                <div className="flex items-start justify-between mb-4">
                  <span className="inline-block rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: `${mode.accent}15`, color: mode.accent }}>
                    {mode.badge}
                  </span>
                  <div style={{ color: mode.accent }}>{mode.icon}</div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-black mb-1 leading-snug" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>
                  {mode.title}
                </h3>
                <p className="text-xs font-semibold mb-3" style={{ color: mode.accent }}>{mode.subtitle}</p>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--muted-foreground)" }}>
                  {mode.desc}
                </p>

                {/* Features */}
                <ul className="space-y-1.5 mb-5">
                  {mode.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                      <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                        style={{ background: mode.accent }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="flex items-center justify-between pt-4"
                  style={{ borderTop: "1px solid var(--card)" }}>
                  <span className="text-sm font-bold" style={{ color: mode.accent }}>ابدأ الحساب</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                    style={{ background: `${mode.accent}15`, color: mode.accent }}>
                    <ArrowRight size={14} style={{ transform: "rotate(180deg)" }} />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Info strip */}
          <div className="mt-8 rounded-2xl p-5 flex flex-wrap gap-6 items-center justify-center"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {[
              { label: "معيار SHRM", desc: "التكاليف الخفية 20-35% من الراتب" },
              { label: "معيار CIPD", desc: "التكلفة الحقيقية = 1.25-1.4× الراتب" },
              { label: "نطاقات 2026", desc: "تأمينات صاحب العمل 10% + ساند 0.75%" },
            ].map(({ label, desc }) => (
              <div key={label} className="text-center">
                <p className="text-sm font-black" style={{ color: "var(--primary)" }}>{label}</p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Active mode ──
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div className="sticky top-0 z-10 px-5 py-3 flex items-center gap-3"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", boxShadow: "0 1px 8px color-mix(in oklch, var(--primary) 6%, transparent)" }}>
        <button onClick={() => setTab(null)} className="p-2 rounded-xl transition-all hover:bg-secondary"
          style={{ color: "var(--muted-foreground)" }}>
          <ArrowRight size={18} />
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: MODES.find(m => m.key === tab)?.accent || "var(--primary)" }}>
          <Users size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-black" style={{ fontFamily: "'Noto Naskh Arabic', serif", color: "var(--foreground)" }}>
            {MODES.find(m => m.key === tab)?.title}
          </h1>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            حاسبة تكاليف الموظفين | وفق SHRM & CIPD
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {tab === "single" ? <SingleCalc /> : tab === "dept" ? <DeptCalc /> : <ComparisonCalc />}
      </div>
    </div>
  );
}
