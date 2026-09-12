/**
 * excelUtils.ts
 * دوال مساعدة لتجميل ملفات Excel وإدراج لوغو الشركة
 * تستخدم مكتبة xlsx-js-style للتنسيق المتقدم
 */
import * as XLSX from "xlsx";

// ── أنواع مساعدة ──────────────────────────────────────────────────────────────
export interface ExcelBrandingData {
  logoBase64: string | null;
  companyName: string;
  contactInfo: string;
}

// ── ألوان الثيم الاحترافي ────────────────────────────────────────────────────
export const XL_COLORS = {
  // الرأس الداكن (كحلي)
  headerBg: "1E2A4A",
  headerFg: "FFFFFF",
  // صف العنوان الفرعي (ذهبي فاتح)
  subHeaderBg: "C9A84C",
  subHeaderFg: "1E2A4A",
  // صفوف زوجية (رمادي فاتح جداً)
  evenRowBg: "F5F7FA",
  // صفوف فردية (أبيض)
  oddRowBg: "FFFFFF",
  // صف الإجمالي (كحلي فاتح)
  totalBg: "2D3E6B",
  totalFg: "FFFFFF",
  // حدود
  border: "CBD5E1",
  // نص عادي
  textDark: "1E293B",
  textMuted: "64748B",
  // تمييز إيجابي / سلبي
  positive: "166534",
  positiveBg: "DCFCE7",
  negative: "991B1B",
  negativeBg: "FEE2E2",
  // لوغو خلفية
  logoBg: "F8FAFC",
};

// ── نمط خلية ────────────────────────────────────────────────────────────────
type CellStyle = {
  font?: { bold?: boolean; sz?: number; color?: { rgb: string }; name?: string };
  fill?: { fgColor: { rgb: string } };
  alignment?: { horizontal?: "center" | "right" | "left"; vertical?: "center"; wrapText?: boolean; readingOrder?: number };
  border?: {
    top?: { style: string; color: { rgb: string } };
    bottom?: { style: string; color: { rgb: string } };
    left?: { style: string; color: { rgb: string } };
    right?: { style: string; color: { rgb: string } };
  };
  numFmt?: string;
};

/** تطبيق نمط على خلية */
export function styleCell(ws: XLSX.WorkSheet, addr: string, style: CellStyle) {
  if (!ws[addr]) ws[addr] = { t: "z", v: "" };
  (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = style;
}

/** نمط حدود موحّدة */
function borders(color = XL_COLORS.border) {
  return {
    top: { style: "thin", color: { rgb: color } },
    bottom: { style: "thin", color: { rgb: color } },
    left: { style: "thin", color: { rgb: color } },
    right: { style: "thin", color: { rgb: color } },
  };
}

// ── بناء رأس الورقة مع بيانات الشركة ────────────────────────────────────────
/**
 * يُضيف صفوف رأس احترافية (اسم الشركة + تاريخ التقرير + عنوان التقرير)
 * ويعيد عدد الصفوف المُضافة لتعديل بقية الصفوف
 */
export function buildSheetHeader(
  ws: XLSX.WorkSheet,
  branding: ExcelBrandingData,
  reportTitle: string,
  colCount: number,
): number {
  const lastCol = XLSX.utils.encode_col(colCount - 1);
  const today = new Date().toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let row = 1;

  // ── صف اسم الشركة ──
  if (branding.companyName) {
    const addr = `A${row}`;
    ws[addr] = { t: "s", v: branding.companyName };
    (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
      font: { bold: true, sz: 16, color: { rgb: XL_COLORS.headerFg }, name: "Cairo" },
      fill: { fgColor: { rgb: XL_COLORS.headerBg } },
      alignment: { horizontal: "center", vertical: "center", readingOrder: 2 },
      border: borders(XL_COLORS.headerBg),
    };
    // دمج خلايا الصف
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({
      s: { r: row - 1, c: 0 },
      e: { r: row - 1, c: colCount - 1 },
    });
    // تلوين باقي خلايا الصف
    for (let c = 1; c < colCount; c++) {
      const a = `${XLSX.utils.encode_col(c)}${row}`;
      if (!ws[a]) ws[a] = { t: "z", v: "" };
      (ws[a] as XLSX.CellObject & { s?: CellStyle }).s = {
        fill: { fgColor: { rgb: XL_COLORS.headerBg } },
        border: borders(XL_COLORS.headerBg),
      };
    }
    row++;
  }

  // ── صف معلومات الاتصال ──
  if (branding.contactInfo) {
    const addr = `A${row}`;
    ws[addr] = { t: "s", v: branding.contactInfo.replace(/\n/g, "  |  ") };
    (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
      font: { sz: 9, color: { rgb: "94A3B8" }, name: "Cairo" },
      fill: { fgColor: { rgb: XL_COLORS.headerBg } },
      alignment: { horizontal: "center", vertical: "center", readingOrder: 2 },
    };
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({
      s: { r: row - 1, c: 0 },
      e: { r: row - 1, c: colCount - 1 },
    });
    for (let c = 1; c < colCount; c++) {
      const a = `${XLSX.utils.encode_col(c)}${row}`;
      if (!ws[a]) ws[a] = { t: "z", v: "" };
      (ws[a] as XLSX.CellObject & { s?: CellStyle }).s = {
        fill: { fgColor: { rgb: XL_COLORS.headerBg } },
      };
    }
    row++;
  }

  // ── صف عنوان التقرير ──
  {
    const addr = `A${row}`;
    ws[addr] = { t: "s", v: reportTitle };
    (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
      font: { bold: true, sz: 13, color: { rgb: XL_COLORS.subHeaderFg }, name: "Cairo" },
      fill: { fgColor: { rgb: XL_COLORS.subHeaderBg } },
      alignment: { horizontal: "center", vertical: "center", readingOrder: 2 },
      border: borders(XL_COLORS.subHeaderBg),
    };
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({
      s: { r: row - 1, c: 0 },
      e: { r: row - 1, c: colCount - 1 },
    });
    for (let c = 1; c < colCount; c++) {
      const a = `${XLSX.utils.encode_col(c)}${row}`;
      if (!ws[a]) ws[a] = { t: "z", v: "" };
      (ws[a] as XLSX.CellObject & { s?: CellStyle }).s = {
        fill: { fgColor: { rgb: XL_COLORS.subHeaderBg } },
        border: borders(XL_COLORS.subHeaderBg),
      };
    }
    row++;
  }

  // ── صف التاريخ ──
  {
    const addr = `A${row}`;
    ws[addr] = { t: "s", v: `تاريخ التقرير: ${today}` };
    (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
      font: { sz: 9, color: { rgb: XL_COLORS.textMuted }, name: "Cairo" },
      fill: { fgColor: { rgb: XL_COLORS.evenRowBg } },
      alignment: { horizontal: "center", vertical: "center", readingOrder: 2 },
    };
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({
      s: { r: row - 1, c: 0 },
      e: { r: row - 1, c: colCount - 1 },
    });
    for (let c = 1; c < colCount; c++) {
      const a = `${XLSX.utils.encode_col(c)}${row}`;
      if (!ws[a]) ws[a] = { t: "z", v: "" };
      (ws[a] as XLSX.CellObject & { s?: CellStyle }).s = {
        fill: { fgColor: { rgb: XL_COLORS.evenRowBg } },
      };
    }
    row++;
  }

  // ── صف فاصل فارغ ──
  row++;

  return row - 1; // عدد الصفوف المُضافة
}

// ── تطبيق نمط رأس الجدول ────────────────────────────────────────────────────
export function styleHeaderRow(ws: XLSX.WorkSheet, rowNum: number, colCount: number) {
  for (let c = 0; c < colCount; c++) {
    const addr = `${XLSX.utils.encode_col(c)}${rowNum}`;
    if (!ws[addr]) ws[addr] = { t: "z", v: "" };
    (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
      font: { bold: true, sz: 10, color: { rgb: XL_COLORS.headerFg }, name: "Cairo" },
      fill: { fgColor: { rgb: XL_COLORS.headerBg } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 },
      border: borders(XL_COLORS.headerBg),
    };
  }
}

// ── تطبيق نمط صف بيانات ─────────────────────────────────────────────────────
export function styleDataRow(
  ws: XLSX.WorkSheet,
  rowNum: number,
  colCount: number,
  isEven: boolean,
  isTotal = false,
) {
  const bg = isTotal
    ? XL_COLORS.totalBg
    : isEven
    ? XL_COLORS.evenRowBg
    : XL_COLORS.oddRowBg;
  const fg = isTotal ? XL_COLORS.totalFg : XL_COLORS.textDark;

  for (let c = 0; c < colCount; c++) {
    const addr = `${XLSX.utils.encode_col(c)}${rowNum}`;
    if (!ws[addr]) ws[addr] = { t: "z", v: "" };
    const cell = ws[addr] as XLSX.CellObject & { s?: CellStyle };
    cell.s = {
      font: { sz: 10, color: { rgb: fg }, bold: isTotal, name: "Cairo" },
      fill: { fgColor: { rgb: bg } },
      alignment: {
        horizontal: c === 0 ? "right" : "center",
        vertical: "center",
        readingOrder: 2,
      },
      border: borders(XL_COLORS.border),
    };
  }
}

// ── تطبيق تنسيق كامل على ورقة Excel ─────────────────────────────────────────
/**
 * يُطبّق التنسيق الاحترافي على ورقة Excel كاملة
 * @param ws ورقة العمل
 * @param branding بيانات الشركة
 * @param reportTitle عنوان التقرير
 * @param colWidths عرض الأعمدة
 * @param dataStartRow الصف الذي تبدأ منه البيانات (بعد الرأس)
 * @param totalRows أرقام صفوف الإجمالي (اختياري)
 */
export function applyExcelStyle(
  ws: XLSX.WorkSheet,
  branding: ExcelBrandingData,
  reportTitle: string,
  colWidths: number[],
  dataStartRow: number,
  totalRows: number[] = [],
) {
  const colCount = colWidths.length;

  // ضبط عرض الأعمدة
  ws["!cols"] = colWidths.map(w => ({ wch: w }));

  // ضبط ارتفاع الصفوف
  if (!ws["!rows"]) ws["!rows"] = [];

  // بناء رأس الشركة
  const headerRowCount = buildSheetHeader(ws, branding, reportTitle, colCount);

  // ضبط ارتفاع صفوف الرأس
  for (let r = 0; r < headerRowCount; r++) {
    ws["!rows"][r] = { hpt: r === 0 && branding.companyName ? 30 : r === headerRowCount - 2 ? 28 : 18 };
  }

  // تنسيق صف رؤوس الأعمدة
  const colHeaderRow = dataStartRow + headerRowCount;
  styleHeaderRow(ws, colHeaderRow, colCount);
  ws["!rows"][colHeaderRow - 1] = { hpt: 22 };

  // تنسيق صفوف البيانات
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let r = colHeaderRow; r <= range.e.r + 1; r++) {
    const isTotal = totalRows.includes(r);
    styleDataRow(ws, r, colCount, r % 2 === 0, isTotal);
    ws["!rows"][r - 1] = { hpt: isTotal ? 22 : 18 };
  }
}

// ── بناء ورقة Excel من مصفوفة بيانات مع تنسيق كامل ─────────────────────────
export function buildStyledSheet(
  data: (string | number | null)[][],
  branding: ExcelBrandingData,
  reportTitle: string,
  colWidths: number[],
  totalRowIndices: number[] = [],
): XLSX.WorkSheet {
  // إضافة صفوف الرأس الفارغة في أعلى المصفوفة
  const colCount = colWidths.length;
  const companyRows: (string | number | null)[][] = [];
  if (branding.companyName) companyRows.push([branding.companyName, ...Array(colCount - 1).fill("")]);
  if (branding.contactInfo) companyRows.push([branding.contactInfo, ...Array(colCount - 1).fill("")]);
  companyRows.push([reportTitle, ...Array(colCount - 1).fill("")]);
  companyRows.push([`تاريخ التقرير: ${new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}`, ...Array(colCount - 1).fill("")]);
  companyRows.push(Array(colCount).fill("")); // صف فاصل

  const headerOffset = companyRows.length;
  const allData = [...companyRows, ...data];
  const ws = XLSX.utils.aoa_to_sheet(allData);

  // ضبط عرض الأعمدة
  ws["!cols"] = colWidths.map(w => ({ wch: w }));
  if (!ws["!rows"]) ws["!rows"] = [];
  if (!ws["!merges"]) ws["!merges"] = [];

  // دمج صفوف الرأس
  let r = 0;
  if (branding.companyName) {
    ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    ws["!rows"][r] = { hpt: 30 };
    // تلوين صف اسم الشركة
    for (let c = 0; c < colCount; c++) {
      const addr = `${XLSX.utils.encode_col(c)}${r + 1}`;
      if (!ws[addr]) ws[addr] = { t: "z", v: "" };
      (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
        font: c === 0 ? { bold: true, sz: 16, color: { rgb: XL_COLORS.headerFg }, name: "Cairo" } : undefined,
        fill: { fgColor: { rgb: XL_COLORS.headerBg } },
        alignment: { horizontal: "center", vertical: "center", readingOrder: 2 },
        border: { top: { style: "thin", color: { rgb: XL_COLORS.headerBg } }, bottom: { style: "thin", color: { rgb: XL_COLORS.headerBg } }, left: { style: "thin", color: { rgb: XL_COLORS.headerBg } }, right: { style: "thin", color: { rgb: XL_COLORS.headerBg } } },
      };
    }
    r++;
  }
  if (branding.contactInfo) {
    ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    ws["!rows"][r] = { hpt: 16 };
    for (let c = 0; c < colCount; c++) {
      const addr = `${XLSX.utils.encode_col(c)}${r + 1}`;
      if (!ws[addr]) ws[addr] = { t: "z", v: "" };
      (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
        font: c === 0 ? { sz: 9, color: { rgb: "94A3B8" }, name: "Cairo" } : undefined,
        fill: { fgColor: { rgb: XL_COLORS.headerBg } },
        alignment: { horizontal: "center", vertical: "center", readingOrder: 2 },
      };
    }
    r++;
  }
  // صف عنوان التقرير
  ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
  ws["!rows"][r] = { hpt: 26 };
  for (let c = 0; c < colCount; c++) {
    const addr = `${XLSX.utils.encode_col(c)}${r + 1}`;
    if (!ws[addr]) ws[addr] = { t: "z", v: "" };
    (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
      font: c === 0 ? { bold: true, sz: 13, color: { rgb: XL_COLORS.subHeaderFg }, name: "Cairo" } : undefined,
      fill: { fgColor: { rgb: XL_COLORS.subHeaderBg } },
      alignment: { horizontal: "center", vertical: "center", readingOrder: 2 },
    };
  }
  r++;
  // صف التاريخ
  ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
  ws["!rows"][r] = { hpt: 16 };
  for (let c = 0; c < colCount; c++) {
    const addr = `${XLSX.utils.encode_col(c)}${r + 1}`;
    if (!ws[addr]) ws[addr] = { t: "z", v: "" };
    (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
      font: c === 0 ? { sz: 9, color: { rgb: XL_COLORS.textMuted }, name: "Cairo" } : undefined,
      fill: { fgColor: { rgb: XL_COLORS.evenRowBg } },
      alignment: { horizontal: "center", vertical: "center", readingOrder: 2 },
    };
  }
  r++;
  // صف فاصل
  ws["!rows"][r] = { hpt: 6 };
  r++;

  // تنسيق صف رؤوس الأعمدة (أول صف بيانات)
  const colHeaderRowIdx = r; // 0-indexed
  ws["!rows"][colHeaderRowIdx] = { hpt: 22 };
  for (let c = 0; c < colCount; c++) {
    const addr = `${XLSX.utils.encode_col(c)}${colHeaderRowIdx + 1}`;
    if (!ws[addr]) ws[addr] = { t: "z", v: "" };
    (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
      font: { bold: true, sz: 10, color: { rgb: XL_COLORS.headerFg }, name: "Cairo" },
      fill: { fgColor: { rgb: XL_COLORS.headerBg } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 },
      border: { top: { style: "thin", color: { rgb: XL_COLORS.headerBg } }, bottom: { style: "thin", color: { rgb: XL_COLORS.headerBg } }, left: { style: "thin", color: { rgb: XL_COLORS.headerBg } }, right: { style: "thin", color: { rgb: XL_COLORS.headerBg } } },
    };
  }
  r++;

  // تنسيق صفوف البيانات
  const dataRowCount = data.length - 1; // -1 لصف الرؤوس
  for (let i = 0; i < dataRowCount; i++) {
    const rowIdx = r + i; // 0-indexed
    const dataRowNum = i; // رقم الصف في data (بعد صف الرؤوس)
    const isTotal = totalRowIndices.includes(dataRowNum);
    const bg = isTotal ? XL_COLORS.totalBg : i % 2 === 0 ? XL_COLORS.evenRowBg : XL_COLORS.oddRowBg;
    const fg = isTotal ? XL_COLORS.totalFg : XL_COLORS.textDark;
    ws["!rows"][rowIdx] = { hpt: isTotal ? 22 : 18 };
    for (let c = 0; c < colCount; c++) {
      const addr = `${XLSX.utils.encode_col(c)}${rowIdx + 1}`;
      if (!ws[addr]) ws[addr] = { t: "z", v: "" };
      (ws[addr] as XLSX.CellObject & { s?: CellStyle }).s = {
        font: { sz: 10, color: { rgb: fg }, bold: isTotal, name: "Cairo" },
        fill: { fgColor: { rgb: bg } },
        alignment: {
          horizontal: c === 0 ? "right" : "center",
          vertical: "center",
          readingOrder: 2,
        },
        border: {
          top: { style: "thin", color: { rgb: XL_COLORS.border } },
          bottom: { style: "thin", color: { rgb: XL_COLORS.border } },
          left: { style: "thin", color: { rgb: XL_COLORS.border } },
          right: { style: "thin", color: { rgb: XL_COLORS.border } },
        },
      };
    }
  }

  return ws;
}

/** تنسيق رقم بالفاصلة */
export function fmtNum(n: number, decimals = 0): string {
  return n.toLocaleString("ar-SA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
