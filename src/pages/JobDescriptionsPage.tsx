import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { api } from "../lib/api";

interface Department { id: string; name: string; nameEn: string; icon: string; color: string; description: string; }
interface JobDescription {
  id: string; title: string; titleEn: string; department: string; departmentId: string;
  level: "تنفيذي" | "إشرافي" | "إداري" | "متخصص" | "فني";
  summary: string; responsibilities: string[]; qualifications: string[]; skills: string[];
  experience: string; education: string;
}
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
} from "docx";
import ServiceRating from "../components/ServiceRating";

// ─── Lavender palette (fixed for all departments) ────────────────────────────
// Main lavender: #7C5CBF  Light lavender: #E8E0F5  Lighter: #F3EFF9
const LAVENDER = "7C5CBF";
const LAVENDER_LIGHT = "D4C8EC";
const LAVENDER_BORDER = "C4B5E0";

// ─── UI accent colors (light theme) ──────────────────────────────────────────
const deptCssColors: Record<string, { bg: string; accent: string; light: string }> = {
  finance:    { bg: "oklch(0.50 0.22 250)", accent: "oklch(0.40 0.22 250)", light: "oklch(0.96 0.04 250)" },
  sales:      { bg: "oklch(0.50 0.22 145)", accent: "oklch(0.40 0.22 145)", light: "oklch(0.96 0.04 145)" },
  procurement:{ bg: "oklch(0.55 0.18 65)",  accent: "oklch(0.45 0.18 65)",  light: "oklch(0.97 0.04 65)"  },
  hr:         { bg: "var(--primary)", accent: "var(--primary)", light: "var(--card)" },
  quality:    { bg: "oklch(0.50 0.18 200)", accent: "oklch(0.40 0.18 200)", light: "oklch(0.96 0.04 200)" },
  executive:  { bg: "oklch(0.40 0.20 15)",  accent: "oklch(0.30 0.20 15)",  light: "oklch(0.97 0.04 15)"  },
  marketing:  { bg: "oklch(0.50 0.22 340)", accent: "oklch(0.40 0.22 340)", light: "oklch(0.96 0.04 340)" },
  legal:      { bg: "oklch(0.40 0.08 260)", accent: "oklch(0.30 0.08 260)", light: "oklch(0.97 0.02 260)" },
  support:    { bg: "oklch(0.50 0.18 165)", accent: "oklch(0.40 0.18 165)", light: "oklch(0.96 0.04 165)" },
  operations: { bg: "oklch(0.50 0.20 45)",  accent: "oklch(0.40 0.20 45)",  light: "oklch(0.97 0.04 45)"  },
};

// ─── Word Export — matches the PDF template exactly ──────────────────────────
async function exportToWord(job: JobDescription) {
  // Helper: standard cell borders
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER_BORDER },
    left: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER_BORDER },
    right: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER_BORDER },
  };

  // Helper: label cell (right column — narrow, lavender background)
  const labelCell = (text: string) =>
    new TableCell({
      width: { size: 18, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      shading: { type: ShadingType.SOLID, color: LAVENDER_LIGHT, fill: LAVENDER_LIGHT },
      borders: cellBorders,
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: true, size: 22, color: "2D1A4A", font: "Arial" })],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });

  // Helper: value cell (left columns — white background)
  const valueCell = (text: string, widthPct = 82, bold = false) =>
    new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      shading: { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
      borders: cellBorders,
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: [
        new Paragraph({
          children: [new TextRun({ text, size: 22, color: "1A1A2E", font: "Arial", bold })],
          alignment: AlignmentType.RIGHT,
        }),
      ],
    });

  // Helper: bullet item inside a cell paragraph
  const bulletPara = (text: string) =>
    new Paragraph({
      children: [
        new TextRun({ text: "- ", size: 22, color: LAVENDER, font: "Arial", bold: true }),
        new TextRun({ text, size: 22, color: "1A1A2E", font: "Arial" }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60 },
    });

  // ── Title banner row (full-width lavender) ──
  const titleBannerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: LAVENDER_LIGHT, fill: LAVENDER_LIGHT },
            borders: cellBorders,
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: "وصف وظيفي", bold: true, size: 36, color: "2D1A4A", font: "Arial" })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Job title info row: label | Arabic title | English title ──
  const titleInfoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
            borders: cellBorders,
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: job.titleEn, size: 22, color: "1A1A2E", font: "Arial", bold: true })],
                alignment: AlignmentType.LEFT,
              }),
            ],
          }),
          new TableCell({
            width: { size: 52, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
            borders: cellBorders,
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: job.title, size: 22, color: "1A1A2E", font: "Arial", bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
          labelCell("المسمى الوظيفي"),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            width: { size: 82, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
            borders: cellBorders,
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: job.department, size: 22, color: "1A1A2E", font: "Arial", bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
          labelCell("التصنيف"),
        ],
      }),
    ],
  });

  // ── Objective row ──
  const objectiveTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          valueCell(job.summary, 82),
          labelCell("هدف الوظيفة"),
        ],
      }),
    ],
  });

  // ── Responsibilities row ──
  const responsibilitiesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 82, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
            borders: cellBorders,
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: job.responsibilities.map(bulletPara),
          }),
          labelCell("المسؤوليات والمهام"),
        ],
      }),
    ],
  });

  // ── Qualifications + skills row ──
  const allQuals = [
    ...job.qualifications,
    ...job.skills.map((s) => s),
  ];
  const qualificationsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 82, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
            borders: cellBorders,
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: allQuals.map(bulletPara),
          }),
          labelCell("مواصفات شاغل الوظيفة"),
        ],
      }),
    ],
  });

  // ── Signature row ──
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
            borders: cellBorders,
            margins: { top: 300, bottom: 300, left: 200, right: 200 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: "أسم الموظف: ________________________", size: 22, color: "1A1A2E", font: "Arial" })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22, color: "1A1A2E" },
          paragraph: { alignment: AlignmentType.RIGHT },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1000, bottom: 1000, left: 900, right: 900 } },
        },
        children: [
          // Decorative top-right header area (simple text placeholder)
          new Paragraph({
            children: [
              new TextRun({ text: "منصة مواكبة للموارد البشرية", size: 18, color: LAVENDER, bold: true, font: "Arial" }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 0, after: 200 },
          }),
          // Title banner
          titleBannerTable,
          new Paragraph({ text: "", spacing: { after: 0 } }),
          // Job title info
          titleInfoTable,
          new Paragraph({ text: "", spacing: { after: 0 } }),
          // Objective
          objectiveTable,
          new Paragraph({ text: "", spacing: { after: 0 } }),
          // Responsibilities
          responsibilitiesTable,
          new Paragraph({ text: "", spacing: { after: 0 } }),
          // Qualifications
          qualificationsTable,
          new Paragraph({ text: "", spacing: { after: 0 } }),
          // Signature
          signatureTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${job.title} - وصف وظيفي.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Empty job template ───────────────────────────────────────────────────────
function emptyJob(): JobDescription {
  return {
    id: `custom-${Date.now()}`,
    title: "",
    titleEn: "",
    department: "",
    departmentId: "finance",
    level: "تنفيذي",
    summary: "",
    responsibilities: [""],
    qualifications: [""],
    skills: [""],
    experience: "3-5 سنوات",
    education: "بكالوريوس",
  };
}

// ─── CRUD Modal ───────────────────────────────────────────────────────────────
interface CrudModalProps {
  mode: "add" | "edit";
  job: JobDescription;
  onSave: (job: JobDescription) => void;
  onClose: () => void;
  departments: any[];
}

function CrudModal({ mode, job: initialJob, onSave, onClose, departments }: CrudModalProps) {
  const [form, setForm] = useState<JobDescription>({ ...initialJob });

  const setField = <K extends keyof JobDescription>(key: K, value: JobDescription[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setListField = (key: "responsibilities" | "qualifications" | "skills", idx: number, value: string) => {
    setForm((prev) => {
      const arr = [...prev[key]];
      arr[idx] = value;
      return { ...prev, [key]: arr };
    });
  };

  const addListItem = (key: "responsibilities" | "qualifications" | "skills") => {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
  };

  const removeListItem = (key: "responsibilities" | "qualifications" | "skills", idx: number) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.8rem",
    borderRadius: "8px",
    border: "1.5px solid var(--card)",
    background: "var(--card)",
    color: "var(--foreground)",
    fontSize: "0.88rem",
    fontFamily: "'Cairo', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "var(--muted-foreground)",
    marginBottom: "0.3rem",
    fontFamily: "'Cairo', sans-serif",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "oklch(0 0 0 / 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "var(--card)",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "680px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px oklch(0 0 0 / 0.25)",
        direction: "rtl",
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "1.2rem 1.5rem",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "var(--card)", zIndex: 1,
          borderRadius: "16px 16px 0 0",
        }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }}>
            {mode === "add" ? "➕ إضافة وصف وظيفي جديد" : "✏️ تعديل الوصف الوظيفي"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "var(--foreground)", border: "none", borderRadius: "8px",
              width: "32px", height: "32px", cursor: "pointer", fontSize: "1.1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--muted-foreground)",
            }}
          >×</button>
        </div>

        {/* Form Body */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Row: title + titleEn */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
            <div>
              <label style={labelStyle}>المسمى الوظيفي (عربي) *</label>
              <input style={inputStyle} value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="مثال: مدير مالي" />
            </div>
            <div>
              <label style={labelStyle}>Job Title (English)</label>
              <input style={inputStyle} value={form.titleEn} onChange={(e) => setField("titleEn", e.target.value)} placeholder="e.g. Financial Manager" dir="ltr" />
            </div>
          </div>

          {/* Row: dept + level + experience */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem" }}>
            <div>
              <label style={labelStyle}>القسم *</label>
              <select
                style={inputStyle}
                value={form.departmentId}
                onChange={(e) => {
                  const dept = departments.find((d: any) => d.id === e.target.value);
                  setForm((prev) => ({ ...prev, departmentId: e.target.value, department: dept?.name || "" }));
                }}
              >
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>المستوى الوظيفي</label>
              <select style={inputStyle} value={form.level} onChange={(e) => setField("level", e.target.value as JobDescription["level"])}>
                {["تنفيذي", "إشرافي", "إداري", "متخصص", "فني"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>سنوات الخبرة</label>
              <input style={inputStyle} value={form.experience} onChange={(e) => setField("experience", e.target.value)} placeholder="مثال: 3-5 سنوات" />
            </div>
          </div>

          {/* Education */}
          <div>
            <label style={labelStyle}>المؤهل التعليمي</label>
            <input style={inputStyle} value={form.education} onChange={(e) => setField("education", e.target.value)} placeholder="مثال: بكالوريوس محاسبة" />
          </div>

          {/* Summary */}
          <div>
            <label style={labelStyle}>ملخص الوظيفة *</label>
            <textarea
              style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
              value={form.summary}
              onChange={(e) => setField("summary", e.target.value)}
              placeholder="وصف موجز للوظيفة وأهدافها..."
            />
          </div>

          {/* Responsibilities */}
          <div>
            <label style={labelStyle}>المهام والمسؤوليات</label>
            {form.responsibilities.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={r}
                  onChange={(e) => setListField("responsibilities", i, e.target.value)}
                  placeholder={`المهمة ${i + 1}`}
                />
                {form.responsibilities.length > 1 && (
                  <button
                    onClick={() => removeListItem("responsibilities", i)}
                    style={{ background: "oklch(0.95 0.05 15)", border: "none", borderRadius: "7px", padding: "0 0.6rem", cursor: "pointer", color: "oklch(0.45 0.18 15)", fontSize: "1rem" }}
                  >×</button>
                )}
              </div>
            ))}
            <button
              onClick={() => addListItem("responsibilities")}
              style={{ background: "oklch(0.96 0.03 145)", border: "1px dashed oklch(0.70 0.15 145)", borderRadius: "7px", padding: "0.35rem 0.8rem", cursor: "pointer", color: "oklch(0.40 0.18 145)", fontSize: "0.8rem", fontFamily: "'Cairo', sans-serif" }}
            >+ إضافة مهمة</button>
          </div>

          {/* Qualifications */}
          <div>
            <label style={labelStyle}>المؤهلات المطلوبة</label>
            {form.qualifications.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={q}
                  onChange={(e) => setListField("qualifications", i, e.target.value)}
                  placeholder={`المؤهل ${i + 1}`}
                />
                {form.qualifications.length > 1 && (
                  <button
                    onClick={() => removeListItem("qualifications", i)}
                    style={{ background: "oklch(0.95 0.05 15)", border: "none", borderRadius: "7px", padding: "0 0.6rem", cursor: "pointer", color: "oklch(0.45 0.18 15)", fontSize: "1rem" }}
                  >×</button>
                )}
              </div>
            ))}
            <button
              onClick={() => addListItem("qualifications")}
              style={{ background: "oklch(0.96 0.03 145)", border: "1px dashed oklch(0.70 0.15 145)", borderRadius: "7px", padding: "0.35rem 0.8rem", cursor: "pointer", color: "oklch(0.40 0.18 145)", fontSize: "0.8rem", fontFamily: "'Cairo', sans-serif" }}
            >+ إضافة مؤهل</button>
          </div>

          {/* Skills */}
          <div>
            <label style={labelStyle}>المهارات المطلوبة</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
              {form.skills.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.2rem", background: "var(--foreground)", borderRadius: "20px", padding: "0.2rem 0.5rem 0.2rem 0.3rem", border: "1px solid var(--card)" }}>
                  <input
                    style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.8rem", color: "var(--muted-foreground)", fontFamily: "'Cairo', sans-serif", width: `${Math.max(s.length * 10, 60)}px` }}
                    value={s}
                    onChange={(e) => setListField("skills", i, e.target.value)}
                    placeholder="مهارة"
                  />
                  {form.skills.length > 1 && (
                    <button
                      onClick={() => removeListItem("skills", i)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(0.55 0.10 15)", fontSize: "0.9rem", padding: 0, lineHeight: 1 }}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => addListItem("skills")}
              style={{ background: "oklch(0.96 0.03 145)", border: "1px dashed oklch(0.70 0.15 145)", borderRadius: "7px", padding: "0.35rem 0.8rem", cursor: "pointer", color: "oklch(0.40 0.18 145)", fontSize: "0.8rem", fontFamily: "'Cairo', sans-serif" }}
            >+ إضافة مهارة</button>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--border)",
          display: "flex", gap: "0.7rem", justifyContent: "flex-start",
          position: "sticky", bottom: 0, background: "var(--card)",
          borderRadius: "0 0 16px 16px",
        }}>
          <button
            onClick={() => {
              if (!form.title.trim() || !form.summary.trim()) {
                alert("يرجى إدخال المسمى الوظيفي والملخص على الأقل");
                return;
              }
              onSave({
                ...form,
                responsibilities: form.responsibilities.filter((r) => r.trim()),
                qualifications: form.qualifications.filter((q) => q.trim()),
                skills: form.skills.filter((s) => s.trim()),
              });
            }}
            style={{
              padding: "0.6rem 1.5rem", borderRadius: "9px", border: "none",
              background: "var(--primary)", color: "white",
              fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            {mode === "add" ? "✓ إضافة الوصف" : "✓ حفظ التعديلات"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "0.6rem 1.2rem", borderRadius: "9px",
              border: "1px solid var(--card)", background: "var(--card)",
              color: "var(--muted-foreground)", fontSize: "0.9rem", fontWeight: 600,
              cursor: "pointer", fontFamily: "'Cairo', sans-serif",
            }}
          >إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function JobDescriptionsPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDescription | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Local custom jobs (CRUD)
  const [customJobs, setCustomJobs] = useState<JobDescription[]>([]);
  const [crudModal, setCrudModal] = useState<{ mode: "add" | "edit"; job: JobDescription } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── DB data ──
  const { data: jdData } = api.jobDescriptions.getAll.useQuery();
  const departments: Department[] = (jdData as any)?.departments ?? [];
  const staticJobDescriptions: JobDescription[] = (jdData as any)?.jobs ?? [];

  // All jobs = DB + custom
  const allJobs = useMemo(() => [...staticJobDescriptions, ...customJobs], [staticJobDescriptions, customJobs]);

  const filteredJobs = useMemo(() => {
    const source = allJobs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return source.filter(
        (j) =>
          j.title.includes(q) ||
          j.titleEn.toLowerCase().includes(q) ||
          j.department.includes(q) ||
          j.summary.includes(q) ||
          j.skills.some((s) => s.includes(q))
      );
    }
    if (selectedDept) return source.filter((j) => j.departmentId === selectedDept);
    return source;
  }, [searchQuery, selectedDept, allJobs]);

  const handleExport = async (e: React.MouseEvent | React.KeyboardEvent, job: JobDescription) => {
    e.stopPropagation();
    setExportingId(job.id);
    try {
      await exportToWord(job);
    } finally {
      setExportingId(null);
    }
  };

  const handleView = (e: React.MouseEvent | React.KeyboardEvent, job: JobDescription) => {
    e.stopPropagation();
    setSelectedJob(selectedJob?.id === job.id ? null : job);
  };

  const handleSave = (job: JobDescription) => {
    if (crudModal?.mode === "add") {
      setCustomJobs((prev) => [job, ...prev]);
    } else {
      setCustomJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
      // Update static jobs in view if editing one
      if (selectedJob?.id === job.id) setSelectedJob(job);
    }
    setCrudModal(null);
  };

  const handleDelete = (id: string) => {
    setCustomJobs((prev) => prev.filter((j) => j.id !== id));
    if (selectedJob?.id === id) setSelectedJob(null);
    setDeleteConfirm(null);
  };

  // Light theme colors
  const C = {
    bg: "var(--card)",
    pageBg: "var(--card)",
    headerBg: "var(--card)",
    border: "var(--card)",
    text: "var(--foreground)",
    subtext: "var(--muted-foreground)",
    muted: "var(--muted-foreground)",
    cardBg: "var(--card)",
    cardBorder: "var(--card)",
    inputBg: "var(--card)",
    searchBg: "var(--card)",
    purple: "var(--primary)",
    purpleLight: "var(--card)",
    green: "var(--success)",
    greenLight: "oklch(0.96 0.04 145)",
    red: "oklch(0.50 0.18 15)",
    redLight: "oklch(0.96 0.04 15)",
  };

  const F = "'Cairo', sans-serif";

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: C.pageBg, color: C.text, fontFamily: F }}>

      {/* ── Header ── */}
      <div style={{
        background: C.headerBg,
        borderBottom: `1px solid ${C.border}`,
        padding: "1.2rem 1.5rem 1rem",
        boxShadow: "0 1px 4px oklch(0 0 0 / 0.06)",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Back */}
          <button
            onClick={() => navigate("/")}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              color: C.muted, background: "none", border: "none",
              cursor: "pointer", fontSize: "0.85rem", marginBottom: "0.8rem", padding: 0,
              fontFamily: F,
            }}
          >
            ← العودة للرئيسية
          </button>

          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: C.purpleLight, border: `1px solid ${C.purple}30`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: "24px", height: "24px" }}>
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke={C.purple} strokeWidth="1.5"/>
                  <path d="M7 8h10M7 12h10M7 16h6" stroke={C.purple} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: C.text }}>
                  الأوصاف الوظيفية
                </h1>
                <p style={{ margin: "0.15rem 0 0", color: C.muted, fontSize: "0.84rem" }}>
                  {allJobs.length} وصف وظيفي احترافي • 10 أقسام
                </p>
              </div>
            </div>

            {/* Add button */}
            <button
              onClick={() => setCrudModal({ mode: "add", job: emptyJob() })}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.6rem 1.2rem", borderRadius: "10px", border: "none",
                background: C.purple, color: "white",
                fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: F,
                boxShadow: `0 2px 8px ${C.purple}40`,
              }}
            >
              <svg viewBox="0 0 20 20" fill="none" style={{ width: "16px", height: "16px" }}>
                <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              إضافة وصف وظيفي
            </button>
          </div>

          {/* Search bar */}
          <div style={{ marginTop: "1rem", position: "relative" }}>
            <input
              type="text"
              placeholder="🔍  ابحث عن وظيفة أو مهارة أو قسم..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedDept(null);
                setSelectedJob(null);
              }}
              style={{
                width: "100%",
                padding: "0.75rem 1.2rem",
                borderRadius: "12px",
                border: `1.5px solid ${searchQuery ? C.purple : C.border}`,
                background: C.searchBg,
                color: C.text,
                fontSize: "0.95rem",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: F,
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: searchQuery ? `0 0 0 3px ${C.purple}15` : "none",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSelectedJob(null); }}
                style={{
                  position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)",
                  background: "var(--card)", border: "none", borderRadius: "50%",
                  width: "22px", height: "22px", cursor: "pointer", fontSize: "0.85rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.subtext,
                }}
              >×</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.2rem 1.5rem" }}>

        {/* Department Tabs */}
        {!searchQuery && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.2rem" }}>
            <button
              onClick={() => { setSelectedDept(null); setSelectedJob(null); }}
              style={{
                padding: "0.45rem 1rem", borderRadius: "20px", border: "none",
                background: !selectedDept ? C.purple : C.purpleLight,
                color: !selectedDept ? "white" : C.purple,
                fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: F,
                transition: "all 0.15s",
              }}
            >
              الكل ({allJobs.length})
            </button>
            {departments.map((dept) => {
              const css = deptCssColors[dept.id] || deptCssColors.hr;
              const isActive = selectedDept === dept.id;
              const count = allJobs.filter((j) => j.departmentId === dept.id).length;
              return (
                <button
                  key={dept.id}
                  onClick={() => { setSelectedDept(isActive ? null : dept.id); setSelectedJob(null); }}
                  style={{
                    padding: "0.45rem 1rem", borderRadius: "20px",
                    border: `1.5px solid ${isActive ? css.bg : C.border}`,
                    background: isActive ? css.bg : "white",
                    color: isActive ? "white" : C.subtext,
                    fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: F,
                    transition: "all 0.15s",
                  }}
                >
                  {dept.icon} {dept.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Results count */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem" }}>
          <span style={{ fontSize: "0.84rem", color: C.muted, fontWeight: 600 }}>
            {filteredJobs.length} وظيفة
            {searchQuery && <span style={{ color: C.purple }}> — نتائج البحث عن "{searchQuery}"</span>}
          </span>
          {(searchQuery || selectedDept) && (
            <button
              onClick={() => { setSearchQuery(""); setSelectedDept(null); setSelectedJob(null); }}
              style={{
                background: "none", border: "none", color: C.purple,
                cursor: "pointer", fontSize: "0.82rem", padding: 0, fontFamily: F, fontWeight: 600,
              }}
            >
              مسح الفلتر ×
            </button>
          )}
        </div>

        {/* Two-column layout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: selectedJob ? "minmax(0,1fr) minmax(0,1.6fr)" : "1fr",
          gap: "1rem",
          alignItems: "start",
        }}>

          {/* ── Job Cards List ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: selectedJob ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "0.7rem",
          }}>
            {filteredJobs.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem", color: C.muted }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🔍</div>
                <p style={{ fontFamily: F }}>لا توجد نتائج للبحث</p>
              </div>
            )}

            {filteredJobs.map((job) => {
              const css = deptCssColors[job.departmentId] || deptCssColors.hr;
              const isSelected = selectedJob?.id === job.id;
              const isExporting = exportingId === job.id;
              const dept = departments.find((d) => d.id === job.departmentId);
              const isCustom = customJobs.some((c) => c.id === job.id);

              return (
                <div
                  key={job.id}
                  style={{
                    background: isSelected ? css.light : C.cardBg,
                    border: `1.5px solid ${isSelected ? css.bg : C.cardBorder}`,
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: isSelected
                      ? `0 0 0 2px ${css.bg}30, 0 4px 12px oklch(0 0 0 / 0.08)`
                      : "0 1px 4px oklch(0 0 0 / 0.06)",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Top color bar */}
                  <div style={{ height: "3px", background: `linear-gradient(to left, ${css.bg}, ${css.accent})` }} />

                  {/* Card body */}
                  <div style={{ padding: "0.9rem 1rem 0.75rem" }}>
                    {/* Title row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "0.92rem", fontWeight: 700,
                          color: isSelected ? css.bg : C.text,
                          lineHeight: 1.3,
                        }}>
                          {job.title}
                          {isCustom && (
                            <span style={{
                              marginRight: "0.4rem", fontSize: "0.65rem", background: C.purpleLight,
                              color: C.purple, borderRadius: "4px", padding: "0.05rem 0.35rem", fontWeight: 600,
                            }}>مخصص</span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: "0.15rem" }}>
                          {job.titleEn}
                        </div>
                      </div>
                      <div style={{
                        background: css.light,
                        border: `1px solid ${css.bg}40`,
                        borderRadius: "6px",
                        padding: "0.12rem 0.45rem",
                        fontSize: "0.67rem",
                        color: css.bg,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        fontWeight: 700,
                      }}>
                        {job.level}
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.45rem", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "0.70rem", color: C.subtext,
                        background: "var(--foreground)", borderRadius: "4px", padding: "0.08rem 0.4rem",
                      }}>
                        {job.experience}
                      </span>
                      <span style={{ fontSize: "0.70rem", color: C.muted }}>
                        {dept?.icon} {job.department}
                      </span>
                    </div>

                    {/* Summary preview */}
                    <div style={{
                      marginTop: "0.5rem",
                      fontSize: "0.78rem",
                      color: C.subtext,
                      lineHeight: 1.55,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }}>
                      {job.summary}
                    </div>

                    {/* Action buttons */}
                    <div style={{
                      display: "flex", gap: "0.4rem", marginTop: "0.65rem",
                      borderTop: `1px solid ${C.border}`, paddingTop: "0.6rem",
                      flexWrap: "wrap",
                    }}>
                      {/* View */}
                      <div
                        role="button" tabIndex={0}
                        onClick={(e) => handleView(e, job)}
                        onKeyDown={(e) => e.key === "Enter" && handleView(e, job)}
                        style={{
                          flex: 1, minWidth: "60px", padding: "0.4rem 0.5rem", borderRadius: "7px",
                          border: `1.5px solid ${isSelected ? css.bg : C.border}`,
                          background: isSelected ? css.light : "white",
                          color: isSelected ? css.bg : C.subtext,
                          fontSize: "0.74rem", fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
                          fontFamily: F, transition: "all 0.15s", userSelect: "none",
                        }}
                      >
                        <svg viewBox="0 0 20 20" fill="none" style={{ width: "12px", height: "12px" }}>
                          <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="1.5"/>
                          <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                        {isSelected ? "إغلاق" : "عرض"}
                      </div>

                      {/* Edit (custom only) */}
                      {isCustom && (
                        <div
                          role="button" tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); setCrudModal({ mode: "edit", job }); }}
                          onKeyDown={(e) => e.key === "Enter" && setCrudModal({ mode: "edit", job })}
                          style={{
                            flex: 1, minWidth: "60px", padding: "0.4rem 0.5rem", borderRadius: "7px",
                            border: `1.5px solid oklch(0.75 0.15 55)`,
                            background: "oklch(0.97 0.03 55)",
                            color: "oklch(0.45 0.18 55)",
                            fontSize: "0.74rem", fontWeight: 600, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
                            fontFamily: F, transition: "all 0.15s", userSelect: "none",
                          }}
                        >
                          ✏️ تعديل
                        </div>
                      )}

                      {/* Delete (custom only) */}
                      {isCustom && (
                        <div
                          role="button" tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(job.id); }}
                          onKeyDown={(e) => e.key === "Enter" && setDeleteConfirm(job.id)}
                          style={{
                            padding: "0.4rem 0.6rem", borderRadius: "7px",
                            border: `1.5px solid oklch(0.80 0.12 15)`,
                            background: "oklch(0.97 0.03 15)",
                            color: "oklch(0.45 0.18 15)",
                            fontSize: "0.74rem", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: F, transition: "all 0.15s", userSelect: "none",
                          }}
                        >
                          🗑️
                        </div>
                      )}

                      {/* Download Word */}
                      <div
                        role="button" tabIndex={0}
                        onClick={(e) => !isExporting && handleExport(e, job)}
                        onKeyDown={(e) => e.key === "Enter" && !isExporting && handleExport(e, job)}
                        style={{
                          flex: 1, minWidth: "70px", padding: "0.4rem 0.5rem", borderRadius: "7px",
                          border: `1.5px solid ${C.green}60`,
                          background: isExporting ? "oklch(0.94 0.06 145)" : C.greenLight,
                          color: C.green,
                          fontSize: "0.74rem", fontWeight: 600,
                          cursor: isExporting ? "wait" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
                          fontFamily: F, transition: "all 0.15s", userSelect: "none",
                        }}
                      >
                        {isExporting ? (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }}>
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10"/>
                            </svg>
                            جارٍ...
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 20 20" fill="none" style={{ width: "12px", height: "12px" }}>
                              <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            تحميل Word
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Job Detail Panel ── */}
          {selectedJob && (() => {
            const css = deptCssColors[selectedJob.departmentId] || deptCssColors.hr;
            const dept = departments.find((d) => d.id === selectedJob.departmentId);
            const isExporting = exportingId === selectedJob.id;
            const isCustom = customJobs.some((c) => c.id === selectedJob.id);
            return (
              <div style={{
                background: "var(--card)",
                border: `1.5px solid ${C.border}`,
                borderRadius: "16px",
                overflow: "hidden",
                position: "sticky",
                top: "1rem",
                boxShadow: "0 4px 16px oklch(0 0 0 / 0.08)",
              }}>
                {/* Detail Header */}
                <div style={{
                  background: `linear-gradient(135deg, ${css.bg} 0%, ${css.accent} 100%)`,
                  padding: "1.5rem",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "white" }}>
                        {selectedJob.title}
                      </h2>
                      <p style={{ margin: "0.3rem 0 0", color: "var(--foreground)", fontSize: "0.82rem", fontStyle: "italic" }}>
                        {selectedJob.titleEn}
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem", flexWrap: "wrap" }}>
                        {[
                          { label: (dept?.icon || "") + " " + selectedJob.department },
                          { label: "📊 " + selectedJob.level },
                          { label: "⏱ " + selectedJob.experience },
                        ].map((tag, i) => (
                          <span key={i} style={{
                            background: "oklch(0 0 0 / 0.18)", borderRadius: "20px",
                            padding: "0.2rem 0.7rem", fontSize: "0.72rem", color: "white",
                          }}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap" }}>
                      {/* Edit button (custom only) */}
                      {isCustom && (
                        <div
                          role="button" tabIndex={0}
                          onClick={() => setCrudModal({ mode: "edit", job: selectedJob })}
                          style={{
                            padding: "0.5rem 0.9rem", borderRadius: "8px",
                            background: "oklch(0 0 0 / 0.20)", border: "1px solid oklch(1 0 0 / 0.3)",
                            color: "white", fontSize: "0.78rem", fontWeight: 700,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
                            fontFamily: F, userSelect: "none",
                          }}
                        >
                          ✏️ تعديل
                        </div>
                      )}
                      {/* Download */}
                      <div
                        role="button" tabIndex={0}
                        onClick={(e) => !isExporting && handleExport(e, selectedJob)}
                        onKeyDown={(e) => e.key === "Enter" && !isExporting && handleExport(e, selectedJob)}
                        style={{
                          padding: "0.5rem 1rem", borderRadius: "8px",
                          background: "oklch(0 0 0 / 0.20)", border: "1px solid oklch(1 0 0 / 0.3)",
                          color: "white", fontSize: "0.78rem", fontWeight: 700,
                          cursor: isExporting ? "wait" : "pointer",
                          display: "flex", alignItems: "center", gap: "0.4rem",
                          fontFamily: F, userSelect: "none",
                        }}
                      >
                        <svg viewBox="0 0 20 20" fill="none" style={{ width: "14px", height: "14px" }}>
                          <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {isExporting ? "جارٍ التحميل..." : "تحميل Word"}
                      </div>
                      {/* Close */}
                      <div
                        role="button" tabIndex={0}
                        onClick={() => setSelectedJob(null)}
                        style={{
                          padding: "0.5rem", borderRadius: "8px",
                          background: "oklch(0 0 0 / 0.20)", border: "1px solid oklch(1 0 0 / 0.3)",
                          color: "white", fontSize: "1rem", cursor: "pointer",
                          display: "flex", alignItems: "center", userSelect: "none",
                        }}
                      >×</div>
                    </div>
                  </div>
                </div>

                {/* Detail Body */}
                <div style={{ padding: "1.5rem", maxHeight: "70vh", overflowY: "auto" }}>

                  {/* Summary */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "0.84rem", fontWeight: 700, color: css.bg, margin: "0 0 0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: "3px", height: "14px", background: css.bg, borderRadius: "2px", display: "inline-block" }}/>
                      ملخص الوظيفة
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.90rem", color: C.subtext, lineHeight: 1.7, background: css.light, padding: "0.8rem 1rem", borderRadius: "8px", borderRight: `3px solid ${css.bg}` }}>
                      {selectedJob.summary}
                    </p>
                  </div>

                  {/* Responsibilities */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "0.84rem", fontWeight: 700, color: css.bg, margin: "0 0 0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: "3px", height: "14px", background: css.bg, borderRadius: "2px", display: "inline-block" }}/>
                      المهام والمسؤوليات
                    </h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {selectedJob.responsibilities.map((r, i) => (
                        <li key={i} style={{
                          display: "flex", gap: "0.6rem", alignItems: "flex-start",
                          padding: "0.35rem 0", borderBottom: `1px solid ${C.border}`,
                        }}>
                          <span style={{ color: css.bg, fontSize: "0.7rem", marginTop: "0.25rem", flexShrink: 0 }}>◆</span>
                          <span style={{ fontSize: "0.87rem", color: C.subtext, lineHeight: 1.5 }}>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Qualifications */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "0.84rem", fontWeight: 700, color: css.bg, margin: "0 0 0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: "3px", height: "14px", background: css.bg, borderRadius: "2px", display: "inline-block" }}/>
                      المؤهلات المطلوبة
                    </h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {selectedJob.qualifications.map((q, i) => (
                        <li key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", padding: "0.3rem 0" }}>
                          <span style={{ color: css.bg, fontSize: "0.7rem", marginTop: "0.25rem", flexShrink: 0 }}>◆</span>
                          <span style={{ fontSize: "0.87rem", color: C.subtext, lineHeight: 1.5 }}>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Education */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "0.84rem", fontWeight: 700, color: css.bg, margin: "0 0 0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: "3px", height: "14px", background: css.bg, borderRadius: "2px", display: "inline-block" }}/>
                      المؤهل التعليمي
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.90rem", color: C.subtext }}>{selectedJob.education}</p>
                  </div>

                  {/* Skills */}
                  <div>
                    <h3 style={{ fontSize: "0.84rem", fontWeight: 700, color: css.bg, margin: "0 0 0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: "3px", height: "14px", background: css.bg, borderRadius: "2px", display: "inline-block" }}/>
                      المهارات المطلوبة
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {selectedJob.skills.map((skill, i) => (
                        <span key={i} style={{
                          background: css.light,
                          border: `1px solid ${css.bg}40`,
                          borderRadius: "20px",
                          padding: "0.25rem 0.7rem",
                          fontSize: "0.78rem",
                          color: css.bg,
                          fontWeight: 600,
                        }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── CRUD Modal ── */}
      {crudModal && (
        <CrudModal
          mode={crudModal.mode}
          job={crudModal.job}
          onSave={handleSave}
          onClose={() => setCrudModal(null)}
          departments={departments}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "oklch(0 0 0 / 0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div style={{
            background: "var(--card)", borderRadius: "14px", padding: "1.5rem",
            maxWidth: "380px", width: "100%", textAlign: "center",
            boxShadow: "0 20px 60px oklch(0 0 0 / 0.25)",
            direction: "rtl",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.8rem" }}>🗑️</div>
            <h3 style={{ margin: "0 0 0.5rem", fontFamily: F, color: C.text }}>حذف الوصف الوظيفي</h3>
            <p style={{ margin: "0 0 1.2rem", color: C.muted, fontSize: "0.88rem", fontFamily: F }}>
              هل أنت متأكد من حذف هذا الوصف الوظيفي؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div style={{ display: "flex", gap: "0.7rem", justifyContent: "center" }}>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  padding: "0.6rem 1.4rem", borderRadius: "9px", border: "none",
                  background: C.red, color: "white",
                  fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", fontFamily: F,
                }}
              >حذف</button>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: "0.6rem 1.2rem", borderRadius: "9px",
                  border: `1px solid ${C.border}`, background: "var(--card)",
                  color: C.subtext, fontSize: "0.9rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: F,
                }}
              >إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        [role="button"]:hover { opacity: 0.82; }
      `}</style>
      <ServiceRating serviceId="job-descriptions" serviceName="الأوصاف الوظيفية" />
    </div>
  );
}
