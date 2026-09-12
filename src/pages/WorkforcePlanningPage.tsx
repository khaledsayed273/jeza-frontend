import { useState } from "react";
import { useLocation } from "wouter";

// ─── Color palette (lavender theme, white background) ────────────────────────
const C = {
  bg: "var(--background)",
  lavender: "var(--primary)",
  lavenderLight: "color-mix(in oklch, var(--primary) 15%, transparent)",
  lavenderMid: "color-mix(in oklch, var(--primary) 40%, transparent)",
  lavenderDark: "color-mix(in oklch, var(--primary) 70%, var(--foreground))",
  text: "var(--foreground)",
  subtext: "var(--muted-foreground)",
  muted: "var(--muted-foreground)",
  border: "var(--border)",
  cardBg: "var(--card)",
  surplus: "var(--success-strong)",
  surplusLight: "color-mix(in oklch, var(--success) 15%, transparent)",
  deficit: "var(--destructive-strong)",
  deficitLight: "color-mix(in oklch, var(--destructive) 15%, transparent)",
  balanced: "var(--primary)",
  balancedLight: "color-mix(in oklch, var(--primary) 15%, transparent)",
  stepActive: "var(--primary)",
  stepDone: "var(--success-strong)",
  stepPending: "var(--muted-foreground)",
};

const F = "'Cairo', 'Noto Naskh Arabic', sans-serif";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Department {
  id: string;
  name: string;
  current: number;
  expected: number;
}

interface Task {
  id: string;
  name: string;
  hoursPerWeek: number;
  assignedDept: string;
}

interface AnalysisResult {
  deptId: string;
  deptName: string;
  current: number;
  expected: number;
  totalHoursPerWeek: number;
  requiredHeadcount: number;
  gap: number; // positive = surplus, negative = deficit
  status: "surplus" | "deficit" | "balanced";
  recommendations: string[];
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step, current }: { step: number; current: number }) {
  const steps = [
    { label: "الموظفون الحاليون", icon: "👥" },
    { label: "العدد المتوقع", icon: "📈" },
    { label: "تحليل عبء العمل", icon: "⚖️" },
    { label: "النتائج والتوصيات", icon: "📊" },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: "2rem", flexWrap: "wrap" }}>
      {steps.map((s, i) => {
        const idx = i + 1;
        const isDone = idx < current;
        const isActive = idx === current;
        const isPending = idx > current;
        return (
          <div key={idx} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
              <div style={{
                width: "42px", height: "42px", borderRadius: "50%",
                background: isDone ? C.stepDone : isActive ? C.lavender : C.stepPending,
                color: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isDone ? "1.1rem" : "0.85rem", fontWeight: 700,
                boxShadow: isActive ? `0 0 0 4px ${C.lavenderLight}` : "none",
                transition: "all 0.3s",
              }}>
                {isDone ? "✓" : s.icon}
              </div>
              <span style={{
                fontSize: "0.68rem", color: isActive ? C.lavender : isDone ? C.stepDone : C.muted,
                fontWeight: isActive ? 700 : 500, fontFamily: F, textAlign: "center",
                maxWidth: "70px", lineHeight: 1.3,
              }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: "40px", height: "2px",
                background: isDone ? C.stepDone : C.stepPending,
                margin: "0 4px", marginBottom: "20px",
                transition: "all 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkforcePlanningPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  // Step 1: Current employees
  const [departments, setDepartments] = useState<Department[]>([
    { id: "hr", name: "الموارد البشرية", current: 0, expected: 0 },
    { id: "finance", name: "المالية والمحاسبة", current: 0, expected: 0 },
    { id: "sales", name: "المبيعات", current: 0, expected: 0 },
    { id: "ops", name: "العمليات والتشغيل", current: 0, expected: 0 },
    { id: "it", name: "تقنية المعلومات", current: 0, expected: 0 },
  ]);
  const [newDeptName, setNewDeptName] = useState("");

  // Step 3: Tasks
  const [tasks, setTasks] = useState<Task[]>([
    { id: "t1", name: "", hoursPerWeek: 0, assignedDept: "hr" },
  ]);

  // Step 4: Results
  const [results, setResults] = useState<AnalysisResult[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const addDept = () => {
    if (!newDeptName.trim()) return;
    setDepartments(prev => [...prev, {
      id: `dept_${Date.now()}`, name: newDeptName.trim(), current: 0, expected: 0,
    }]);
    setNewDeptName("");
  };

  const removeDept = (id: string) => setDepartments(prev => prev.filter(d => d.id !== id));

  const updateDept = (id: string, field: "current" | "expected" | "name", value: string | number) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const addTask = () => {
    setTasks(prev => [...prev, { id: `t_${Date.now()}`, name: "", hoursPerWeek: 0, assignedDept: departments[0]?.id || "" }]);
  };

  const removeTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const updateTask = (id: string, field: keyof Task, value: string | number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // ── Analysis Engine ───────────────────────────────────────────────────────
  const runAnalysis = () => {
    const WORK_HOURS_PER_WEEK = 40;

    const res: AnalysisResult[] = departments.map(dept => {
      const deptTasks = tasks.filter(t => t.assignedDept === dept.id);
      const totalHours = deptTasks.reduce((sum, t) => sum + (Number(t.hoursPerWeek) || 0), 0);
      const requiredHeadcount = totalHours > 0 ? Math.ceil(totalHours / WORK_HOURS_PER_WEEK) : dept.expected;
      const targetHeadcount = Math.max(dept.expected, requiredHeadcount);
      const gap = dept.current - targetHeadcount;

      let status: "surplus" | "deficit" | "balanced";
      if (gap > 0) status = "surplus";
      else if (gap < 0) status = "deficit";
      else status = "balanced";

      const recommendations: string[] = [];

      if (status === "deficit") {
        const needed = Math.abs(gap);
        recommendations.push(`تحتاج إلى توظيف ${needed} موظف${needed > 1 ? "ين" : ""} إضافي${needed > 1 ? "ين" : ""} في ${dept.name}`);
        if (needed >= 3) recommendations.push("يُنصح بفتح طلبات توظيف فورية وتحديد الأولويات الوظيفية");
        if (totalHours > 0) recommendations.push(`عبء العمل الحالي يتطلب ${totalHours} ساعة/أسبوع — يُنصح بمراجعة توزيع المهام`);
        recommendations.push("يمكن الاستعانة بموظفين مؤقتين أو عقود جزئية كحل مؤقت");
      } else if (status === "surplus") {
        const extra = gap;
        recommendations.push(`يوجد ${extra} موظف${extra > 1 ? "ين" : ""} زائد${extra > 1 ? "ين" : ""} في ${dept.name}`);
        recommendations.push("يُنصح بإعادة توزيع الموظفين الزائدين على الأقسام التي تعاني من عجز");
        if (totalHours > 0) recommendations.push("مراجعة المهام وإضافة مسؤوليات جديدة لتحسين الإنتاجية");
        recommendations.push("النظر في برامج التطوير والتدريب لاستثمار الطاقة البشرية الفائضة");
      } else {
        recommendations.push(`${dept.name} في حالة توازن مثالية`);
        recommendations.push("الحفاظ على مستوى التوظيف الحالي مع متابعة دورية");
        if (totalHours > 0) recommendations.push("مراجعة توزيع المهام دورياً للحفاظ على التوازن");
      }

      return {
        deptId: dept.id,
        deptName: dept.name,
        current: dept.current,
        expected: dept.expected,
        totalHoursPerWeek: totalHours,
        requiredHeadcount,
        gap,
        status,
        recommendations,
      };
    });

    setResults(res);
    setStep(4);
  };

  // ── Card wrapper ──────────────────────────────────────────────────────────
  const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{
      background: "var(--card)", borderRadius: "16px",
      border: `1px solid ${C.border}`,
      boxShadow: "0 2px 12px oklch(0 0 0 / 0.06)",
      padding: "1.5rem",
      ...style,
    }}>
      {children}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
      {/* Header */}
      <div style={{
        background: "var(--card)", borderBottom: `1px solid ${C.border}`,
        padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem",
        boxShadow: "0 1px 4px oklch(0 0 0 / 0.05)",
      }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.lavender, fontSize: "0.85rem", fontFamily: F,
            display: "flex", alignItems: "center", gap: "0.3rem",
          }}
        >
          ← العودة للرئيسية
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663364198732/2vuJLs9j7vTiL4E4emfRJ8/workforce_planning_icon-Hf2bf8rm3jQBkxbivNKm9u.webp"
            alt="تخطيط القوى العاملة"
            style={{ width: "36px", height: "36px", objectFit: "contain" }}
          />
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: C.text }}>تخطيط القوى العاملة</div>
            <div style={{ fontSize: "0.72rem", color: C.muted }}>تحليل الاحتياج الوظيفي وعبء العمل</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1rem" }}>
        <StepIndicator step={step} current={step} />

        {/* ── STEP 1: Current Employees ── */}
        {step === 1 && (
          <Card>
            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: C.text, margin: 0 }}>
                👥 الخطوة الأولى: الموظفون الحاليون
              </h2>
              <p style={{ fontSize: "0.82rem", color: C.muted, marginTop: "0.3rem" }}>
                أدخل عدد الموظفين الحاليين في كل قسم
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {departments.map(dept => (
                <div key={dept.id} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  background: C.lavenderLight, borderRadius: "10px", padding: "0.75rem 1rem",
                }}>
                  <input
                    value={dept.name}
                    onChange={e => updateDept(dept.id, "name", e.target.value)}
                    style={{
                      flex: 1, border: `1px solid ${C.lavenderMid}`, borderRadius: "8px",
                      padding: "0.45rem 0.75rem", fontSize: "0.85rem", fontFamily: F,
                      background: "var(--card)", color: C.text, outline: "none",
                    }}
                    placeholder="اسم القسم"
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.75rem", color: C.subtext, whiteSpace: "nowrap" }}>العدد الحالي:</span>
                    <input
                      type="number" min={0}
                      value={dept.current || ""}
                      onChange={e => updateDept(dept.id, "current", Number(e.target.value))}
                      style={{
                        width: "70px", border: `1px solid ${C.lavenderMid}`, borderRadius: "8px",
                        padding: "0.45rem 0.5rem", fontSize: "0.9rem", fontFamily: F,
                        background: "var(--card)", color: C.text, textAlign: "center", outline: "none",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => removeDept(dept.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--destructive)", fontSize: "1rem", padding: "0.25rem",
                    }}
                  >✕</button>
                </div>
              ))}
            </div>

            {/* Add department */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <input
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addDept()}
                placeholder="اسم القسم الجديد..."
                style={{
                  flex: 1, border: `1.5px dashed ${C.lavenderMid}`, borderRadius: "8px",
                  padding: "0.5rem 0.75rem", fontSize: "0.85rem", fontFamily: F,
                  background: "var(--card)", color: C.text, outline: "none",
                }}
              />
              <button
                onClick={addDept}
                style={{
                  background: C.lavender, color: "var(--card)", border: "none",
                  borderRadius: "8px", padding: "0.5rem 1rem", cursor: "pointer",
                  fontSize: "0.85rem", fontFamily: F, fontWeight: 700,
                }}
              >+ إضافة قسم</button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "1.5rem" }}>
              <button
                onClick={() => setStep(2)}
                disabled={departments.every(d => !d.current)}
                style={{
                  background: departments.some(d => d.current > 0) ? C.lavender : C.stepPending,
                  color: "var(--card)", border: "none", borderRadius: "10px",
                  padding: "0.65rem 2rem", cursor: departments.some(d => d.current > 0) ? "pointer" : "not-allowed",
                  fontSize: "0.9rem", fontFamily: F, fontWeight: 700,
                  boxShadow: departments.some(d => d.current > 0) ? `0 4px 12px ${C.lavender}40` : "none",
                }}
              >
                التالي: العدد المتوقع ←
              </button>
            </div>
          </Card>
        )}

        {/* ── STEP 2: Expected Headcount ── */}
        {step === 2 && (
          <Card>
            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: C.text, margin: 0 }}>
                📈 الخطوة الثانية: العدد المتوقع
              </h2>
              <p style={{ fontSize: "0.82rem", color: C.muted, marginTop: "0.3rem" }}>
                ما هو العدد المثالي أو المخطط له لكل قسم خلال الفترة القادمة؟
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {departments.map(dept => (
                <div key={dept.id} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  background: C.lavenderLight, borderRadius: "10px", padding: "0.75rem 1rem",
                }}>
                  <div style={{ flex: 1, fontSize: "0.88rem", fontWeight: 700, color: C.text }}>
                    {dept.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.68rem", color: C.muted, marginBottom: "0.2rem" }}>الحالي</div>
                      <div style={{
                        background: "var(--card)", borderRadius: "6px", padding: "0.3rem 0.6rem",
                        fontSize: "0.9rem", fontWeight: 700, color: C.lavender,
                        border: `1px solid ${C.lavenderMid}`,
                      }}>{dept.current}</div>
                    </div>
                    <span style={{ color: C.muted, fontSize: "1.2rem" }}>→</span>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.68rem", color: C.muted, marginBottom: "0.2rem" }}>المتوقع</div>
                      <input
                        type="number" min={0}
                        value={dept.expected || ""}
                        onChange={e => updateDept(dept.id, "expected", Number(e.target.value))}
                        style={{
                          width: "70px", border: `1.5px solid ${C.lavender}`, borderRadius: "6px",
                          padding: "0.3rem 0.5rem", fontSize: "0.9rem", fontFamily: F,
                          background: "var(--card)", color: C.text, textAlign: "center", outline: "none",
                        }}
                      />
                    </div>
                    {dept.expected > 0 && (
                      <div style={{
                        fontSize: "0.75rem", fontWeight: 700,
                        color: dept.expected > dept.current ? C.deficit : dept.expected < dept.current ? C.surplus : C.lavender,
                        background: dept.expected > dept.current ? C.deficitLight : dept.expected < dept.current ? C.surplusLight : C.lavenderLight,
                        borderRadius: "6px", padding: "0.2rem 0.5rem",
                      }}>
                        {dept.expected > dept.current ? `+${dept.expected - dept.current} مطلوب` :
                          dept.expected < dept.current ? `${dept.current - dept.expected} فائض` : "متوازن"}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button onClick={() => setStep(1)} style={{
                background: "var(--card)", color: C.lavender, border: `1.5px solid ${C.lavender}`,
                borderRadius: "10px", padding: "0.65rem 1.5rem", cursor: "pointer",
                fontSize: "0.9rem", fontFamily: F, fontWeight: 700,
              }}>→ السابق</button>
              <button onClick={() => setStep(3)} style={{
                background: C.lavender, color: "var(--card)", border: "none",
                borderRadius: "10px", padding: "0.65rem 2rem", cursor: "pointer",
                fontSize: "0.9rem", fontFamily: F, fontWeight: 700,
                boxShadow: `0 4px 12px ${C.lavender}40`,
              }}>التالي: تحليل عبء العمل ←</button>
            </div>
          </Card>
        )}

        {/* ── STEP 3: Workload Analysis ── */}
        {step === 3 && (
          <Card>
            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: C.text, margin: 0 }}>
                ⚖️ الخطوة الثالثة: تحليل عبء العمل
              </h2>
              <p style={{ fontSize: "0.82rem", color: C.muted, marginTop: "0.3rem" }}>
                أدخل المهام الأسبوعية وعدد ساعاتها لكل قسم (يُفترض 40 ساعة عمل/أسبوع للموظف الواحد)
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {/* Header */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 120px 160px 36px",
                gap: "0.5rem", padding: "0.4rem 0.75rem",
                fontSize: "0.72rem", color: C.muted, fontWeight: 700,
              }}>
                <span>اسم المهمة</span>
                <span style={{ textAlign: "center" }}>ساعات/أسبوع</span>
                <span style={{ textAlign: "center" }}>القسم المسؤول</span>
                <span />
              </div>

              {tasks.map(task => (
                <div key={task.id} style={{
                  display: "grid", gridTemplateColumns: "1fr 120px 160px 36px",
                  gap: "0.5rem", alignItems: "center",
                  background: C.lavenderLight, borderRadius: "10px", padding: "0.6rem 0.75rem",
                }}>
                  <input
                    value={task.name}
                    onChange={e => updateTask(task.id, "name", e.target.value)}
                    placeholder="مثال: مراجعة الرواتب الشهرية"
                    style={{
                      border: `1px solid ${C.lavenderMid}`, borderRadius: "7px",
                      padding: "0.4rem 0.6rem", fontSize: "0.82rem", fontFamily: F,
                      background: "var(--card)", color: C.text, outline: "none", width: "100%",
                    }}
                  />
                  <input
                    type="number" min={0} max={200}
                    value={task.hoursPerWeek || ""}
                    onChange={e => updateTask(task.id, "hoursPerWeek", Number(e.target.value))}
                    placeholder="0"
                    style={{
                      border: `1px solid ${C.lavenderMid}`, borderRadius: "7px",
                      padding: "0.4rem 0.5rem", fontSize: "0.9rem", fontFamily: F,
                      background: "var(--card)", color: C.text, textAlign: "center", outline: "none", width: "100%",
                    }}
                  />
                  <select
                    value={task.assignedDept}
                    onChange={e => updateTask(task.id, "assignedDept", e.target.value)}
                    style={{
                      border: `1px solid ${C.lavenderMid}`, borderRadius: "7px",
                      padding: "0.4rem 0.5rem", fontSize: "0.8rem", fontFamily: F,
                      background: "var(--card)", color: C.text, outline: "none", width: "100%",
                    }}
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeTask(task.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--destructive)", fontSize: "1rem", padding: "0.2rem",
                    }}
                  >✕</button>
                </div>
              ))}
            </div>

            <button onClick={addTask} style={{
              background: "none", border: `1.5px dashed ${C.lavenderMid}`, borderRadius: "8px",
              padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.82rem", fontFamily: F,
              color: C.lavender, fontWeight: 700, marginTop: "0.75rem", width: "100%",
            }}>+ إضافة مهمة</button>

            {/* Summary per dept */}
            <div style={{
              marginTop: "1.25rem", background: C.lavenderLight, borderRadius: "10px", padding: "1rem",
            }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.lavender, marginBottom: "0.5rem" }}>
                ملخص ساعات العمل لكل قسم:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {departments.map(dept => {
                  const hrs = tasks.filter(t => t.assignedDept === dept.id).reduce((s, t) => s + (Number(t.hoursPerWeek) || 0), 0);
                  const req = hrs > 0 ? Math.ceil(hrs / 40) : 0;
                  return (
                    <div key={dept.id} style={{
                      background: "var(--card)", borderRadius: "8px", padding: "0.4rem 0.75rem",
                      border: `1px solid ${C.lavenderMid}`, fontSize: "0.78rem",
                    }}>
                      <span style={{ fontWeight: 700, color: C.text }}>{dept.name}</span>
                      <span style={{ color: C.muted, margin: "0 0.3rem" }}>|</span>
                      <span style={{ color: C.lavender }}>{hrs} ساعة/أسبوع</span>
                      {req > 0 && <span style={{ color: C.subtext, marginRight: "0.3rem" }}>← يحتاج {req} موظف</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button onClick={() => setStep(2)} style={{
                background: "var(--card)", color: C.lavender, border: `1.5px solid ${C.lavender}`,
                borderRadius: "10px", padding: "0.65rem 1.5rem", cursor: "pointer",
                fontSize: "0.9rem", fontFamily: F, fontWeight: 700,
              }}>→ السابق</button>
              <button onClick={runAnalysis} style={{
                background: C.lavender, color: "var(--card)", border: "none",
                borderRadius: "10px", padding: "0.65rem 2rem", cursor: "pointer",
                fontSize: "0.9rem", fontFamily: F, fontWeight: 700,
                boxShadow: `0 4px 12px ${C.lavender}40`,
              }}>📊 عرض النتائج والتوصيات ←</button>
            </div>
          </Card>
        )}

        {/* ── STEP 4: Results ── */}
        {step === 4 && results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Summary bar */}
            <div style={{
              display: "flex", gap: "0.75rem", flexWrap: "wrap",
            }}>
              {[
                { label: "أقسام بعجز", count: results.filter(r => r.status === "deficit").length, color: C.deficit, bg: C.deficitLight, icon: "⚠️" },
                { label: "أقسام بفائض", count: results.filter(r => r.status === "surplus").length, color: C.surplus, bg: C.surplusLight, icon: "✅" },
                { label: "أقسام متوازنة", count: results.filter(r => r.status === "balanced").length, color: C.lavender, bg: C.lavenderLight, icon: "⚖️" },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, minWidth: "140px", background: s.bg, borderRadius: "12px",
                  padding: "1rem", textAlign: "center",                   border: `1px solid color-mix(in oklch, ${s.color} 20%, transparent)`,
                }}>
                  <div style={{ fontSize: "1.5rem" }}>{s.icon}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: "0.78rem", color: s.color, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Per-department results */}
            {results.map(r => (
              <Card key={r.deptId} style={{
                borderRight: `4px solid ${r.status === "deficit" ? C.deficit : r.status === "surplus" ? C.surplus : C.lavender}`,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: C.text }}>{r.deptName}</div>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.78rem", background: C.lavenderLight, color: C.lavender, borderRadius: "6px", padding: "0.2rem 0.5rem", fontWeight: 700 }}>
                        الحالي: {r.current} موظف
                      </span>
                      <span style={{ fontSize: "0.78rem", background: "var(--secondary)", color: C.subtext, borderRadius: "6px", padding: "0.2rem 0.5rem", fontWeight: 700 }}>
                        المتوقع: {r.expected} موظف
                      </span>
                      {r.totalHoursPerWeek > 0 && (
                        <span style={{ fontSize: "0.78rem", background: "color-mix(in oklch, var(--warning) 15%, transparent)", color: "var(--warning)", borderRadius: "6px", padding: "0.2rem 0.5rem", fontWeight: 700 }}>
                          عبء العمل: {r.totalHoursPerWeek} ساعة/أسبوع
                        </span>
                      )}
                      {r.totalHoursPerWeek > 0 && (
                        <span style={{ fontSize: "0.78rem", background: "color-mix(in oklch, var(--info) 15%, transparent)", color: "var(--info)", borderRadius: "6px", padding: "0.2rem 0.5rem", fontWeight: 700 }}>
                          يحتاج: {r.requiredHeadcount} موظف
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    background: r.status === "deficit" ? C.deficitLight : r.status === "surplus" ? C.surplusLight : C.lavenderLight,
                    color: r.status === "deficit" ? C.deficit : r.status === "surplus" ? C.surplus : C.lavender,
                    borderRadius: "10px", padding: "0.5rem 1rem", textAlign: "center",
                    border: `1.5px solid color-mix(in oklch, ${r.status === "deficit" ? C.deficit : r.status === "surplus" ? C.surplus : C.lavender} 20%, transparent)`,
                    minWidth: "120px",
                  }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>
                      {r.status === "deficit" ? `عجز ${Math.abs(r.gap)}` : r.status === "surplus" ? `فائض ${r.gap}` : "متوازن"}
                    </div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, marginTop: "0.1rem" }}>
                      {r.status === "deficit" ? "⚠️ يحتاج توظيف" : r.status === "surplus" ? "✅ يمكن إعادة توزيع" : "⚖️ الوضع مثالي"}
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div style={{ marginTop: "1rem", borderTop: `1px solid ${C.border}`, paddingTop: "0.75rem" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.subtext, marginBottom: "0.5rem" }}>
                    💡 التوصيات:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {r.recommendations.map((rec, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "flex-start", gap: "0.5rem",
                        fontSize: "0.82rem", color: C.text, lineHeight: 1.5,
                      }}>
                        <span style={{
                          color: r.status === "deficit" ? C.deficit : r.status === "surplus" ? C.surplus : C.lavender,
                          marginTop: "0.1rem", flexShrink: 0,
                        }}>◆</span>
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={() => { setStep(1); setResults([]); }} style={{
                background: "var(--card)", color: C.lavender, border: `1.5px solid ${C.lavender}`,
                borderRadius: "10px", padding: "0.65rem 1.5rem", cursor: "pointer",
                fontSize: "0.9rem", fontFamily: F, fontWeight: 700,
              }}>🔄 تحليل جديد</button>
              <button onClick={() => window.print()} style={{
                background: C.lavender, color: "var(--card)", border: "none",
                borderRadius: "10px", padding: "0.65rem 1.5rem", cursor: "pointer",
                fontSize: "0.9rem", fontFamily: F, fontWeight: 700,
                boxShadow: `0 4px 12px ${C.lavender}40`,
              }}>🖨️ طباعة التقرير</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
