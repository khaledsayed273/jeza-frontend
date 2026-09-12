import { useState, useRef, useCallback, type ReactElement } from "react";
import { useLocation } from "wouter";

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  lavender: "var(--primary)",
  lavenderMid: "color-mix(in oklch, var(--primary) 80%, var(--foreground))",
  lavenderLight: "color-mix(in oklch, var(--primary) 15%, transparent)",
  lavenderLighter: "color-mix(in oklch, var(--primary) 8%, transparent)",
  lavenderDark: "color-mix(in oklch, var(--primary) 70%, var(--foreground))",
  lavenderBorder: "color-mix(in oklch, var(--primary) 40%, transparent)",
  text: "var(--foreground)",
  subtext: "var(--muted-foreground)",
  muted: "var(--muted-foreground)",
  border: "var(--border)",
  white: "var(--card)",
  bg: "var(--background)",
  cardShadow: "0 2px 12px color-mix(in oklch, var(--primary) 10%, transparent)",
  nodeShadow: "0 4px 16px color-mix(in oklch, var(--primary) 18%, transparent)",
};

const F = "'Cairo', 'Noto Naskh Arabic', sans-serif";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrgNode {
  id: string;
  title: string;
  name: string;
  department: string;
  parentId: string | null;
  color?: string;
}

// ─── Default templates ────────────────────────────────────────────────────────
const TEMPLATES: Record<string, OrgNode[]> = {
  startup: [
    { id: "1", title: "الرئيس التنفيذي", name: "", department: "الإدارة العليا", parentId: null, color: C.lavender },
    { id: "2", title: "مدير العمليات", name: "", department: "العمليات", parentId: "1", color: C.lavenderMid },
    { id: "3", title: "مدير المالية", name: "", department: "المالية", parentId: "1", color: C.lavenderMid },
    { id: "4", title: "مدير التقنية", name: "", department: "التقنية", parentId: "1", color: C.lavenderMid },
    { id: "5", title: "مشرف العمليات", name: "", department: "العمليات", parentId: "2", color: C.lavenderMid },
    { id: "6", title: "محاسب أول", name: "", department: "المالية", parentId: "3", color: C.lavenderMid },
    { id: "7", title: "مطور أول", name: "", department: "التقنية", parentId: "4", color: C.lavenderMid },
    { id: "8", title: "مطور ثانٍ", name: "", department: "التقنية", parentId: "4", color: C.lavenderMid },
  ],
  hr_dept: [
    { id: "1", title: "مدير الموارد البشرية", name: "", department: "الموارد البشرية", parentId: null, color: C.lavender },
    { id: "2", title: "مشرف التوظيف", name: "", department: "التوظيف", parentId: "1", color: C.lavenderMid },
    { id: "3", title: "مشرف التدريب", name: "", department: "التدريب", parentId: "1", color: C.lavenderMid },
    { id: "4", title: "مشرف الرواتب", name: "", department: "الرواتب", parentId: "1", color: C.lavenderMid },
    { id: "5", title: "أخصائي توظيف", name: "", department: "التوظيف", parentId: "2", color: C.lavenderMid },
    { id: "6", title: "أخصائي تدريب", name: "", department: "التدريب", parentId: "3", color: C.lavenderMid },
    { id: "7", title: "أخصائي رواتب", name: "", department: "الرواتب", parentId: "4", color: C.lavenderMid },
  ],
  blank: [
    { id: "1", title: "المسمى الوظيفي", name: "", department: "القسم", parentId: null, color: C.lavender },
  ],
};

// ─── SVG Org Chart Renderer ───────────────────────────────────────────────────
function OrgChartSVG({ nodes }: { nodes: OrgNode[] }) {
  const NODE_W = 160;
  const NODE_H = 70;
  const H_GAP = 24;
  const V_GAP = 60;

  // Build tree structure
  const childrenMap: Record<string, string[]> = {};
  const nodeMap: Record<string, OrgNode> = {};
  nodes.forEach(n => {
    nodeMap[n.id] = n;
    if (!childrenMap[n.id]) childrenMap[n.id] = [];
    if (n.parentId) {
      if (!childrenMap[n.parentId]) childrenMap[n.parentId] = [];
      childrenMap[n.parentId].push(n.id);
    }
  });

  const root = nodes.find(n => !n.parentId);
  if (!root) return null;

  // Calculate subtree widths
  const subtreeWidth = (id: string): number => {
    const children = childrenMap[id] || [];
    if (children.length === 0) return NODE_W;
    return Math.max(NODE_W, children.reduce((sum, cid) => sum + subtreeWidth(cid) + H_GAP, -H_GAP));
  };

  // Calculate positions
  const positions: Record<string, { x: number; y: number }> = {};
  const calcPos = (id: string, x: number, y: number) => {
    positions[id] = { x, y };
    const children = childrenMap[id] || [];
    if (children.length === 0) return;
    const totalW = children.reduce((sum, cid) => sum + subtreeWidth(cid) + H_GAP, -H_GAP);
    let cx = x - totalW / 2;
    children.forEach(cid => {
      const sw = subtreeWidth(cid);
      calcPos(cid, cx + sw / 2, y + NODE_H + V_GAP);
      cx += sw + H_GAP;
    });
  };

  const totalW = subtreeWidth(root.id);
  const padding = 40;
  calcPos(root.id, totalW / 2 + padding, padding);

  // Calculate SVG dimensions
  const allPos = Object.values(positions);
  const svgW = Math.max(...allPos.map(p => p.x)) + NODE_W / 2 + padding;
  const svgH = Math.max(...allPos.map(p => p.y)) + NODE_H + padding;

  // Draw lines
  const lines: ReactElement[] = [];
  nodes.forEach(n => {
    if (!n.parentId || !positions[n.id] || !positions[n.parentId]) return;
    const px = positions[n.parentId].x;
    const py = positions[n.parentId].y + NODE_H;
    const cx = positions[n.id].x;
    const cy = positions[n.id].y;
    const midY = py + V_GAP / 2;
    lines.push(
      <path
        key={`line-${n.id}`}
        d={`M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`}
        fill="none"
        stroke={C.lavenderBorder}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ display: "block", margin: "0 auto" }}
    >
      <defs>
        <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="var(--primary)" floodOpacity="0.15" />
        </filter>
      </defs>
      {lines}
      {nodes.map(n => {
        const pos = positions[n.id];
        if (!pos) return null;
        const isRoot = !n.parentId;
        const depth = (() => {
          let d = 0; let cur: OrgNode | undefined = n;
          while (cur?.parentId) { d++; cur = nodeMap[cur.parentId]; }
          return d;
        })();
        const bgColor = depth === 0 ? C.lavender : depth === 1 ? C.lavenderMid : C.lavenderLight;
        const textColor = "var(--primary-foreground)";

        return (
          <g key={n.id} transform={`translate(${pos.x - NODE_W / 2}, ${pos.y})`}>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx="10"
              ry="10"
              fill={bgColor}
              filter="url(#nodeShadow)"
            />
            {/* Title */}
            <text
              x={NODE_W / 2}
              y={n.name ? 26 : 38}
              textAnchor="middle"
              fill={textColor}
              fontSize={isRoot ? "12" : "11"}
              fontWeight="700"
              fontFamily={F}
            >
              {n.title.length > 18 ? n.title.slice(0, 17) + "…" : n.title}
            </text>
            {/* Name */}
            {n.name && (
              <text
                x={NODE_W / 2}
                y={44}
                textAnchor="middle"
                fill="rgba(255,255,255,0.85)"
                fontSize="10"
                fontFamily={F}
              >
                {n.name.length > 20 ? n.name.slice(0, 19) + "…" : n.name}
              </text>
            )}
            {/* Department badge */}
            {n.department && (
              <text
                x={NODE_W / 2}
                y={n.name ? 60 : 56}
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize="9"
                fontFamily={F}
              >
                {n.department}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Node Editor Row ──────────────────────────────────────────────────────────
function NodeRow({
  node,
  nodes,
  onUpdate,
  onDelete,
  onAddChild,
}: {
  node: OrgNode;
  nodes: OrgNode[];
  onUpdate: (id: string, field: keyof OrgNode, val: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const depth = (() => {
    const nodeMap: Record<string, OrgNode> = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });
    let d = 0; let cur: OrgNode | undefined = node;
    while (cur?.parentId) { d++; cur = nodeMap[cur.parentId]; }
    return d;
  })();

  const parents = nodes.filter(n => n.id !== node.id && !isDescendant(n.id, node.id, nodes));
  const isRoot = !node.parentId;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      background: depth === 0 ? C.lavenderLight : depth === 1 ? C.lavenderLighter : C.white,
      borderRadius: "10px", padding: "0.6rem 0.75rem",
      border: `1px solid ${depth === 0 ? C.lavenderBorder : C.border}`,
      marginRight: `${depth * 20}px`,
    }}>
      {/* Depth indicator */}
      <div style={{
        width: "6px", height: "36px", borderRadius: "3px",
        background: depth === 0 ? C.lavender : depth === 1 ? C.lavenderMid : C.lavenderBorder,
        flexShrink: 0,
      }} />

      {/* Title */}
      <input
        value={node.title}
        onChange={e => onUpdate(node.id, "title", e.target.value)}
        placeholder="المسمى الوظيفي"
        style={{
          flex: "2", border: `1px solid ${C.lavenderBorder}`, borderRadius: "7px",
          padding: "0.4rem 0.6rem", fontSize: "0.82rem", fontFamily: F,
          background: C.white, color: C.text, outline: "none",
        }}
      />

      {/* Name */}
      <input
        value={node.name}
        onChange={e => onUpdate(node.id, "name", e.target.value)}
        placeholder="اسم الموظف (اختياري)"
        style={{
          flex: "2", border: `1px solid ${C.lavenderBorder}`, borderRadius: "7px",
          padding: "0.4rem 0.6rem", fontSize: "0.82rem", fontFamily: F,
          background: C.white, color: C.text, outline: "none",
        }}
      />

      {/* Department */}
      <input
        value={node.department}
        onChange={e => onUpdate(node.id, "department", e.target.value)}
        placeholder="القسم"
        style={{
          flex: "1.5", border: `1px solid ${C.lavenderBorder}`, borderRadius: "7px",
          padding: "0.4rem 0.6rem", fontSize: "0.82rem", fontFamily: F,
          background: C.white, color: C.text, outline: "none",
        }}
      />

      {/* Parent */}
      {!isRoot && (
        <select
          value={node.parentId || ""}
          onChange={e => onUpdate(node.id, "parentId", e.target.value)}
          style={{
            flex: "1.5", border: `1px solid ${C.lavenderBorder}`, borderRadius: "7px",
            padding: "0.4rem 0.5rem", fontSize: "0.78rem", fontFamily: F,
            background: C.white, color: C.text, outline: "none",
          }}
        >
          {parents.map(p => (
            <option key={p.id} value={p.id}>{p.title || "بدون عنوان"}</option>
          ))}
        </select>
      )}
      {isRoot && (
        <div style={{
          flex: "1.5", fontSize: "0.72rem", color: C.lavender, fontWeight: 700,
          background: C.lavenderLight, borderRadius: "7px", padding: "0.4rem 0.6rem",
          textAlign: "center",
        }}>قمة الهيكل</div>
      )}

      {/* Actions */}
      <button
        onClick={() => onAddChild(node.id)}
        title="إضافة تابع"
        style={{
          background: C.lavenderLight, border: "none", borderRadius: "7px",
          padding: "0.4rem 0.6rem", cursor: "pointer", color: C.lavender,
          fontSize: "0.85rem", fontWeight: 700, flexShrink: 0,
        }}
      >+</button>
      {!isRoot && (
        <button
          onClick={() => onDelete(node.id)}
          title="حذف"
          style={{
            background: "color-mix(in oklch, var(--destructive) 15%, transparent)", border: "none", borderRadius: "7px",
            padding: "0.4rem 0.6rem", cursor: "pointer", color: "var(--destructive-strong)",
            fontSize: "0.85rem", flexShrink: 0,
          }}
        >✕</button>
      )}
    </div>
  );
}

function isDescendant(nodeId: string, ancestorId: string, nodes: OrgNode[]): boolean {
  const nodeMap: Record<string, OrgNode> = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });
  let cur = nodeMap[nodeId];
  while (cur?.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = nodeMap[cur.parentId];
  }
  return false;
}

// ─── Best Practices Panel ─────────────────────────────────────────────────────
function BestPracticesPanel() {
  const practices = [
    { icon: "🎯", title: "نطاق الإشراف", desc: "المدير الواحد يُشرف على 5–8 موظفين كحد أمثل — أقل من 3 يُشير إلى ترهل إداري، أكثر من 10 يُضعف الرقابة" },
    { icon: "📐", title: "عمق الهيكل", desc: "الهيكل الأفقي (3-4 مستويات) أسرع في القرار — الهيكل العميق (+6 مستويات) يُبطئ التواصل" },
    { icon: "⚖️", title: "وحدة الأمر", desc: "كل موظف يرفع لمسؤول واحد فقط — الازدواجية في التبعية تُسبب تعارض الأوامر والإرباك" },
    { icon: "🔄", title: "المرونة والتوسع", desc: "صمّم الهيكل ليستوعب النمو — أضف مستويات أفقية قبل العمودية لتجنب البيروقراطية" },
    { icon: "🏗️", title: "التجميع الوظيفي", desc: "جمّع الوظائف المتشابهة في قسم واحد لتحقيق الكفاءة والتخصص وتقليل التكرار" },
    { icon: "📋", title: "الأوصاف الوظيفية", desc: "كل منصب في الهيكل يجب أن يرتبط بوصف وظيفي واضح يُحدد المهام والصلاحيات والمسؤوليات" },
  ];

  return (
    <div style={{
      background: C.white, borderRadius: "16px", border: `1px solid ${C.border}`,
      boxShadow: C.cardShadow, padding: "1.25rem",
    }}>
      <div style={{ fontSize: "0.9rem", fontWeight: 800, color: C.text, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>🌍</span> أفضل الممارسات العالمية في تصميم الهيكل التنظيمي
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
        {practices.map((p, i) => (
          <div key={i} style={{
            background: C.lavenderLighter, borderRadius: "10px", padding: "0.85rem",
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.lavender, marginBottom: "0.3rem" }}>
              {p.icon} {p.title}
            </div>
            <div style={{ fontSize: "0.78rem", color: C.subtext, lineHeight: 1.6 }}>{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrgChartPage() {
  const [, navigate] = useLocation();
  const [nodes, setNodes] = useState<OrgNode[]>(TEMPLATES.blank);
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "practices">("edit");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const chartRef = useRef<HTMLDivElement>(null);

  const updateNode = useCallback((id: string, field: keyof OrgNode, val: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: val } : n));
  }, []);

  const deleteNode = useCallback((id: string) => {
    // Also delete all descendants
    const toDelete = new Set<string>();
    const collect = (nid: string) => {
      toDelete.add(nid);
      setNodes(prev => {
        prev.filter(n => n.parentId === nid).forEach(c => collect(c.id));
        return prev;
      });
    };
    setNodes(prev => {
      const collectIds = (nid: string) => {
        toDelete.add(nid);
        prev.filter(n => n.parentId === nid).forEach(c => collectIds(c.id));
      };
      collectIds(id);
      return prev.filter(n => !toDelete.has(n.id));
    });
  }, []);

  const addChild = useCallback((parentId: string) => {
    const newId = `node_${Date.now()}`;
    setNodes(prev => [...prev, {
      id: newId,
      title: "مسمى وظيفي جديد",
      name: "",
      department: "",
      parentId,
      color: C.lavenderMid,
    }]);
  }, []);

  const loadTemplate = (key: string) => {
    setNodes(TEMPLATES[key].map(n => ({ ...n })));
    setSelectedTemplate(key);
  };

  const addRootSibling = () => {
    const newId = `node_${Date.now()}`;
    const root = nodes.find(n => !n.parentId);
    setNodes(prev => [...prev, {
      id: newId,
      title: "مسمى وظيفي جديد",
      name: "",
      department: "",
      parentId: root?.id || null,
      color: C.lavenderMid,
    }]);
  };

  // Sort nodes by tree order for display
  const sortedNodes = (() => {
    const result: OrgNode[] = [];
    const nodeMap: Record<string, OrgNode> = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });
    const visit = (id: string) => {
      const n = nodeMap[id];
      if (n) {
        result.push(n);
        nodes.filter(c => c.parentId === id).forEach(c => visit(c.id));
      }
    };
    const root = nodes.find(n => !n.parentId);
    if (root) visit(root.id);
    return result;
  })();

  // Stats
  const totalNodes = nodes.length;
  const maxDepth = (() => {
    const nodeMap: Record<string, OrgNode> = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });
    let max = 0;
    nodes.forEach(n => {
      let d = 0; let cur: OrgNode | undefined = n;
      while (cur?.parentId) { d++; cur = nodeMap[cur.parentId]; }
      if (d > max) max = d;
    });
    return max + 1;
  })();
  const managersCount = nodes.filter(n => nodes.some(c => c.parentId === n.id)).length;
  const avgSpan = managersCount > 0 ? (totalNodes - 1) / managersCount : 0;

  const tabStyle = (tab: string) => ({
    padding: "0.55rem 1.25rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontFamily: F,
    fontWeight: 700,
    background: activeTab === tab ? C.lavender : "transparent",
    color: activeTab === tab ? C.white : C.subtext,
    transition: "all 0.2s",
  } as React.CSSProperties);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: C.bg, fontFamily: F }}>
      {/* Header */}
      <div style={{
        background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <button onClick={() => navigate("/")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.lavender, fontSize: "0.85rem", fontFamily: F,
        }}>← العودة</button>
        <div style={{ flex: 1 }} />
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663364198732/2vuJLs9j7vTiL4E4emfRJ8/org_chart_icon-YYWyuMnwZJTZ9BcvKXzCqN.webp"
          alt="الهيكل التنظيمي"
          style={{ width: "36px", height: "36px", objectFit: "contain" }}
        />
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: C.text }}>الهيكل التنظيمي</div>
          <div style={{ fontSize: "0.72rem", color: C.muted }}>بناء وتصميم الهياكل التنظيمية الاحترافية</div>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {[
            { label: "إجمالي المناصب", value: totalNodes, icon: "👥" },
            { label: "مستويات الهيكل", value: maxDepth, icon: "📐" },
            { label: "عدد المديرين", value: managersCount, icon: "🎯" },
            { label: "متوسط نطاق الإشراف", value: avgSpan.toFixed(1), icon: "⚖️" },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, minWidth: "130px", background: C.white, borderRadius: "12px",
              border: `1px solid ${C.border}`, padding: "0.85rem 1rem",
              boxShadow: C.cardShadow, textAlign: "center",
            }}>
              <div style={{ fontSize: "1.3rem" }}>{s.icon}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: C.lavender }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
          {/* Span warning */}
          {avgSpan > 8 && (
            <div style={{
              flex: "0 0 auto", background: "color-mix(in oklch, var(--warning) 15%, transparent)", borderRadius: "12px",
              border: "1px solid color-mix(in oklch, var(--warning) 40%, transparent)", padding: "0.85rem 1rem",
              fontSize: "0.78rem", color: "var(--warning)", maxWidth: "220px",
            }}>
              ⚠️ نطاق الإشراف مرتفع ({avgSpan.toFixed(1)}) — يُنصح بإضافة مستوى إداري وسيط
            </div>
          )}
          {avgSpan > 0 && avgSpan < 3 && (
            <div style={{
              flex: "0 0 auto", background: "color-mix(in oklch, var(--warning) 15%, transparent)", borderRadius: "12px",
              border: "1px solid color-mix(in oklch, var(--warning) 40%, transparent)", padding: "0.85rem 1rem",
              fontSize: "0.78rem", color: "var(--warning)", maxWidth: "220px",
            }}>
              ⚠️ نطاق الإشراف منخفض ({avgSpan.toFixed(1)}) — قد يُشير إلى ترهل إداري
            </div>
          )}
        </div>

        {/* Template selector */}
        <div style={{
          background: C.white, borderRadius: "14px", border: `1px solid ${C.border}`,
          padding: "1rem 1.25rem", marginBottom: "1.25rem", boxShadow: C.cardShadow,
        }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.subtext, marginBottom: "0.6rem" }}>
            🗂️ ابدأ من نموذج جاهز أو أنشئ هيكلك من الصفر:
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {[
              { key: "blank", label: "هيكل فارغ", icon: "✨" },
              { key: "startup", label: "شركة ناشئة", icon: "🚀" },
              { key: "hr_dept", label: "قسم الموارد البشرية", icon: "👔" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => loadTemplate(t.key)}
                style={{
                  background: selectedTemplate === t.key ? C.lavender : C.lavenderLighter,
                  color: selectedTemplate === t.key ? C.white : C.lavender,
                  border: `1.5px solid ${selectedTemplate === t.key ? C.lavender : C.lavenderBorder}`,
                  borderRadius: "8px", padding: "0.45rem 1rem",
                  cursor: "pointer", fontSize: "0.82rem", fontFamily: F, fontWeight: 700,
                }}
              >{t.icon} {t.label}</button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: "0.4rem", background: C.lavenderLighter,
          borderRadius: "10px", padding: "0.3rem", marginBottom: "1.25rem",
          width: "fit-content",
        }}>
          <button style={tabStyle("edit")} onClick={() => setActiveTab("edit")}>✏️ تحرير الهيكل</button>
          <button style={tabStyle("preview")} onClick={() => setActiveTab("preview")}>👁️ معاينة الهيكل</button>
          <button style={tabStyle("practices")} onClick={() => setActiveTab("practices")}>🌍 أفضل الممارسات</button>
        </div>

        {/* ── EDIT TAB ── */}
        {activeTab === "edit" && (
          <div style={{
            background: C.white, borderRadius: "16px", border: `1px solid ${C.border}`,
            boxShadow: C.cardShadow, padding: "1.25rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 800, color: C.text }}>✏️ تحرير مناصب الهيكل</div>
                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.2rem" }}>
                  أدخل المسمى الوظيفي واسم الموظف والقسم والمسؤول المباشر لكل منصب
                </div>
              </div>
              <button onClick={addRootSibling} style={{
                background: C.lavender, color: C.white, border: "none",
                borderRadius: "8px", padding: "0.5rem 1rem", cursor: "pointer",
                fontSize: "0.82rem", fontFamily: F, fontWeight: 700,
                boxShadow: `0 3px 10px ${C.lavender}40`,
              }}>+ إضافة منصب</button>
            </div>

            {/* Column headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "6px 1fr 1fr 1fr 1fr 60px",
              gap: "0.5rem", padding: "0.3rem 0.75rem",
              fontSize: "0.7rem", color: C.muted, fontWeight: 700, marginBottom: "0.4rem",
            }}>
              <span />
              <span>المسمى الوظيفي *</span>
              <span>اسم الموظف</span>
              <span>القسم</span>
              <span>يرفع إلى</span>
              <span />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {sortedNodes.map(n => (
                <NodeRow
                  key={n.id}
                  node={n}
                  nodes={nodes}
                  onUpdate={updateNode}
                  onDelete={deleteNode}
                  onAddChild={addChild}
                />
              ))}
            </div>

            <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setActiveTab("preview")}
                style={{
                  background: C.lavender, color: C.white, border: "none",
                  borderRadius: "10px", padding: "0.65rem 2rem", cursor: "pointer",
                  fontSize: "0.9rem", fontFamily: F, fontWeight: 700,
                  boxShadow: `0 4px 12px ${C.lavender}40`,
                }}
              >👁️ معاينة الهيكل ←</button>
            </div>
          </div>
        )}

        {/* ── PREVIEW TAB ── */}
        {activeTab === "preview" && (
          <div style={{
            background: C.white, borderRadius: "16px", border: `1px solid ${C.border}`,
            boxShadow: C.cardShadow, padding: "1.25rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 800, color: C.text }}>👁️ معاينة الهيكل التنظيمي</div>
              <button
                onClick={() => window.print()}
                style={{
                  background: C.lavenderLight, color: C.lavender, border: `1.5px solid ${C.lavenderBorder}`,
                  borderRadius: "8px", padding: "0.45rem 1rem", cursor: "pointer",
                  fontSize: "0.82rem", fontFamily: F, fontWeight: 700,
                }}
              >🖨️ طباعة</button>
            </div>

            <div ref={chartRef} style={{
              overflowX: "auto", overflowY: "auto",
              background: C.lavenderLighter, borderRadius: "12px",
              padding: "1.5rem", minHeight: "300px",
              border: `1px solid ${C.border}`,
            }}>
              <OrgChartSVG nodes={nodes} />
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
              {[
                { color: C.lavender, label: "الإدارة العليا" },
                { color: C.lavenderMid, label: "الإدارة الوسطى" },
                { color: C.lavenderLight, label: "الموظفون التنفيذيون" },
              ].map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: l.color }} />
                  <span style={{ fontSize: "0.75rem", color: C.subtext }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BEST PRACTICES TAB ── */}
        {activeTab === "practices" && <BestPracticesPanel />}

      </div>
    </div>
  );
}
