export interface NavItem {
  path: string;
  labelAr: string;
  labelEn: string;
}

export interface NavGroup {
  titleAr: string;
  titleEn: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    titleAr: "الحاسبات",
    titleEn: "Calculators",
    items: [
      { path: "/calculator", labelAr: "حاسبة التوطين", labelEn: "Saudization Calculator" },
      { path: "/employee-cost", labelAr: "تكلفة الموظف", labelEn: "Employee Cost" },
      { path: "/hr-cost", labelAr: "تكلفة الموارد البشرية", labelEn: "HR Cost" },
      { path: "/turnover-rate", labelAr: "معدل الدوران", labelEn: "Turnover Rate" },
      { path: "/payroll", labelAr: "الرواتب", labelEn: "Payroll" },
      { path: "/end-of-service", labelAr: "المكافأة نهاية الخدمة", labelEn: "End of Service" },
      { path: "/leave-calculator", labelAr: "حاسبة الإجازات", labelEn: "Leave Calculator" },
      { path: "/nationality-ratio", labelAr: "النسبة الجنسية", labelEn: "Nationality Ratio" },
    ],
  },
  {
    titleAr: "التوظيف والعقود",
    titleEn: "Employment & Contracts",
    items: [
      { path: "/contract-conversion", labelAr: "تحويل العقد", labelEn: "Contract Conversion" },
      { path: "/probation", labelAr: "فترة التجربة", labelEn: "Probation" },
      { path: "/job-descriptions", labelAr: "الوصف الوظيفي", labelEn: "Job Descriptions" },
    ],
  },
  {
    titleAr: "المستندات",
    titleEn: "Documents",
    items: [
      { path: "/documents-hub", labelAr: "مركز المستندات", labelEn: "Documents Hub" },
      { path: "/templates", labelAr: "النماذج", labelEn: "Templates" },
      { path: "/letters", labelAr: "الخطابات", labelEn: "Letters" },
      { path: "/declarations", labelAr: "التصريحات", labelEn: "Declarations" },
      { path: "/policies", labelAr: "السياسات", labelEn: "Policies" },
    ],
  },
  {
    titleAr: "المعرفة",
    titleEn: "Knowledge",
    items: [
      { path: "/training", labelAr: "التدريب", labelEn: "Training" },
      { path: "/hr-explainers", labelAr: "شرح الموارد البشرية", labelEn: "HR Explainers" },
      { path: "/updates", labelAr: "التحديثات", labelEn: "Updates" },
      { path: "/resources", labelAr: "الموارد", labelEn: "Resources" },
    ],
  },
  {
    titleAr: "التخطيط",
    titleEn: "Planning",
    items: [
      { path: "/hc-kpi", labelAr: "مؤشرات الأداء", labelEn: "HC KPI" },
      { path: "/org-chart", labelAr: "الهيكل التنظيمي", labelEn: "Org Chart" },
      { path: "/workforce-planning", labelAr: "تخطيط القوى العاملة", labelEn: "Workforce Planning" },
    ],
  },
  {
    titleAr: "الحسابات والدعم",
    titleEn: "Account & Support",
    items: [
      { path: "/pricing", labelAr: "الأسعار", labelEn: "Pricing" },
      { path: "/about", labelAr: "من نحن", labelEn: "About" },
      { path: "/support", labelAr: "الدعم", labelEn: "Support" },
      { path: "/admin/tickets", labelAr: "تذاكر الدعم", labelEn: "Support Tickets" },
    ],
  },
];
