/**
 * ExcelBrandingBar
 * شريط مشترك يظهر في أعلى كل صفحة حاسبة
 * يتيح رفع لوغو الشركة وكتابة اسمها ومعلومات الاتصال
 * تُحفظ البيانات في localStorage وتُستخدم تلقائياً عند تصدير Excel
 */
import { useRef, useState } from "react";
import { useExcelBranding } from "@/contexts/ExcelBrandingContext";
import { Building2, Upload, X, ChevronDown, ChevronUp } from "lucide-react";

const F = "'Cairo', sans-serif";

// ألوان متوافقة مع ثيم المنصة
const C = {
  card: "var(--background)",
  border: "var(--background)",
  text: "var(--foreground)",
  sub: "var(--muted-foreground)",
  muted: "var(--muted-foreground)",
  amber: "oklch(0.75 0.15 65)",
  green: "oklch(0.65 0.18 145)",
  inner: "var(--background)",
};

export function ExcelBrandingBar() {
  const { logoBase64, companyName, contactInfo, setLogo, setCompanyName, setContactInfo, clearBranding } =
    useExcelBranding();
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => setLogo(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  const hasBranding = logoBase64 || companyName;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      {/* ── رأس الشريط (قابل للطي) ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-all"
        style={{ fontFamily: F }}
      >
        <div className="flex items-center gap-2">
          <Building2 size={15} style={{ color: C.amber }} />
          <span className="text-xs font-bold" style={{ color: C.amber }}>
            هوية الشركة في Excel
          </span>
          {hasBranding && (
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: `${C.green}25`, color: C.green, border: `1px solid ${C.green}40` }}
            >
              محفوظة
            </span>
          )}
          <span className="text-[9px]" style={{ color: C.muted }}>
            — اللوغو واسم الشركة سيظهران في ملفات Excel المُصدَّرة
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={14} style={{ color: C.muted }} />
        ) : (
          <ChevronDown size={14} style={{ color: C.muted }} />
        )}
      </button>

      {/* ── المحتوى (يظهر عند التوسيع) ── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* رفع اللوغو */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold" style={{ fontFamily: F, color: C.sub }}>
                لوغو الشركة
              </p>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className="relative flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all"
                style={{
                  height: "80px",
                  border: `2px dashed ${dragOver ? C.amber : C.border}`,
                  background: dragOver ? `${C.amber}10` : C.inner,
                }}
              >
                {logoBase64 ? (
                  <>
                    <img
                      src={logoBase64}
                      alt="لوغو الشركة"
                      className="max-h-14 max-w-full object-contain rounded"
                    />
                    <button
                      onClick={e => { e.stopPropagation(); setLogo(null); }}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "oklch(0.55 0.22 20)", color: "white" }}
                    >
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={18} style={{ color: C.muted }} />
                    <p className="text-[9px] mt-1" style={{ fontFamily: F, color: C.muted }}>
                      اسحب أو انقر للرفع
                    </p>
                    <p className="text-[8px]" style={{ fontFamily: F, color: C.muted }}>
                      PNG / JPG / SVG
                    </p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>

            {/* اسم الشركة */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold" style={{ fontFamily: F, color: C.sub }}>
                اسم الشركة / المنشأة
              </p>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="مثال: شركة مواكبة للموارد البشرية"
                className="w-full rounded-xl px-3 py-2 text-xs outline-none"
                style={{
                  fontFamily: F,
                  background: C.inner,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  direction: "rtl",
                }}
              />
              <p className="text-[9px]" style={{ fontFamily: F, color: C.muted }}>
                يظهر في رأس كل ورقة Excel
              </p>
            </div>

            {/* معلومات الاتصال */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold" style={{ fontFamily: F, color: C.sub }}>
                معلومات الاتصال (اختياري)
              </p>
              <textarea
                value={contactInfo}
                onChange={e => setContactInfo(e.target.value)}
                placeholder={"مثال:\nهاتف: 0500000000\nالبريد: info@company.com"}
                rows={3}
                className="w-full rounded-xl px-3 py-2 text-xs outline-none resize-none"
                style={{
                  fontFamily: F,
                  background: C.inner,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  direction: "rtl",
                }}
              />
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex items-center gap-2 pt-1">
            {hasBranding && (
              <button
                onClick={clearBranding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: "oklch(0.55 0.22 20 / 0.15)",
                  color: "oklch(0.75 0.18 20)",
                  border: "1px solid oklch(0.55 0.22 20 / 0.3)",
                  fontFamily: F,
                }}
              >
                <X size={11} />
                مسح الهوية
              </button>
            )}
            <p className="text-[9px]" style={{ fontFamily: F, color: C.muted }}>
              تُحفظ البيانات تلقائياً في المتصفح ولا تُرسل لأي خادم
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
