import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/api";

// ─────────────────────────────────────────────
// Types — End of Service
// ─────────────────────────────────────────────
type TerminationGroup =
  | "art53" | "art74" | "art75" | "art77" | "art79"
  | "art79bis" | "art80" | "art81" | "art82" | "art57" | "art137";

type TerminationReason =
  | "art53_probation"
  | "art74_mutual" | "art74_nonrenewal" | "art74_resign_fixed"
  | "art74_unilateral_unlimited" | "art74_retirement"
  | "art74_closure_full" | "art74_closure_activity" | "art74_saudization"
  | "art74_resign_general"
  | "art75_unilateral"
  | "art77_unlawful"
  | "art79_death_incapacity"
  | "art79bis_resign_fixed" | "art79bis_resign_marriage" | "art79bis_resign_childbirth"
  | "art80_dismissal"
  | "art81_worker_right"
  | "art82_sick_leave_exhausted"
  | "art57_specific_work"
  | "art137_work_injury";

interface TerminationOption {
  value: TerminationReason;
  labelAr: string;
  labelEn: string;
  group: TerminationGroup;
}

interface EosResult {
  entitled: boolean;
  amount: number;
  percentage: number;
  explanation: string;
  explanationEn: string;
  breakdown: { label: string; labelEn: string; value: number }[];
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Calculation Logic — End of Service
// ─────────────────────────────────────────────
function computeBaseGratuity(salary: number, totalYears: number): number {
  if (totalYears <= 0) return 0;
  const halfMonth = (salary / 30) * 15;
  const fullMonth = salary;
  if (totalYears <= 5) return halfMonth * totalYears;
  return halfMonth * 5 + fullMonth * (totalYears - 5);
}

function buildBreakdown(salary: number, totalYears: number): { label: string; labelEn: string; value: number }[] {
  if (totalYears <= 0) return [];
  const halfMonth = (salary / 30) * 15;
  const fullMonth = salary;
  if (totalYears <= 5) {
    return [{ label: `نصف راتب × ${totalYears.toFixed(2)} سنة (أول 5 سنوات)`, labelEn: `Half month × ${totalYears.toFixed(2)} years (first 5 years)`, value: halfMonth * totalYears }];
  }
  return [
    { label: "نصف راتب × 5 سنوات (أول 5 سنوات)", labelEn: "Half month × 5 years (first 5 years)", value: halfMonth * 5 },
    { label: `راتب كامل × ${(totalYears - 5).toFixed(2)} سنة (ما زاد عن 5 سنوات)`, labelEn: `Full month × ${(totalYears - 5).toFixed(2)} years (beyond 5 years)`, value: fullMonth * (totalYears - 5) },
  ];
}

function calculateEndOfService(salary: number, years: number, months: number, days: number, reason: TerminationReason): EosResult {
  const totalYears = years + months / 12 + days / 365;
  const noEntitlement: TerminationReason[] = ["art53_probation", "art80_dismissal", "art79bis_resign_fixed"];
  if (noEntitlement.includes(reason)) {
    return { entitled: false, amount: 0, percentage: 0, explanation: "لا يستحق مكافأة نهاية الخدمة وفق نظام العمل السعودي", explanationEn: "No end-of-service award is due under Saudi Labor Law", breakdown: [] };
  }
  const base = computeBaseGratuity(salary, totalYears);
  const breakdown = buildBreakdown(salary, totalYears);
  const isResignation = reason === "art74_resign_fixed" || reason === "art75_unilateral" || reason === "art74_resign_general";
  if (reason === "art79bis_resign_marriage" || reason === "art79bis_resign_childbirth") {
    return { entitled: true, amount: base, percentage: 100, explanation: "تستحق المكافأة كاملة بسبب الاستقالة للزواج أو الوضع", explanationEn: "Full gratuity is due for resignation due to marriage or childbirth", breakdown };
  }
  if (isResignation) {
    if (totalYears < 2) return { entitled: false, amount: 0, percentage: 0, explanation: "لا يستحق مكافأة — الاستقالة مع خدمة أقل من سنتين", explanationEn: "No gratuity — resignation with less than 2 years of service", breakdown: [] };
    if (totalYears < 5) return { entitled: true, amount: (base * 33.33) / 100, percentage: 33.33, explanation: "يستحق ثلث المكافأة (33.33%) — استقالة مع خدمة من سنتين إلى خمس سنوات", explanationEn: "One-third of gratuity (33.33%) — resignation with 2–5 years of service", breakdown };
    if (totalYears < 10) return { entitled: true, amount: (base * 66.66) / 100, percentage: 66.66, explanation: "يستحق ثلثي المكافأة (66.66%) — استقالة مع خدمة من خمس إلى عشر سنوات", explanationEn: "Two-thirds of gratuity (66.66%) — resignation with 5–10 years of service", breakdown };
    return { entitled: true, amount: base, percentage: 100, explanation: "يستحق المكافأة كاملة — استقالة مع خدمة أكثر من عشر سنوات", explanationEn: "Full gratuity — resignation with more than 10 years of service", breakdown };
  }
  const labels: Partial<Record<TerminationReason, { ar: string; en: string }>> = {
    art74_mutual: { ar: "إنهاء بالتراضي — مكافأة كاملة", en: "Mutual termination — full gratuity" },
    art74_unilateral_unlimited: { ar: "إنهاء بالإرادة المنفردة من صاحب العمل — مكافأة كاملة", en: "Employer unilateral termination — full gratuity" },
    art74_nonrenewal: { ar: "عدم تجديد العقد — مكافأة كاملة", en: "Non-renewal — full gratuity" },
    art74_retirement: { ar: "بلوغ سن التقاعد — مكافأة كاملة", en: "Retirement age — full gratuity" },
    art74_closure_full: { ar: "إغلاق المنشأة — مكافأة كاملة", en: "Establishment closure — full gratuity" },
    art74_closure_activity: { ar: "إغلاق النشاط — مكافأة كاملة", en: "Activity closure — full gratuity" },
    art74_saudization: { ar: "إنهاء بسبب التوطين — مكافأة كاملة", en: "Saudization termination — full gratuity" },
    art77_unlawful: { ar: "إنهاء غير مشروع — مكافأة كاملة + تعويض", en: "Unlawful termination — full gratuity + compensation" },
    art79_death_incapacity: { ar: "وفاة أو عجز — مكافأة كاملة", en: "Death or incapacity — full gratuity" },
    art81_worker_right: { ar: "ترك العمل بحق — مكافأة كاملة", en: "Worker's right to leave — full gratuity" },
    art82_sick_leave_exhausted: { ar: "استنفاذ الإجازة المرضية — مكافأة كاملة", en: "Sick leave exhausted — full gratuity" },
    art57_specific_work: { ar: "انتهاء عقد عمل معين — مكافأة كاملة", en: "Specific work contract end — full gratuity" },
    art137_work_injury: { ar: "إصابة عمل — مكافأة كاملة", en: "Work injury — full gratuity" },
  };
  return { entitled: true, amount: base, percentage: 100, explanation: labels[reason]?.ar ?? "يستحق المكافأة كاملة", explanationEn: labels[reason]?.en ?? "Full gratuity is due", breakdown };
}

// ─────────────────────────────────────────────
// Calculation Logic — Overtime (Art. 107)
// ─────────────────────────────────────────────
// Normal hours: 8 hrs/day, 48 hrs/week
// Overtime rate: 1.5x = 1 hour on gross + 0.5 hour on basic
// Hourly rate (gross) = gross salary / (30 * 8)
// Hourly rate (basic) = basic salary / (30 * 8)
function calculateOvertime(
  grossSalary: number,
  basicSalary: number,
  normalHours: number,
  overtimeHours: number
): {
  hourlyRateGross: number;
  hourlyRateBasic: number;
  normalPay: number;
  overtimePay: number;
  totalPay: number;
  breakdown: { label: string; labelEn: string; value: number }[];
} {
  if (grossSalary <= 0 || (normalHours <= 0 && overtimeHours <= 0)) {
    return { hourlyRateGross: 0, hourlyRateBasic: 0, normalPay: 0, overtimePay: 0, totalPay: 0, breakdown: [] };
  }
  const hourlyRateGross = grossSalary / (30 * 8);
  const hourlyRateBasic = basicSalary > 0 ? basicSalary / (30 * 8) : hourlyRateGross;
  // Normal pay based on gross hourly rate (kept for reference but not shown in total)
  const normalPay = hourlyRateGross * normalHours;
  // Overtime = 1 full hour on gross + 0.5 hour on basic (per hour of overtime)
  // Each overtime hour = hourlyRateGross (1 hour) + hourlyRateBasic × 0.5 (half hour)
  const overtimePay = (hourlyRateGross + hourlyRateBasic * 0.5) * overtimeHours;
  // Total = overtime pay only (not including normal pay)
  const totalPay = overtimePay;
  return {
    hourlyRateGross,
    hourlyRateBasic,
    normalPay,
    overtimePay,
    totalPay,
    breakdown: [
      { label: `الأجر الساعي (إجمالي) = ${grossSalary.toLocaleString("ar-SA")} ÷ (30 × 8)`, labelEn: `Hourly rate (gross) = ${grossSalary.toLocaleString()} ÷ (30 × 8)`, value: hourlyRateGross },
      { label: `الأجر الساعي (أساسي) = ${basicSalary.toLocaleString("ar-SA")} ÷ (30 × 8)`, labelEn: `Hourly rate (basic) = ${basicSalary.toLocaleString()} ÷ (30 × 8)`, value: hourlyRateBasic },
      { label: `أجر ساعة إضافية واحدة = الأجر الساعي الإجمالي + (الأجر الساعي الأساسي × 0.5)`, labelEn: `1 overtime hour = gross hourly rate + (basic hourly rate × 0.5)`, value: hourlyRateGross + hourlyRateBasic * 0.5 },
      { label: `إجمالي أجر الساعات الإضافية (${overtimeHours} ساعة × أجر الساعة الإضافية)`, labelEn: `Total overtime pay (${overtimeHours} hrs × overtime hourly rate)`, value: overtimePay },
    ],
  };
}

// ─────────────────────────────────────────────
// Calculation Logic — Annual Leave (Art. 109)
// ─────────────────────────────────────────────
// < 5 years: 21 days/year
// >= 5 years: 30 days/year
// Daily wage = gross salary / 30
// Leave balance compensation = daily wage × unused days
// Pre-departure days pay = gross salary / 30 × days worked before leaving
// GOSI deduction for Saudi employees = gosiRate% of eligible wage (basic+housing+transport+other) per month
function calculateLeave(
  grossSalary: number,
  gosiBasicSalary: number,
  gosiHousingAllowance: number,
  gosiTransportAllowance: number,
  gosiOtherAllowances: number,
  yearsOfService: number,
  unusedDays: number,
  preDepartureDays: number,
  isSaudi: boolean,
  gosiYear: number,
  customAnnualBalance?: number,
  gosiRatesData?: any
): {
  annualEntitlement: number;
  dailyWage: number;
  leaveBalance: number;
  compensation: number;
  preDeparturePay: number;
  gosiDeduction: number;
  eligibleWage: number;
  gosiRate: number;
  netPay: number;
  totalPay: number;
  breakdown: { label: string; labelEn: string; value: number; isDeduction?: boolean }[];
} {
  if (grossSalary <= 0) {
    return { annualEntitlement: 0, dailyWage: 0, leaveBalance: 0, compensation: 0, preDeparturePay: 0, gosiDeduction: 0, eligibleWage: 0, gosiRate: 0, netPay: 0, totalPay: 0, breakdown: [] };
  }
  // إذا تم تحديد رصيد مخصص نستخدمه، وإلا نحسب تلقائياً وفق المادة 109 نظام العمل
  const annualEntitlement = (customAnnualBalance !== undefined && customAnnualBalance > 0)
    ? customAnnualBalance
    : (yearsOfService >= 5 ? 30 : 21);
  const isCustomBalance = customAnnualBalance !== undefined && customAnnualBalance > 0;
  const dailyWage = grossSalary / 30;
  const compensation = dailyWage * unusedDays;
  const preDeparturePay = dailyWage * preDepartureDays;
  const grossTotal = compensation + preDeparturePay;
  // GOSI: employee rate% of eligible wage (basic+housing+transport+other), prorated for the days covered
  const totalDays = unusedDays + preDepartureDays;
  const eligibleWage = gosiBasicSalary + gosiHousingAllowance + gosiTransportAllowance + gosiOtherAllowances;
  const gosiRate = isSaudi ? getGosiEmployeeRate(gosiYear, gosiRatesData) : 0;
  const gosiDeduction = isSaudi && eligibleWage > 0 && totalDays > 0
    ? (eligibleWage * gosiRate / 100 / 30) * totalDays
    : 0;
  const netPay = grossTotal - gosiDeduction;
  const totalPay = netPay;
  const breakdown: { label: string; labelEn: string; value: number; isDeduction?: boolean }[] = [
    { label: `استحقاق الإجازة السنوية (${isCustomBalance ? `${annualEntitlement} يوم — رصيد مخصص` : yearsOfService >= 5 ? "30 يوم — خدمة 5 سنوات فأكثر" : "21 يوم — خدمة أقل من 5 سنوات"})`, labelEn: `Annual leave entitlement (${isCustomBalance ? `${annualEntitlement} days — custom balance` : yearsOfService >= 5 ? "30 days — 5+ years service" : "21 days — less than 5 years"})`, value: annualEntitlement },
    { label: `الأجر اليومي (إجمالي) = ${grossSalary.toLocaleString("ar-SA")} ÷ 30`, labelEn: `Daily wage (gross) = ${grossSalary.toLocaleString()} ÷ 30`, value: dailyWage },
    { label: `تعويض رصيد الإجازة (${unusedDays} يوم × ${dailyWage.toFixed(2)})`, labelEn: `Leave balance compensation (${unusedDays} days × ${dailyWage.toFixed(2)})`, value: compensation },
    ...(preDepartureDays > 0 ? [{ label: `أجر أيام العمل قبل المغادرة (${preDepartureDays} يوم × ${dailyWage.toFixed(2)})`, labelEn: `Pre-departure days pay (${preDepartureDays} days × ${dailyWage.toFixed(2)})`, value: preDeparturePay }] : []),
    ...(gosiDeduction > 0 ? [{ label: `خصم التأمينات: ${gosiRate}% × الراتب الخاضع للاشتراك في التأمينات الاجتماعية (${eligibleWage.toLocaleString("ar-SA")}) ÷ 30 × ${totalDays} يوم`, labelEn: `GOSI deduction: ${gosiRate}% × Eligible Wage for Social Insurance (${eligibleWage.toLocaleString()}) ÷ 30 × ${totalDays} days`, value: gosiDeduction, isDeduction: true }] : []),
  ];
  return {
    annualEntitlement,
    dailyWage,
    leaveBalance: unusedDays,
    compensation,
    preDeparturePay,
    gosiDeduction,
    eligibleWage,
    gosiRate,
    netPay,
    totalPay,
    breakdown,
  };
}

// ─────────────────────────────────────────────
// GOSI Progressive Rates (for new subscribers from 1 July 2025)
// 2024: Employee 9% + Employer 9% + SANED 0.75% on each side
// 2025: Employee 9.5% + Employer 9.5% + SANED 0.75% on each side
// 2026: Employee 10% + Employer 10% + SANED 0.75% on each side
// 2027: Employee 10.5% + Employer 10.5% + SANED 0.75% on each side
// 2028: Employee 11% + Employer 11% + SANED 0.75% on each side
// Non-Saudi employee: 0% employee + 2% employer (occupational hazard only)
// Eligible wage components: basic salary + housing allowance + transport allowance + other fixed allowances
// Excluded: overtime, bonuses, commissions, performance pay, expense reimbursements
// ─────────────────────────────────────────────
// SANED (0.75%) applies to BOTH employee and employer sides

function getGosiRates(year: number, isSaudi: boolean, gosiRatesData?: any) {
  if (!isSaudi) return { employee: 0, employer: 2, saned: 0 };
  const ratesMap = gosiRatesData?.rates;
  const rates = ratesMap ? { employee: ratesMap[year]?.employee ?? 10, employer: ratesMap[year]?.employer ?? 10, saned: ratesMap[year]?.saned ?? 0.75 } : gosiRatesData?.rates?.[year] ?? gosiRatesData?.rates?.[2026] ?? { employee: 0, employer: 0, saned: 0 };
  return rates;
}

// Total employee rate = insurance rate + SANED 0.75%
function getGosiEmployeeRate(year: number, gosiRatesData?: any): number {
  const ratesMap = gosiRatesData?.rates;
  const rates = ratesMap ? { employee: ratesMap[year]?.employee ?? 10, saned: ratesMap[year]?.saned ?? 0.75 } : gosiRatesData?.rates?.[year] ?? gosiRatesData?.rates?.[2026] ?? { employee: 0, employer: 0, saned: 0 };
  return rates.employee + rates.saned;
}

// ─────────────────────────────────────────────
// Calculation Logic — GOSI (Social Insurance)
interface GosiWageComponent {
  name: string;
  nameEn: string;
  amount: number;
  isEligible: boolean;
  note: string;
  noteEn: string;
}

interface GosiResult {
  eligibleWage: number;
  employeeShare: number;       // insurance rate only
  employeeSanedShare: number;  // SANED 0.75% on employee
  employeeTotalShare: number;  // insurance + SANED
  employerShare: number;       // insurance rate only
  employerSanedShare: number;  // SANED 0.75% on employer
  employerTotalShare: number;  // insurance + SANED
  ihtarMihani: number;         // 2% إخطار مهني على صاحب العمل (للسعوديين فقط)
  totalContribution: number;
  employeeRate: number;
  employerRate: number;
  sanedRate: number;
  components: GosiWageComponent[];
}

function calculateGOSI(
  basicSalary: number,
  housingAllowance: number,
  transportAllowance: number,
  otherEligible: number,
  isSaudi: boolean,
  year: number,
  gosiRatesData?: any
): GosiResult {
  const eligibleWage = basicSalary + housingAllowance + transportAllowance + otherEligible;
  const rates = getGosiRates(year, isSaudi, gosiRatesData);
  const employeeRate = rates.employee;
  const employerRate = rates.employer;
  const sanedRate = rates.saned;
  // Employee: insurance share + SANED 0.75%
  const employeeShare = (eligibleWage * employeeRate) / 100;
  const employeeSanedShare = (eligibleWage * sanedRate) / 100;
  const employeeTotalShare = employeeShare + employeeSanedShare;
  // Employer: insurance share + SANED 0.75%
  const employerShare = (eligibleWage * employerRate) / 100;
  const employerSanedShare = (eligibleWage * sanedRate) / 100;
  const employerTotalShare = employerShare + employerSanedShare;
  const ihtarMihani = isSaudi ? (eligibleWage * 0.02) : 0; // 2% إخطار مهني على صاحب العمل
  const totalContribution = employeeTotalShare + employerTotalShare;
  const components: GosiWageComponent[] = [
    { name: "الراتب الأساسي", nameEn: "Basic Salary", amount: basicSalary, isEligible: true, note: "خاضع للاشتراك", noteEn: "Subject to contribution" },
    { name: "بدل السكن", nameEn: "Housing Allowance", amount: housingAllowance, isEligible: true, note: "خاضع للاشتراك", noteEn: "Subject to contribution" },
    { name: "بدل النقل", nameEn: "Transport Allowance", amount: transportAllowance, isEligible: true, note: "خاضع للاشتراك", noteEn: "Subject to contribution" },
    { name: "بدلات أخرى خاضعة", nameEn: "Other Eligible Allowances", amount: otherEligible, isEligible: true, note: "خاضع للاشتراك", noteEn: "Subject to contribution" },
  ];
  return { eligibleWage, employeeShare, employeeSanedShare, employeeTotalShare, employerShare, employerSanedShare, employerTotalShare, ihtarMihani, totalContribution, employeeRate, employerRate, sanedRate, components };
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
type Tab = "eos" | "overtime" | "leave" | "gosi" | "compensatory";

export default function EndOfServicePage() {
  const [, navigate] = useLocation();
  const { t, lang, dir } = useLang();

  const [activeTab, setActiveTab] = useState<Tab>("eos");

  const { data: calculatorData } = api.calculator.getAll.useQuery();
  const terminationRulesData = calculatorData?.terminationRules;
  const gosiRatesData = calculatorData?.gosiRates;

  const TERMINATION_OPTIONS: TerminationOption[] = terminationRulesData?.terminationOptions ?? [];
  const GROUP_LABELS: Record<TerminationGroup, { ar: string; en: string }> = terminationRulesData?.groupLabels ?? {};
  const gosiRatesMap = gosiRatesData?.rates;
  function getYearRates(y: number) {
    if (gosiRatesMap?.[y]) return gosiRatesMap[y];
    const fb = gosiRatesData?.rates?.[y] ?? gosiRatesData?.rates?.[2026] ?? { employee: 0, employer: 0, saned: 0 };
    return fb;
  }

  // Purple palette (matching site theme)

  const inputStyle: React.CSSProperties = {
    background: "var(--input)",
    border: `1.5px solid ${"var(--border)"}`,
    color: "var(--foreground)",
    borderRadius: "0.75rem",
    padding: "0.65rem 1rem",
    fontSize: "0.95rem",
    fontFamily: "'Cairo', sans-serif",
    width: "100%",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "var(--muted-foreground)",
    fontFamily: "'Cairo', sans-serif",
    marginBottom: "0.3rem",
    display: "block",
  };

  // ── EOS State ──
  const [eosSalary, setEosSalary] = useState("");
  const [eosYears, setEosYears] = useState("");
  const [eosMonths, setEosMonths] = useState("");
  const [eosDays, setEosDays] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<TerminationGroup | "">("");
  const [selectedReason, setSelectedReason] = useState<TerminationReason | "">("");
  const [eosResult, setEosResult] = useState<EosResult | null>(null);
  const [eosErrors, setEosErrors] = useState<Record<string, string>>({});
  const [eosDeduction, setEosDeduction] = useState("");
  const [eosBonus, setEosBonus] = useState("");

  const groups = Array.from(new Set(TERMINATION_OPTIONS.map((o) => o.group)));
  const optionsForGroup = selectedGroup ? TERMINATION_OPTIONS.filter((o) => o.group === selectedGroup) : [];

  function validateEos(): boolean {
    const e: Record<string, string> = {};
    if (!eosSalary || isNaN(Number(eosSalary)) || Number(eosSalary) <= 0)
      e.salary = t("يرجى إدخال راتب صحيح", "Please enter a valid salary");
    if (eosYears === "" && eosMonths === "" && eosDays === "")
      e.service = t("يرجى إدخال مدة الخدمة", "Please enter service duration");
    if (!selectedReason)
      e.reason = t("يرجى اختيار سبب الإنهاء", "Please select a termination reason");
    setEosErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleEosCalculate() {
    if (!validateEos()) return;
    const res = calculateEndOfService(
      Number(eosSalary), Number(eosYears) || 0, Number(eosMonths) || 0, Number(eosDays) || 0,
      selectedReason as TerminationReason
    );
    setEosResult(res);
    setTimeout(() => document.getElementById("eos-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function handleEosReset() {
    setEosSalary(""); setEosYears(""); setEosMonths(""); setEosDays("");
    setSelectedGroup(""); setSelectedReason(""); setEosResult(null); setEosErrors({}); setEosDeduction(""); setEosBonus("");
  }

  // ── Overtime State ──
  const [otGrossSalary, setOtGrossSalary] = useState("");
  const [otBasicSalary, setOtBasicSalary] = useState("");
  const [otNormalHours, setOtNormalHours] = useState("");
  const [otOvertimeHours, setOtOvertimeHours] = useState("");
  const [otResult, setOtResult] = useState<ReturnType<typeof calculateOvertime> | null>(null);
  const [otErrors, setOtErrors] = useState<Record<string, string>>({});

  function validateOt(): boolean {
    const e: Record<string, string> = {};
    if (!otGrossSalary || isNaN(Number(otGrossSalary)) || Number(otGrossSalary) <= 0)
      e.grossSalary = t("يرجى إدخال الراتب الإجمالي الصحيح", "Please enter a valid gross salary");
    if (!otBasicSalary || isNaN(Number(otBasicSalary)) || Number(otBasicSalary) <= 0)
      e.basicSalary = t("يرجى إدخال الراتب الأساسي الصحيح", "Please enter a valid basic salary");
    if (otOvertimeHours === "" || isNaN(Number(otOvertimeHours)) || Number(otOvertimeHours) < 0)
      e.hours = t("يرجى إدخال عدد ساعات صحيح", "Please enter valid hours");
    setOtErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleOtCalculate() {
    if (!validateOt()) return;
    setOtResult(calculateOvertime(Number(otGrossSalary), Number(otBasicSalary), Number(otNormalHours) || 0, Number(otOvertimeHours) || 0));
    setTimeout(() => document.getElementById("ot-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function handleOtReset() { setOtGrossSalary(""); setOtBasicSalary(""); setOtNormalHours(""); setOtOvertimeHours(""); setOtResult(null); setOtErrors({}); }

  // ── Leave State ──
  const [lvSalary, setLvSalary] = useState("");
  const [lvGosiBasic, setLvGosiBasic] = useState("");
  const [lvGosiHousing, setLvGosiHousing] = useState("");
  const [lvGosiTransport, setLvGosiTransport] = useState("");
  const [lvGosiOther, setLvGosiOther] = useState("");
  const [lvYears, setLvYears] = useState("");
  const [lvUnusedDays, setLvUnusedDays] = useState("");
  const [lvPreDepartureDays, setLvPreDepartureDays] = useState("");
  const [lvIsSaudi, setLvIsSaudi] = useState(false);
  const [lvGosiYear, setLvGosiYear] = useState(2026);
  // رصيد الإجازة السنوية: "auto" = تلقائي حسب سنوات الخدمة، "21" / "30" / "custom" = مخصص
  const [lvLeaveMode, setLvLeaveMode] = useState<"auto" | "21" | "30" | "custom">("auto");
  const [lvCustomBalance, setLvCustomBalance] = useState("");
  const [lvResult, setLvResult] = useState<ReturnType<typeof calculateLeave> | null>(null);
  const [lvErrors, setLvErrors] = useState<Record<string, string>>({});
  const [lvDeduction, setLvDeduction] = useState("");
  const [lvBonus, setLvBonus] = useState("");

  function validateLv(): boolean {
    const e: Record<string, string> = {};
    if (!lvSalary || isNaN(Number(lvSalary)) || Number(lvSalary) <= 0)
      e.salary = t("يرجى إدخال راتب صحيح", "Please enter a valid salary");
    if (!lvYears || isNaN(Number(lvYears)) || Number(lvYears) < 0)
      e.years = t("يرجى إدخال سنوات الخدمة", "Please enter years of service");
    if (!lvUnusedDays || isNaN(Number(lvUnusedDays)) || Number(lvUnusedDays) < 0)
      e.days = t("يرجى إدخال أيام الإجازة غير المستخدمة", "Please enter unused leave days");
    setLvErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleLvCalculate() {
    if (!validateLv()) return;
    // حساب الرصيد السنوي المخصص
    let customBalance: number | undefined = undefined;
    if (lvLeaveMode === "21") customBalance = 21;
    else if (lvLeaveMode === "30") customBalance = 30;
    else if (lvLeaveMode === "custom" && lvCustomBalance && Number(lvCustomBalance) > 0)
      customBalance = Number(lvCustomBalance);
    // إذا كان الوضع تلقائيًا نترك customBalance = undefined ليحسب تلقائياً حسب سنوات الخدمة
    setLvResult(calculateLeave(
      Number(lvSalary),
      Number(lvGosiBasic) || 0,
      Number(lvGosiHousing) || 0,
      Number(lvGosiTransport) || 0,
      Number(lvGosiOther) || 0,
      Number(lvYears),
      Number(lvUnusedDays),
      Number(lvPreDepartureDays) || 0,
      lvIsSaudi,
      lvGosiYear,
      customBalance,
      gosiRatesData
    ));
    setTimeout(() => document.getElementById("lv-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function handleLvReset() { setLvSalary(""); setLvGosiBasic(""); setLvGosiHousing(""); setLvGosiTransport(""); setLvGosiOther(""); setLvYears(""); setLvUnusedDays(""); setLvPreDepartureDays(""); setLvIsSaudi(false); setLvGosiYear(2026); setLvLeaveMode("auto"); setLvCustomBalance(""); setLvResult(null); setLvErrors({}); setLvDeduction(""); setLvBonus(""); }

  // ── GOSI State ──
  const [gosiBasic, setGosiBasic] = useState("");
  const [gosiHousing, setGosiHousing] = useState("");
  const [gosiTransport, setGosiTransport] = useState("");
  const [gosiOther, setGosiOther] = useState("");
  const [gosiIsSaudi, setGosiIsSaudi] = useState(true);
  const [gosiYear, setGosiYear] = useState(2026);
  const [gosiResult, setGosiResult] = useState<GosiResult | null>(null);
  const [gosiErrors, setGosiErrors] = useState<Record<string, string>>({});

  function validateGosi(): boolean {
    const e: Record<string, string> = {};
    if (!gosiBasic || isNaN(Number(gosiBasic)) || Number(gosiBasic) <= 0)
      e.basic = t("يرجى إدخال الراتب الأساسي", "Please enter the basic salary");
    setGosiErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleGosiCalculate() {
    if (!validateGosi()) return;
    setGosiResult(calculateGOSI(
      Number(gosiBasic),
      Number(gosiHousing) || 0,
      Number(gosiTransport) || 0,
      Number(gosiOther) || 0,
      gosiIsSaudi,
      gosiYear,
      gosiRatesData
    ));
    setTimeout(() => document.getElementById("gosi-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function handleGosiReset() { setGosiBasic(""); setGosiHousing(""); setGosiTransport(""); setGosiOther(""); setGosiIsSaudi(true); setGosiYear(2026); setGosiResult(null); setGosiErrors({}); }

  // ── Compensatory Leave State ──
  const [compDays, setCompDays] = useState("");
  const [compHours, setCompHours] = useState("");
  interface CompResult {
    inputDays: number;
    inputHours: number;
    compDays: number;
    compHours: number;
    totalDays: number;
    totalHours: number;
    breakdown: { label: string; labelEn: string; value: string }[];
  }
  const [compResult, setCompResult] = useState<CompResult | null>(null);

  function handleCompCalculate() {
    const days = Number(compDays) || 0;
    const hours = Number(compHours) || 0;
    if (days <= 0 && hours <= 0) return;
    // أيام العمل × 1.5 = أيام الإجازة التعويضية
    const rawCompDays = days * 1.5;
    const compDaysInt = Math.floor(rawCompDays);
    const compDaysFrac = rawCompDays - compDaysInt; // 0 أو 0.5
    const compDaysHours = compDaysFrac > 0 ? Math.round(compDaysFrac * 8) : 0; // 0.5 يوم = 4 ساعات
    // ساعات العمل الإضافي × 1.5 = ساعات الإجازة التعويضية
    const rawCompHours = hours * 1.5;
    const compHoursInt = Math.floor(rawCompHours);
    const compHoursFrac = rawCompHours - compHoursInt; // 0 أو 0.5
    const compHoursMin = compHoursFrac > 0 ? 30 : 0; // 0.5 ساعة = 30 دقيقة
    // المجموع الكلي: تحويل ساعات الأيام إلى ساعات وجمعها مع ساعات العمل الإضافي
    const totalHoursAll = compDaysInt * 8 + compDaysHours + compHoursInt + (compHoursMin > 0 ? 0.5 : 0);
    const totalDaysFull = Math.floor(totalHoursAll / 8);
    const remHours = totalHoursAll - totalDaysFull * 8;
    const breakdown: { label: string; labelEn: string; value: string }[] = [];
    if (days > 0) {
      breakdown.push({
        label: `أيام العمل (${days}) × 1.5 = ${rawCompDays} يوم تعويضي`,
        labelEn: `Work days (${days}) × 1.5 = ${rawCompDays} compensatory days`,
        value: compDaysInt > 0 || compDaysHours > 0
          ? `${compDaysInt > 0 ? compDaysInt + ` يوم` : ""}${compDaysHours > 0 ? (compDaysInt > 0 ? " و" : "") + " " + compDaysHours + " ساعات" : ""}`.trim()
          : "0",
      });
    }
    if (hours > 0) {
      breakdown.push({
        label: `ساعات العمل الإضافي (${hours}) × 1.5 = ${rawCompHours} ساعة تعويضية`,
        labelEn: `Overtime hours (${hours}) × 1.5 = ${rawCompHours} compensatory hours`,
        value: `${compHoursInt}${compHoursMin > 0 ? ` ساعة و 30 دقيقة` : " ساعة"}`,
      });
    }
    setCompResult({
      inputDays: days,
      inputHours: hours,
      compDays: compDaysInt,
      compHours: compDaysHours,
      totalDays: totalDaysFull,
      totalHours: remHours,
      breakdown,
    });
    setTimeout(() => document.getElementById("comp-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function handleCompReset() { setCompDays(""); setCompHours(""); setCompResult(null); }

  // ── Tab config ──
  const tabs: { id: Tab; labelAr: string; labelEn: string; color: string; colorDim: string; colorBorder: string }[] = [
    { id: "eos", labelAr: "مكافأة نهاية الخدمة", labelEn: "End-of-Service", color: "var(--accent)", colorDim: "oklch(0.62 0.20 55 / 0.12)", colorBorder: "oklch(0.62 0.20 55 / 0.35)" },
    { id: "overtime", labelAr: "العمل الإضافي", labelEn: "Overtime", color: "var(--primary)", colorDim: "color-mix(in oklch, var(--primary) 12%, transparent)", colorBorder: "var(--border)" },
    { id: "leave", labelAr: "الإجازة السنوية", labelEn: "Annual Leave", color: "oklch(0.55 0.22 220)", colorDim: "oklch(0.55 0.22 220 / 0.12)", colorBorder: "oklch(0.55 0.22 220 / 0.35)" },
    { id: "gosi", labelAr: "التأمينات الاجتماعية", labelEn: "GOSI", color: "var(--success)", colorDim: "oklch(0.60 0.18 145 / 0.12)", colorBorder: "oklch(0.60 0.18 145 / 0.35)" },
    { id: "compensatory", labelAr: "الإجازة التعويضية", labelEn: "Compensatory Leave", color: "oklch(0.58 0.20 25)", colorDim: "oklch(0.58 0.20 25 / 0.12)", colorBorder: "oklch(0.58 0.20 25 / 0.35)" },
  ];

  const activeTabConfig = tabs.find((t) => t.id === activeTab)!;

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }}>
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-5 py-3"
        style={{ background: "var(--background)", borderBottom: `1px solid ${"var(--border)"}`, backdropFilter: "blur(12px)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: `1px solid ${"var(--border)"}`, color: "var(--primary)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            {dir === "rtl" ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
          </svg>
        </button>
        <div>
          <h1 className="font-black text-base leading-tight" style={{ fontFamily: lang === "ar" ? "'Noto Naskh Arabic', serif" : "'Cairo', sans-serif", color: "var(--primary)" }}>
            {t("حاسبة المستحقات", "Entitlements Calculator")}
          </h1>
          <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("وفق نظام العمل السعودي", "Per Saudi Labor Law")}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10">
        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-shrink-0 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all"
              style={{
                background: activeTab === tab.id ? tab.colorDim : ("var(--card)"),
                border: `1.5px solid ${activeTab === tab.id ? tab.colorBorder : "var(--border)"}`,
                color: activeTab === tab.id ? tab.color : "var(--muted-foreground)",
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              {lang === "ar" ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>

        {/* ── Legal Notice ── */}
        <div className="rounded-2xl px-4 py-3 mb-5 flex items-start gap-3" style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: `1px solid ${"var(--border)"}` }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: "var(--primary)" }}>
            {t("النتائج استرشادية وفق نظام العمل السعودي. يُنصح بمراجعة متخصص قانوني للحالات الخاصة.", "Results are indicative per Saudi Labor Law. Consult a legal specialist for special cases.")}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ════════════════════════════════════════
              TAB 1: End of Service
          ════════════════════════════════════════ */}
          {activeTab === "eos" && (
            <motion.div key="eos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
              {/* العمود الأيمن: الإدخالات */}
              <div>
              <div className="rounded-3xl p-5 mb-5" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
                {/* Salary */}
                <div className="mb-4">
                  <label style={labelStyle}>{t("الراتب الإجمالي قبل خصم التأمينات (ريال)", "Total Salary Before Insurance Deductions (SAR)")}</label>
                  <input type="number" min="0" placeholder={t("مثال: 8000", "e.g. 8000")} value={eosSalary} onChange={(e) => setEosSalary(e.target.value)} style={{ ...inputStyle, borderColor: eosErrors.salary ? "oklch(0.58 0.20 25)" : "var(--border)" }} />
                  {eosErrors.salary && <p className="text-[11px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{eosErrors.salary}</p>}
                </div>
                {/* Service Duration */}
                <div className="mb-4">
                  <label style={labelStyle}>{t("مدة الخدمة", "Service Duration")}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: t("سنوات", "Years"), val: eosYears, set: setEosYears, max: undefined },
                      { label: t("أشهر", "Months"), val: eosMonths, set: setEosMonths, max: 11 },
                      { label: t("أيام", "Days"), val: eosDays, set: setEosDays, max: 30 },
                    ].map((f) => (
                      <div key={f.label}>
                        <label style={{ ...labelStyle, fontSize: "0.72rem" }}>{f.label}</label>
                        <input type="number" min="0" max={f.max} placeholder="0" value={f.val} onChange={(e) => f.set(e.target.value)} style={{ ...inputStyle, borderColor: eosErrors.service ? "oklch(0.58 0.20 25)" : "var(--border)" }} />
                      </div>
                    ))}
                  </div>
                  {eosErrors.service && <p className="text-[11px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{eosErrors.service}</p>}
                </div>
                {/* Group */}
                <div className="mb-3">
                  <label style={labelStyle}>{t("المادة النظامية لإنهاء العقد", "Legal Article for Termination")}</label>
                  <select value={selectedGroup} onChange={(e) => { setSelectedGroup(e.target.value as TerminationGroup | ""); setSelectedReason(""); }} style={{ ...inputStyle, borderColor: eosErrors.reason ? "oklch(0.58 0.20 25)" : "var(--border)", cursor: "pointer" }}>
                    <option value="">{t("— اختر المادة —", "— Select Article —")}</option>
                    {groups.map((g) => <option key={g} value={g}>{lang === "ar" ? GROUP_LABELS[g].ar : GROUP_LABELS[g].en}</option>)}
                  </select>
                </div>
                {/* Reason */}
                <AnimatePresence>
                  {selectedGroup && optionsForGroup.length > 0 && (
                    <motion.div className="mb-4" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <label style={labelStyle}>{t("سبب الإنهاء", "Termination Reason")}</label>
                      <select value={selectedReason} onChange={(e) => setSelectedReason(e.target.value as TerminationReason)} style={{ ...inputStyle, borderColor: eosErrors.reason ? "oklch(0.58 0.20 25)" : "var(--border)", cursor: "pointer" }}>
                        <option value="">{t("— اختر السبب —", "— Select Reason —")}</option>
                        {optionsForGroup.map((opt) => <option key={opt.value} value={opt.value}>{lang === "ar" ? opt.labelAr : opt.labelEn}</option>)}
                      </select>
                      {eosErrors.reason && <p className="text-[11px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{eosErrors.reason}</p>}
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Adjustments: Deduction + Bonus */}
                <div className="mb-4 rounded-2xl p-4" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
                  <p className="text-xs font-bold mb-3" style={{ color: "var(--muted-foreground)" }}>⚙️ {t("تعديلات اختيارية على المكافأة", "Optional Adjustments to Gratuity")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Deduction */}
                    <div className="rounded-xl p-3" style={{ background: "oklch(0.58 0.20 25 / 0.12)", border: `1px solid ${"oklch(0.58 0.20 25)"}25` }}>
                      <label style={{ ...labelStyle, color: "oklch(0.58 0.20 25)" }}>➖ {t("خصم (ريال)", "Deduction (SAR)")}</label>
                      <input
                        type="number"
                        min="0"
                        placeholder={t("مثال: 500", "e.g. 500")}
                        value={eosDeduction}
                        onChange={(e) => setEosDeduction(e.target.value)}
                        style={{ ...inputStyle, borderColor: parseFloat(eosDeduction) > 0 ? "oklch(0.58 0.20 25)" : "var(--border)" }}
                      />
                      {parseFloat(eosDeduction) > 0 && (
                        <p className="text-[11px] mt-1 font-bold" style={{ color: "oklch(0.58 0.20 25)" }}>سيُخصم {parseFloat(eosDeduction).toLocaleString("ar-SA")} {t("ريال", "SAR")}</p>
                      )}
                    </div>
                    {/* Bonus */}
                    <div className="rounded-xl p-3" style={{ background: "oklch(0.60 0.18 145 / 0.12)", border: `1px solid ${"var(--success)"}25` }}>
                      <label style={{ ...labelStyle, color: "var(--success)" }}>➕ {t("مبلغ إضافي (ريال)", "Bonus (SAR)")}</label>
                      <input
                        type="number"
                        min="0"
                        placeholder={t("مثال: 300", "e.g. 300")}
                        value={eosBonus}
                        onChange={(e) => setEosBonus(e.target.value)}
                        style={{ ...inputStyle, borderColor: parseFloat(eosBonus) > 0 ? "var(--success)" : "var(--border)" }}
                      />
                      {parseFloat(eosBonus) > 0 && (
                        <p className="text-[11px] mt-1 font-bold" style={{ color: "var(--success)" }}>سيُضاف {parseFloat(eosBonus).toLocaleString("ar-SA")} {t("ريال", "SAR")}</p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Buttons */}
                <div className="flex gap-3 mt-2">
                  <motion.button onClick={handleEosCalculate} className="flex-1 py-3 rounded-2xl font-black text-sm" style={{ background: `linear-gradient(135deg, ${"var(--accent)"}, oklch(0.70 0.16 75))`, color: "oklch(0.10 0.02 55)", fontFamily: "'Cairo', sans-serif", boxShadow: `0 4px 20px ${"var(--accent)"}40` }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {t("احسب المكافأة", "Calculate Gratuity")}
                  </motion.button>
                  <motion.button onClick={handleEosReset} className="px-5 py-3 rounded-2xl font-bold text-sm" style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: `1px solid ${"var(--border)"}`, color: "var(--muted-foreground)", fontFamily: "'Cairo', sans-serif" }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {t("مسح", "Reset")}
                  </motion.button>
                </div>
              </div>{/* نهاية rounded-3xl - EOS inputs */}
              </div>{/* نهاية العمود الأيمن - EOS */}
              {/* العمود الأيسر: النتائج */}
              <div>
              {/* EOS Result */}
              <AnimatePresence>
                {eosResult !== null && (
                  <motion.div id="eos-result" className="rounded-3xl p-5 mb-8" style={{ background: "var(--card)", border: `2px solid ${eosResult.entitled ? "oklch(0.62 0.20 55 / 0.35)" : "oklch(0.58 0.20 25 / 0.35)"}` }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-xs font-bold" style={{ background: eosResult.entitled ? "oklch(0.62 0.20 55 / 0.12)" : "oklch(0.58 0.20 25 / 0.12)", border: `1px solid ${eosResult.entitled ? "oklch(0.62 0.20 55 / 0.35)" : "oklch(0.58 0.20 25 / 0.35)"}`, color: eosResult.entitled ? "var(--accent)" : "oklch(0.58 0.20 25)" }}>
                      {eosResult.entitled ? (
                        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>{t("يستحق مكافأة نهاية الخدمة", "Entitled to End-of-Service Gratuity")}</>
                      ) : (
                        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>{t("لا يستحق مكافأة نهاية الخدمة", "Not Entitled to End-of-Service Gratuity")}</>
                      )}
                    </div>
                    <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{lang === "ar" ? eosResult.explanation : eosResult.explanationEn}</p>
                    {eosResult.entitled && (
                      <>
                        {eosResult.breakdown.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-bold mb-2" style={{ color: "var(--muted-foreground)" }}>{t("تفاصيل الحساب الأساسي", "Base Calculation Breakdown")}</p>
                            <div className="flex flex-col gap-2">
                              {eosResult.breakdown.map((item, i) => (
                                <div key={i} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: "var(--secondary)" }}>
                                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{lang === "ar" ? item.label : item.labelEn}</span>
                                  <span className="text-sm font-black" style={{ color: "var(--accent)" }}>{item.value.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {eosResult.percentage < 100 && (
                          <div className="rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between" style={{ background: "oklch(0.62 0.20 55 / 0.10)", border: "1px solid oklch(0.62 0.20 55 / 0.3)" }}>
                            <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>{t("نسبة الاستحقاق المطبّقة", "Applied Entitlement Percentage")}</span>
                            <span className="text-lg font-black" style={{ color: "var(--accent)" }}>{eosResult.percentage}%</span>
                          </div>
                        )}
                        {/* Adjustments rows */}
                        {(parseFloat(eosDeduction) > 0 || parseFloat(eosBonus) > 0) && (
                          <div className="rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between" style={{ background: "oklch(0.62 0.20 55 / 0.12)", border: `1px solid ${"oklch(0.62 0.20 55 / 0.35)"}` }}>
                            <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>{t("المبلغ قبل التعديل", "Amount Before Adjustment")}</span>
                            <span className="text-sm font-black" style={{ color: "var(--accent)" }}>{eosResult.amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                          </div>
                        )}
                        {parseFloat(eosDeduction) > 0 && (
                          <div className="rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between" style={{ background: "oklch(0.58 0.20 25 / 0.12)", border: `1px solid ${"oklch(0.58 0.20 25)"}30` }}>
                            <span className="text-xs font-bold" style={{ color: "oklch(0.58 0.20 25)" }}>{t("خصم إضافي", "Additional Deduction")}</span>
                            <span className="text-sm font-black" style={{ color: "oklch(0.58 0.20 25)" }}>− {parseFloat(eosDeduction).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                          </div>
                        )}
                        {parseFloat(eosBonus) > 0 && (
                          <div className="rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between" style={{ background: "oklch(0.60 0.18 145 / 0.12)", border: `1px solid ${"var(--success)"}30` }}>
                            <span className="text-xs font-bold" style={{ color: "var(--success)" }}>{t("مبلغ إضافي", "Additional Bonus")}</span>
                            <span className="text-sm font-black" style={{ color: "var(--success)" }}>+ {parseFloat(eosBonus).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                          </div>
                        )}
                        <div className="rounded-2xl px-5 py-4 text-center" style={{ background: `linear-gradient(135deg, ${"oklch(0.62 0.20 55 / 0.12)"}, oklch(0.70 0.16 75 / 0.08))`, border: `2px solid ${"oklch(0.62 0.20 55 / 0.35)"}` }}>
                          <p className="text-xs font-bold mb-1" style={{ color: "var(--muted-foreground)" }}>
                            {(parseFloat(eosDeduction) > 0 || parseFloat(eosBonus) > 0) ? t("المبلغ النهائي بعد التعديلات", "Final Amount After Adjustments") : t("إجمالي مكافأة نهاية الخدمة", "Total End-of-Service Gratuity")}
                          </p>
                          <p className="text-4xl font-black" style={{ color: (eosResult.amount - (parseFloat(eosDeduction) || 0) + (parseFloat(eosBonus) || 0)) < 0 ? "oklch(0.58 0.20 25)" : "var(--accent)", fontFamily: "'Cairo', sans-serif" }}>
                            {(eosResult.amount - (parseFloat(eosDeduction) || 0) + (parseFloat(eosBonus) || 0)).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm font-bold mt-1" style={{ color: "var(--accent)", opacity: 0.7 }}>{t("ريال سعودي", "Saudi Riyals")}</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              </div>{/* نهاية العمود الأيسر - EOS */}
              </div>{/* نهاية lg:grid - EOS */}
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              TAB 2: Overtime
          ════════════════════════════════════════ */}
          {activeTab === "overtime" && (
            <motion.div key="overtime" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
              <div>
              <div className="rounded-3xl p-5 mb-5" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
                <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-2" style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: `1px solid ${"var(--border)"}` }}>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--primary)" }}>
                    {t("وفق المادة 107: الساعة الإضافية = ساعة كاملة على الإجمالي + نصف ساعة على الأساسي. الأجر الساعي = الراتب ÷ (30 × 8).", "Per Art. 107: Each overtime hour = 1 hour on gross + 0.5 hour on basic. Hourly rate = salary ÷ (30 × 8).")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label style={labelStyle}>{t("الراتب الإجمالي قبل خصم التأمينات (ريال)", "Gross Salary before deductions (SAR)")}</label>
                    <input type="number" min="0" placeholder={t("مثال: 10000", "e.g. 10000")} value={otGrossSalary} onChange={(e) => setOtGrossSalary(e.target.value)} style={{ ...inputStyle, borderColor: otErrors.grossSalary ? "oklch(0.58 0.20 25)" : "var(--border)" }} />
                    {otErrors.grossSalary && <p className="text-[11px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{otErrors.grossSalary}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("الراتب الأساسي (ريال)", "Basic Salary (SAR)")}</label>
                    <input type="number" min="0" placeholder={t("مثال: 7000", "e.g. 7000")} value={otBasicSalary} onChange={(e) => setOtBasicSalary(e.target.value)} style={{ ...inputStyle, borderColor: otErrors.basicSalary ? "oklch(0.58 0.20 25)" : "var(--border)" }} />
                    {otErrors.basicSalary && <p className="text-[11px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{otErrors.basicSalary}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label style={labelStyle}>{t("ساعات العمل العادية", "Normal Working Hours")}</label>
                    <input type="number" min="0" placeholder="0" value={otNormalHours} onChange={(e) => setOtNormalHours(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("ساعات العمل الإضافي", "Overtime Hours")}</label>
                    <input type="number" min="0" placeholder="0" value={otOvertimeHours} onChange={(e) => setOtOvertimeHours(e.target.value)} style={{ ...inputStyle, borderColor: otErrors.hours ? "oklch(0.58 0.20 25)" : "var(--border)" }} />
                    {otErrors.hours && <p className="text-[11px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{otErrors.hours}</p>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <motion.button onClick={handleOtCalculate} className="flex-1 py-3 rounded-2xl font-black text-sm" style={{ background: `linear-gradient(135deg, ${"var(--primary)"}, var(--primary))`, color: "white", fontFamily: "'Cairo', sans-serif", boxShadow: `0 4px 20px ${"var(--primary)"}40` }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {t("احسب الأجر", "Calculate Pay")}
                  </motion.button>
                  <motion.button onClick={handleOtReset} className="px-5 py-3 rounded-2xl font-bold text-sm" style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: `1px solid ${"var(--border)"}`, color: "var(--muted-foreground)", fontFamily: "'Cairo', sans-serif" }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {t("مسح", "Reset")}
                  </motion.button>
                </div>
              </div>{/* نهاية rounded-3xl - OT inputs */}
              </div>{/* نهاية عمود الإدخالات - OT */}
              <div>{/* عمود النتائج - OT */}
              <AnimatePresence>
                {otResult !== null && otResult.totalPay >= 0 && (
                  <motion.div id="ot-result" className="rounded-3xl p-5 mb-8" style={{ background: "var(--card)", border: `2px solid ${"var(--border)"}` }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <p className="text-xs font-bold mb-3" style={{ color: "var(--muted-foreground)" }}>{t("تفاصيل الحساب", "Calculation Breakdown")}</p>
                    <div className="flex flex-col gap-2 mb-4">
                      {otResult.breakdown.map((item, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: "var(--secondary)" }}>
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{lang === "ar" ? item.label : item.labelEn}</span>
                          <span className="text-sm font-black" style={{ color: "var(--primary)" }}>{item.value.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl px-5 py-4 text-center" style={{ background: `linear-gradient(135deg, ${"color-mix(in oklch, var(--primary) 12%, transparent)"}, color-mix(in oklch, var(--primary) 8%, transparent))`, border: `2px solid ${"var(--border)"}` }}>
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--muted-foreground)" }}>{t("إجمالي أجر الساعات الإضافية", "Total Overtime Pay")}</p>
                      <p className="text-4xl font-black" style={{ color: "var(--primary)", fontFamily: "'Cairo', sans-serif" }}>{otResult.totalPay.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-sm font-bold mt-1" style={{ color: "var(--primary)", opacity: 0.7 }}>{t("ريال سعودي", "Saudi Riyals")}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>{/* نهاية عمود النتائج - OT */}
              </div>{/* نهاية lg:grid - OT */}
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              TAB 3: Annual Leave
          ════════════════════════════════════════ */}
          {activeTab === "leave" && (
            <motion.div key="leave" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
              <div>
              <div className="rounded-3xl p-5 mb-5" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
                <div className="rounded-xl px-4 py-3 mb-4 flex items-start gap-2" style={{ background: "oklch(0.55 0.22 220 / 0.12)", border: `1px solid ${"oklch(0.55 0.22 220 / 0.35)"}` }}>
                  <p className="text-xs leading-relaxed" style={{ color: "oklch(0.55 0.22 220)" }}>
                    {t("وفق المادة 109 من نظام العمل: 21 يوم سنوياً للخدمة أقل من 5 سنوات، و30 يوماً للخدمة 5 سنوات فأكثر. الأجر اليومي = الراتب الشهري ÷ 30.", "Per Art. 109: 21 days/year for service < 5 years, 30 days/year for 5+ years. Daily wage = monthly salary ÷ 30.")}
                  </p>
                </div>
                <div className="mb-3">
                  <label style={labelStyle}>{t("الراتب الإجمالي (ريال)", "Gross Salary (SAR)")}</label>
                  <input type="number" min="0" placeholder={t("مثال: 8000", "e.g. 8000")} value={lvSalary} onChange={(e) => setLvSalary(e.target.value)} style={{ ...inputStyle, borderColor: lvErrors.salary ? "oklch(0.58 0.20 25)" : "var(--border)" }} />
                  {lvErrors.salary && <p className="text-[11px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{lvErrors.salary}</p>}
                </div>

                {/* ─── رصيد الإجازة السنوية ─── */}
                <div className="mb-4">
                  <label style={labelStyle}>{t("رصيد الإجازة السنوية", "Annual Leave Balance")}</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {([
                      { key: "auto", labelAr: "تلقائي", labelEn: "Auto", hint: t("حسب سنوات الخدمة", "By service years") },
                      { key: "21",   labelAr: "21 يوم", labelEn: "21 days", hint: t("خدمة < 5 سنوات", "Service < 5 yrs") },
                      { key: "30",   labelAr: "30 يوم", labelEn: "30 days", hint: t("خدمة ≥ 5 سنوات", "Service ≥ 5 yrs") },
                      { key: "custom", labelAr: "مخصص", labelEn: "Custom", hint: t("أي رقم", "Any number") },
                    ] as const).map(({ key, labelAr, labelEn, hint }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLvLeaveMode(key)}
                        className="py-2 px-1 rounded-xl text-center transition-all"
                        style={{
                          background: lvLeaveMode === key ? "oklch(0.55 0.22 220)" : "var(--secondary)",
                          border: `1.5px solid ${lvLeaveMode === key ? "oklch(0.55 0.22 220)" : "var(--border)"}`,
                          color: lvLeaveMode === key ? "white" : "var(--muted-foreground)",
                          fontFamily: "'Cairo', sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        <p className="text-xs font-black">{lang === "ar" ? labelAr : labelEn}</p>
                        <p className="text-[9px] mt-0.5" style={{ opacity: 0.75 }}>{hint}</p>
                      </button>
                    ))}
                  </div>
                  {lvLeaveMode === "auto" && (
                    <div className="rounded-xl px-3 py-2" style={{ background: "oklch(0.55 0.22 220 / 0.12)", border: `1px solid ${"oklch(0.55 0.22 220 / 0.35)"}` }}>
                      <p className="text-[11px]" style={{ color: "oklch(0.55 0.22 220)" }}>
                        {t(
                          "ℹ️ سيتم تحديد الرصيد تلقائياً: 21 يوم إذا كانت سنوات الخدمة أقل من 5، و 30 يوماً إذا كانت 5 سنوات فأكثر (المادة 109 نظام العمل)",
                          "ℹ️ Balance auto-calculated: 21 days if service < 5 years, 30 days if 5+ years (Art. 109 Labor Law)"
                        )}
                      </p>
                    </div>
                  )}
                  {lvLeaveMode === "21" && (
                    <div className="rounded-xl px-3 py-2" style={{ background: "oklch(0.55 0.22 220 / 0.12)", border: `1px solid ${"oklch(0.55 0.22 220 / 0.35)"}` }}>
                      <p className="text-[11px]" style={{ color: "oklch(0.55 0.22 220)" }}>
                        {t("ℹ️ سيتم استخدام 21 يوماً كرصيد سنوي ثابت بغض النظر عن سنوات الخدمة", "ℹ️ Fixed 21 days annual balance regardless of service years")}
                      </p>
                    </div>
                  )}
                  {lvLeaveMode === "30" && (
                    <div className="rounded-xl px-3 py-2" style={{ background: "oklch(0.55 0.22 220 / 0.12)", border: `1px solid ${"oklch(0.55 0.22 220 / 0.35)"}` }}>
                      <p className="text-[11px]" style={{ color: "oklch(0.55 0.22 220)" }}>
                        {t("ℹ️ سيتم استخدام 30 يوماً كرصيد سنوي ثابت بغض النظر عن سنوات الخدمة", "ℹ️ Fixed 30 days annual balance regardless of service years")}
                      </p>
                    </div>
                  )}
                  {lvLeaveMode === "custom" && (
                    <div>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        placeholder={t("مثال: 25 يوم", "e.g. 25 days")}
                        value={lvCustomBalance}
                        onChange={(e) => setLvCustomBalance(e.target.value)}
                        style={{ ...inputStyle, borderColor: "oklch(0.55 0.22 220)" }}
                      />
                      <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                        {t("أدخل عدد أيام الإجازة السنوية المحددة في عقد العمل (مثل: 25 أو 28 أو أي رقم آخر)", "Enter the annual leave days specified in the employment contract (e.g. 25, 28, or any number)")}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mb-4 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: lvIsSaudi ? "oklch(0.55 0.22 220 / 0.12)" : "var(--secondary)", border: `1px solid ${lvIsSaudi ? "oklch(0.55 0.22 220 / 0.35)" : "var(--border)"}`, cursor: "pointer" }} onClick={() => setLvIsSaudi(!lvIsSaudi)}>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: lvIsSaudi ? "oklch(0.55 0.22 220)" : "transparent", border: `2px solid ${lvIsSaudi ? "oklch(0.55 0.22 220)" : "var(--border)"}` }}>
                    {lvIsSaudi && <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: lvIsSaudi ? "oklch(0.55 0.22 220)" : "var(--muted-foreground)" }}>{t("العامل سعودي — تطبيق خصم التأمينات", "Saudi Employee — Apply GOSI deduction")}</p>
                    <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("يخصم نسبة الموظف من الأجر الخاضع للاشتراك بنسبة أيام الإجازة", "Deducts employee GOSI rate from eligible wage prorated for leave days")}</p>
                  </div>
                </div>
                {lvIsSaudi && (
                  <>
                    <div className="rounded-xl px-4 py-2.5 mb-3" style={{ background: "oklch(0.55 0.22 220 / 0.12)", border: `1px solid ${"oklch(0.55 0.22 220 / 0.35)"}` }}>
                      <p className="text-xs font-bold" style={{ color: "oklch(0.55 0.22 220)" }}>{t("الأجر الخاضع للاشتراك (مكونات GOSI)", "Eligible Wage for GOSI (components)")}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{t("اختياري — لحساب خصم التأمينات من بدل الإجازة", "Optional — to calculate GOSI deduction from leave pay")}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label style={labelStyle}>{t("الراتب الأساسي (ريال)", "Basic Salary (SAR)")}</label>
                        <input type="number" min="0" placeholder={t("مثال: 5000", "e.g. 5000")} value={lvGosiBasic} onChange={(e) => setLvGosiBasic(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>{t("بدل السكن (ريال)", "Housing Allowance (SAR)")}</label>
                        <input type="number" min="0" placeholder="0" value={lvGosiHousing} onChange={(e) => setLvGosiHousing(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>{t("بدل النقل (ريال)", "Transport Allowance (SAR)")}</label>
                        <input type="number" min="0" placeholder="0" value={lvGosiTransport} onChange={(e) => setLvGosiTransport(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>{t("بدلات ثابتة أخرى (ريال)", "Other Fixed Allowances (SAR)")}</label>
                        <input type="number" min="0" placeholder="0" value={lvGosiOther} onChange={(e) => setLvGosiOther(e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label style={labelStyle}>{t("سنة الاشتراك", "Subscription Year")}</label>
                      <select value={lvGosiYear} onChange={(e) => setLvGosiYear(Number(e.target.value))} style={{ ...inputStyle, cursor: "pointer" }}>
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                          <option key={y} value={y}>{y} — {t(`موظف ${(gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).employee + (gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).saned}% + صاحب عمل ${(gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).employer + (gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).saned}%`, `Employee ${(gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).employee + (gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).saned}% + Employer ${(gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).employer + (gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).saned}%`)}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label style={labelStyle}>{t("سنوات الخدمة", "Years of Service")}</label>
                    <input type="number" min="0" placeholder="0" value={lvYears} onChange={(e) => setLvYears(e.target.value)} style={{ ...inputStyle, borderColor: lvErrors.years ? "oklch(0.58 0.20 25)" : "var(--border)" }} />
                    {lvErrors.years && <p className="text-[11px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{lvErrors.years}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("رصيد الإجازة غير المستخدمة (يوم)", "Unused Leave Balance (days)")}</label>
                    <input type="number" min="0" placeholder="0" value={lvUnusedDays} onChange={(e) => setLvUnusedDays(e.target.value)} style={{ ...inputStyle, borderColor: lvErrors.days ? "oklch(0.58 0.20 25)" : "var(--border)" }} />
                    {lvErrors.days && <p className="text-[11px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{lvErrors.days}</p>}
                  </div>
                </div>
                <div className="mb-4">
                  <label style={labelStyle}>{t("أيام العمل قبل المغادرة (اختياري)", "Days Worked Before Leaving (optional)")}</label>
                  <input type="number" min="0" placeholder="0" value={lvPreDepartureDays} onChange={(e) => setLvPreDepartureDays(e.target.value)} style={inputStyle} />
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>{t("أيام الشهر الجزئي التي عمل فيها العامل قبل مغادرته للإجازة", "Partial month days worked before going on leave")}</p>
                </div>
                {/* Adjustments: Deduction + Bonus */}
                <div className="mb-4 rounded-2xl p-4" style={{ background: "var(--secondary)", border: `1px solid ${"var(--border)"}` }}>
                  <p className="text-xs font-bold mb-3" style={{ color: "var(--muted-foreground)" }}>⚙️ {t("تعديلات اختيارية على بدل الإجازة", "Optional Adjustments to Leave Pay")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Deduction */}
                    <div className="rounded-xl p-3" style={{ background: "oklch(0.58 0.20 25 / 0.12)", border: `1px solid ${"oklch(0.58 0.20 25)"}25` }}>
                      <label style={{ ...labelStyle, color: "oklch(0.58 0.20 25)" }}>➖ {t("خصم (ريال)", "Deduction (SAR)")}</label>
                      <input
                        type="number"
                        min="0"
                        placeholder={t("مثال: 500", "e.g. 500")}
                        value={lvDeduction}
                        onChange={(e) => setLvDeduction(e.target.value)}
                        style={{ ...inputStyle, borderColor: parseFloat(lvDeduction) > 0 ? "oklch(0.58 0.20 25)" : "var(--border)" }}
                      />
                      {parseFloat(lvDeduction) > 0 && (
                        <p className="text-[11px] mt-1 font-bold" style={{ color: "oklch(0.58 0.20 25)" }}>سيُخصم {parseFloat(lvDeduction).toLocaleString("ar-SA")} {t("ريال", "SAR")}</p>
                      )}
                    </div>
                    {/* Bonus */}
                    <div className="rounded-xl p-3" style={{ background: "oklch(0.60 0.18 145 / 0.12)", border: `1px solid ${"var(--success)"}25` }}>
                      <label style={{ ...labelStyle, color: "var(--success)" }}>➕ {t("مبلغ إضافي (ريال)", "Bonus (SAR)")}</label>
                      <input
                        type="number"
                        min="0"
                        placeholder={t("مثال: 300", "e.g. 300")}
                        value={lvBonus}
                        onChange={(e) => setLvBonus(e.target.value)}
                        style={{ ...inputStyle, borderColor: parseFloat(lvBonus) > 0 ? "var(--success)" : "var(--border)" }}
                      />
                      {parseFloat(lvBonus) > 0 && (
                        <p className="text-[11px] mt-1 font-bold" style={{ color: "var(--success)" }}>سيُضاف {parseFloat(lvBonus).toLocaleString("ar-SA")} {t("ريال", "SAR")}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <motion.button onClick={handleLvCalculate} className="flex-1 py-3 rounded-2xl font-black text-sm" style={{ background: `linear-gradient(135deg, ${"oklch(0.55 0.22 220)"}, oklch(0.45 0.22 220))`, color: "white", fontFamily: "'Cairo', sans-serif", boxShadow: `0 4px 20px ${"oklch(0.55 0.22 220)"}40` }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {t("احسب تعويض الإجازة", "Calculate Leave Compensation")}
                  </motion.button>
                  <motion.button onClick={handleLvReset} className="px-5 py-3 rounded-2xl font-bold text-sm" style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", border: `1px solid ${"var(--border)"}`, color: "var(--muted-foreground)", fontFamily: "'Cairo', sans-serif" }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {t("مسح", "Reset")}
                  </motion.button>
                </div>
              </div>{/* نهاية rounded-3xl - Leave inputs */}
              </div>{/* نهاية عمود الإدخالات - Leave */}
              <div>{/* عمود النتائج - Leave */}
              <AnimatePresence>
                {lvResult !== null && (
                  <motion.div id="lv-result" className="rounded-3xl p-5 mb-8" style={{ background: "var(--card)", border: `2px solid ${"oklch(0.55 0.22 220 / 0.35)"}` }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <p className="text-xs font-bold mb-3" style={{ color: "var(--muted-foreground)" }}>{t("تفاصيل الحساب", "Calculation Breakdown")}</p>
                    <div className="flex flex-col gap-2 mb-4">
                      {lvResult.breakdown.map((item, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: item.isDeduction ? "oklch(0.95 0.03 20)" : "var(--secondary)", border: item.isDeduction ? "1px solid oklch(0.85 0.08 20)" : "none" }}>
                          <span className="text-xs" style={{ color: item.isDeduction ? "oklch(0.58 0.20 25)" : "var(--muted-foreground)" }}>{lang === "ar" ? item.label : item.labelEn}</span>
                          <span className="text-sm font-black" style={{ color: item.isDeduction ? "oklch(0.58 0.20 25)" : "oklch(0.55 0.22 220)" }}>
                            {i === 0 ? `${item.value} ${t("يوم", "days")}` : `${item.isDeduction ? "-" : "+"}${item.value.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t("ريال", "SAR")}`}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Adjustments rows */}
                    {(parseFloat(lvDeduction) > 0 || parseFloat(lvBonus) > 0) && (
                      <div className="flex items-center justify-between rounded-xl px-4 py-2.5 mb-3" style={{ background: "oklch(0.55 0.22 220 / 0.12)", border: `1px solid ${"oklch(0.55 0.22 220 / 0.35)"}` }}>
                        <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>{t("المبلغ قبل التعديل", "Amount Before Adjustment")}</span>
                        <span className="text-sm font-black" style={{ color: "oklch(0.55 0.22 220)" }}>{lvResult.netPay.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                      </div>
                    )}
                    {parseFloat(lvDeduction) > 0 && (
                      <div className="flex items-center justify-between rounded-xl px-4 py-2.5 mb-3" style={{ background: "oklch(0.58 0.20 25 / 0.12)", border: `1px solid ${"oklch(0.58 0.20 25)"}30` }}>
                        <span className="text-xs font-bold" style={{ color: "oklch(0.58 0.20 25)" }}>{t("خصم إضافي", "Additional Deduction")}</span>
                        <span className="text-sm font-black" style={{ color: "oklch(0.58 0.20 25)" }}>− {parseFloat(lvDeduction).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                      </div>
                    )}
                    {parseFloat(lvBonus) > 0 && (
                      <div className="flex items-center justify-between rounded-xl px-4 py-2.5 mb-3" style={{ background: "oklch(0.60 0.18 145 / 0.12)", border: `1px solid ${"var(--success)"}30` }}>
                        <span className="text-xs font-bold" style={{ color: "var(--success)" }}>{t("مبلغ إضافي", "Additional Bonus")}</span>
                        <span className="text-sm font-black" style={{ color: "var(--success)" }}>+ {parseFloat(lvBonus).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                      </div>
                    )}
                    <div className="rounded-2xl px-5 py-4 text-center" style={{ background: `linear-gradient(135deg, ${"oklch(0.55 0.22 220 / 0.12)"}, oklch(0.45 0.22 220 / 0.08))`, border: `2px solid ${"oklch(0.55 0.22 220 / 0.35)"}` }}>
                      {lvResult.gosiDeduction > 0 && (
                        <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.58 0.20 25)" }}>
                          {t(`خصم التأمينات: ${lvResult.gosiDeduction.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال`, `GOSI Deduction: ${lvResult.gosiDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`)}
                        </p>
                      )}
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--muted-foreground)" }}>
                        {(parseFloat(lvDeduction) > 0 || parseFloat(lvBonus) > 0) ? t("المبلغ النهائي بعد التعديلات", "Final Amount After Adjustments") : t("صافي بدل الإجازة بعد خصم التأمينات", "Net Leave Pay after GOSI Deduction")}
                      </p>
                      <p className="text-4xl font-black" style={{ color: (lvResult.netPay - (parseFloat(lvDeduction) || 0) + (parseFloat(lvBonus) || 0)) < 0 ? "oklch(0.58 0.20 25)" : "oklch(0.55 0.22 220)", fontFamily: "'Cairo', sans-serif" }}>
                        {(lvResult.netPay - (parseFloat(lvDeduction) || 0) + (parseFloat(lvBonus) || 0)).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm font-bold mt-1" style={{ color: "oklch(0.55 0.22 220)", opacity: 0.7 }}>{t("ريال سعودي", "Saudi Riyals")}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>{/* نهاية عمود النتائج - Leave */}
              </div>{/* نهاية lg:grid - Leave */}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            TAB 4 — GOSI
        ══════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {activeTab === "gosi" && (
            <motion.div key="gosi" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} className="px-5 pb-10">
              <div className="rounded-3xl p-5 mb-6" style={{ background: "var(--card)", border: `1px solid ${"oklch(0.60 0.18 145 / 0.35)"}` }}>
                <p className="text-xs leading-relaxed" style={{ color: "var(--success)" }}>
                  {t(
                    "وفق لوائح التأمينات الاجتماعية: الأجر الخاضع = الراتب الأساسي + بدل السكن + بدل النقل + البدلات الثابتة الأخرى. غير خاضع: العمل الإضافي، العمولات، الحوافز، بدل السفر، تعويضات المصاريف.",
                    "Per GOSI regulations: eligible wage = basic salary + housing + transport + other fixed allowances. Excluded: overtime, commissions, bonuses, travel allowances, expense reimbursements."
                  )}
                </p>
              </div>

              {/* Nationality toggle */}
              <div className="mb-4 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: gosiIsSaudi ? "oklch(0.60 0.18 145 / 0.12)" : "var(--secondary)", border: `1px solid ${gosiIsSaudi ? "oklch(0.60 0.18 145 / 0.35)" : "var(--border)"}`, cursor: "pointer" }} onClick={() => { setGosiIsSaudi(!gosiIsSaudi); setGosiResult(null); }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: gosiIsSaudi ? "var(--success)" : "transparent", border: `2px solid ${gosiIsSaudi ? "var(--success)" : "var(--border)"}` }}>
                  {gosiIsSaudi && <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: gosiIsSaudi ? "var(--success)" : "var(--muted-foreground)" }}>
                    {gosiIsSaudi ? t("عامل سعودي", "Saudi Employee") : t("عامل غير سعودي — 0% موظف + 2% صاحب عمل (مخاطر مهنية)", "Non-Saudi Employee — 0% employee + 2% employer (occupational hazard)")}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("اضغط لتغيير الجنسية", "Tap to toggle nationality")}</p>
                </div>
              </div>

              {/* Year selector (Saudi only) */}
              {gosiIsSaudi && (
                <div className="mb-5">
                  <label style={labelStyle}>{t("سنة الاشتراك", "Subscription Year")}</label>
                  <select value={gosiYear} onChange={(e) => { setGosiYear(Number(e.target.value)); setGosiResult(null); }} style={{ ...inputStyle, cursor: "pointer" }}>
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y} — {t(`موظف ${(gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).employee + (gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).saned}% + صاحب عمل ${(gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).employer + (gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).saned}%`, `Employee ${(gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).employee + (gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).saned}% + Employer ${(gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).employer + (gosiRatesData?.rates?.[y] ?? { employee: 0, employer: 0, saned: 0 }).saned}%`)}</option>
                    ))}                  </select>
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>{t("ساند 0.75% مضافة على كلا الطرفين", "SANED 0.75% added to both parties")}</p>
                </div>
              )}

              {/* Wage components */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label style={labelStyle}>{t("الراتب الأساسي (ريال)", "Basic Salary (SAR)")}</label>
                  <input type="number" min="0" placeholder={t("مثال: 5000", "e.g. 5000")} value={gosiBasic} onChange={(e) => setGosiBasic(e.target.value)} style={{ ...inputStyle, borderColor: gosiErrors.basic ? "oklch(0.58 0.20 25)" : "var(--border)" }} />
                  {gosiErrors.basic && <p className="text-[11px] mt-1" style={{ color: "oklch(0.58 0.20 25)" }}>{gosiErrors.basic}</p>}
                </div>
                <div>
                  <label style={labelStyle}>{t("بدل السكن (ريال)", "Housing Allowance (SAR)")}</label>
                  <input type="number" min="0" placeholder={t("مثال: 2000", "e.g. 2000")} value={gosiHousing} onChange={(e) => setGosiHousing(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t("بدل النقل (ريال)", "Transport Allowance (SAR)")}</label>
                  <input type="number" min="0" placeholder={t("مثال: 800", "e.g. 800")} value={gosiTransport} onChange={(e) => setGosiTransport(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t("بدلات ثابتة أخرى خاضعة (ريال)", "Other Fixed Eligible Allowances (SAR)")}</label>
                  <input type="number" min="0" placeholder="0" value={gosiOther} onChange={(e) => setGosiOther(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Non-eligible note */}
              <div className="rounded-2xl px-4 py-3 mb-5" style={{ background: "oklch(0.58 0.20 25 / 0.12)", border: `1px solid oklch(0.58 0.20 25 / 0.25)` }}>
                <p className="text-xs font-bold mb-1" style={{ color: "oklch(0.58 0.20 25)" }}>{t("غير خاضعة للاشتراك (لا تدخل في الأجر الخاضع)", "Not Subject to Contribution (excluded from eligible wage)")}</p>
                <p className="text-[10px] leading-relaxed" style={{ color: "oklch(0.58 0.20 25)", opacity: 0.85 }}>
                  {t("العمل الإضافي • العمولات والحوافز • بدل السفر • تعويضات المصاريف • المكافآت والمكافأة السنوية",
                    "Overtime • Commissions & bonuses • Travel allowance • Expense reimbursements • Annual bonuses")}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mb-6">
                <motion.button onClick={handleGosiCalculate} className="flex-1 py-3 rounded-2xl font-bold text-sm" style={{ background: "var(--success)", color: "white", fontFamily: "'Cairo', sans-serif" }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  {t("احسب التأمينات", "Calculate GOSI")}
                </motion.button>
                <motion.button onClick={handleGosiReset} className="px-5 py-3 rounded-2xl font-bold text-sm" style={{ background: "oklch(0.60 0.18 145 / 0.12)", border: `1px solid ${"var(--border)"}`, color: "var(--muted-foreground)", fontFamily: "'Cairo', sans-serif" }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  {t("مسح", "Reset")}
                </motion.button>
              </div>

              {/* Result */}
              <AnimatePresence>
                {gosiResult !== null && (
                  <motion.div id="gosi-result" className="rounded-3xl p-5 mb-8" style={{ background: "var(--card)", border: `2px solid ${"oklch(0.60 0.18 145 / 0.35)"}` }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <p className="text-xs font-bold mb-3" style={{ color: "var(--muted-foreground)" }}>{t("تفاصيل الأجر الخاضع والاشتراكات", "Eligible Wage & Contribution Breakdown")}</p>

                    {/* Wage components table */}
                    <div className="flex flex-col gap-2 mb-4">
                      {gosiResult.components.filter(c => c.amount > 0).map((comp, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: "var(--secondary)" }}>
                          <div>
                            <span className="text-xs font-bold" style={{ color: "var(--success)" }}>{lang === "ar" ? comp.name : comp.nameEn}</span>
                            <span className="text-[10px] ms-2" style={{ color: "var(--muted-foreground)" }}>{lang === "ar" ? comp.note : comp.noteEn}</span>
                          </div>
                          <span className="text-sm font-black" style={{ color: "var(--foreground)" }}>{comp.amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: "oklch(0.60 0.18 145 / 0.12)", border: `1px solid ${"oklch(0.60 0.18 145 / 0.35)"}` }}>
                        <span className="text-xs font-bold" style={{ color: "var(--success)" }}>{t("الراتب الخاضع للاشتراك في التأمينات الاجتماعية", "Eligible Wage for Social Insurance Contribution")}</span>
                        <span className="text-sm font-black" style={{ color: "var(--success)" }}>{gosiResult.eligibleWage.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                      </div>
                    </div>

                    {/* Contribution rates */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        {
                          label: t("نسبة الموظف × الراتب الخاضع للاشتراك", "Employee Rate × Eligible Wage"),
                          value: `${gosiResult.employeeRate + gosiResult.sanedRate}%`,
                          amount: gosiResult.employeeTotalShare,
                          color: "oklch(0.55 0.22 220)",
                          detail: gosiResult.sanedRate > 0
                            ? t(`تأمين ${gosiResult.employeeRate}% + ساند ${gosiResult.sanedRate}% × ${gosiResult.eligibleWage.toLocaleString("ar-SA")}`, `Insurance ${gosiResult.employeeRate}% + SANED ${gosiResult.sanedRate}% × ${gosiResult.eligibleWage.toLocaleString()}`)
                            : t(`${gosiResult.employeeRate}% × ${gosiResult.eligibleWage.toLocaleString("ar-SA")}`, `${gosiResult.employeeRate}% × ${gosiResult.eligibleWage.toLocaleString()}`),
                        },
                        {
                          label: t("نسبة صاحب العمل × الراتب الخاضع للاشتراك", "Employer Rate × Eligible Wage"),
                          value: `${gosiResult.employerRate + gosiResult.sanedRate}%`,
                          amount: gosiResult.employerTotalShare,
                          color: "var(--primary)",
                          detail: gosiResult.sanedRate > 0
                            ? t(`تأمين ${gosiResult.employerRate}% + ساند ${gosiResult.sanedRate}% × ${gosiResult.eligibleWage.toLocaleString("ar-SA")}`, `Insurance ${gosiResult.employerRate}% + SANED ${gosiResult.sanedRate}% × ${gosiResult.eligibleWage.toLocaleString()}`)
                            : t(`${gosiResult.employerRate}% × ${gosiResult.eligibleWage.toLocaleString("ar-SA")}`, `${gosiResult.employerRate}% × ${gosiResult.eligibleWage.toLocaleString()}`),
                        },
                      ].map((item, i) => (
                        <div key={i} className="rounded-2xl p-3 text-center" style={{ background: "var(--secondary)", border: `1px solid ${item.color}30` }}>
                          <p className="text-[10px] font-bold mb-1" style={{ color: "var(--muted-foreground)" }}>{item.label}</p>
                          <p className="text-lg font-black" style={{ color: item.color }}>{item.value}</p>
                          {item.detail && <p className="text-[9px] mt-0.5" style={{ color: "var(--accent)" }}>{item.detail}</p>}
                          <p className="text-[11px] font-bold mt-1" style={{ color: item.color }}>{item.amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t("ريال/شهر", "SAR/mo")}</p>
                        </div>
                      ))}
                    </div>
                    {gosiResult.sanedRate > 0 && (
                      <div className="rounded-xl px-4 py-2 mb-3 flex justify-between items-center" style={{ background: "oklch(0.62 0.20 55 / 0.12)", border: `1px solid ${"oklch(0.62 0.20 55 / 0.35)"}` }}>
                        <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>{t("ساند 0.75% على كل طرف", "SANED 0.75% on each party")}</span>
                        <span className="text-sm font-black" style={{ color: "var(--accent)" }}>{(gosiResult.employeeSanedShare + gosiResult.employerSanedShare).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                      </div>
                    )}
                    {gosiIsSaudi && gosiResult.ihtarMihani > 0 && (
                      <div className="rounded-xl px-4 py-2 mb-3 flex justify-between items-center" style={{ background: "oklch(0.65 0.18 200 / 0.1)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}>
                        <div>
                          <span className="text-xs font-bold" style={{ color: "var(--info-strong)" }}>{t("إخطار مهني 2% × الراتب الخاضع للاشتراك", "Professional Hazard 2% × Eligible Wage")}</span>
                          <p className="text-[9px] mt-0.5" style={{ color: "oklch(0.65 0.18 200 / 0.7)" }}>{t("على صاحب العمل للسعوديين فقط | 2% × " + gosiResult.eligibleWage.toLocaleString("ar-SA"), "Employer only for Saudis | 2% × " + gosiResult.eligibleWage.toLocaleString())}</p>
                        </div>
                        <span className="text-sm font-black" style={{ color: "var(--info-strong)" }}>{gosiResult.ihtarMihani.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                      </div>
                    )}

                    {/* Summary box */}
                    <div className="rounded-2xl px-5 py-4" style={{ background: `linear-gradient(135deg, ${"oklch(0.60 0.18 145 / 0.12)"}, oklch(0.60 0.18 145 / 0.05))`, border: `2px solid ${"oklch(0.60 0.18 145 / 0.35)"}` }}>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>{t("خصم التأمينات من راتب الموظف شهرياً", "Monthly GOSI Deduction from Employee Salary")}</span>
                          {gosiResult.sanedRate > 0 && (
                            <p className="text-[9px] mt-0.5" style={{ color: "var(--accent)" }}>
                              {t(`تأمين ${gosiResult.employeeShare.toFixed(2)} + ساند ${gosiResult.employeeSanedShare.toFixed(2)}`, `Insurance ${gosiResult.employeeShare.toFixed(2)} + SANED ${gosiResult.employeeSanedShare.toFixed(2)}`)}
                            </p>
                          )}
                        </div>
                        <span className="text-xl font-black" style={{ color: "oklch(0.55 0.22 220)" }}>{gosiResult.employeeTotalShare.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>{t("حصة صاحب العمل شهرياً (تأمينات + ساند)", "Monthly Employer Share (Insurance + SANED)")}</span>
                          {gosiResult.sanedRate > 0 && (
                            <p className="text-[9px] mt-0.5" style={{ color: "var(--accent)" }}>
                              {t(`تأمين ${gosiResult.employerShare.toFixed(2)} + ساند ${gosiResult.employerSanedShare.toFixed(2)}`, `Insurance ${gosiResult.employerShare.toFixed(2)} + SANED ${gosiResult.employerSanedShare.toFixed(2)}`)}
                            </p>
                          )}
                        </div>
                        <span className="text-xl font-black" style={{ color: "var(--primary)" }}>{gosiResult.employerTotalShare.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                      </div>
                      {gosiIsSaudi && gosiResult.ihtarMihani > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>{t("إخطار مهني 2% (على صاحب العمل)", "Professional Hazard 2% (Employer)")}</span>
                            <p className="text-[9px] mt-0.5" style={{ color: "var(--info-strong)" }}>{t(`2% × ${gosiResult.eligibleWage.toLocaleString("ar-SA")} ر.س`, `2% × ${gosiResult.eligibleWage.toLocaleString()} SAR`)}</p>
                          </div>
                          <span className="text-xl font-black" style={{ color: "oklch(0.55 0.18 200)" }}>{gosiResult.ihtarMihani.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                        </div>
                      )}
                      <div className="h-px mb-3" style={{ background: "oklch(0.60 0.18 145 / 0.35)" }} />
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm font-bold" style={{ color: "var(--success)" }}>{t("إجمالي الاشتراك الشهري (موظف + صاحب عمل)", "Total Monthly Contribution (Employee + Employer)")}</span>
                          {gosiIsSaudi && gosiResult.ihtarMihani > 0 && (
                            <p className="text-[9px] mt-0.5" style={{ color: "var(--info-strong)" }}>{t("لا يشمل الإخطار المهني", "Excludes Professional Hazard")}</p>
                          )}
                        </div>
                        <span className="text-3xl font-black" style={{ color: "var(--success)", fontFamily: "'Cairo', sans-serif" }}>{gosiResult.totalContribution.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ريال", "SAR")}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            TAB 5 — COMPENSATORY LEAVE
        ══════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {activeTab === "compensatory" && (
            <motion.div key="compensatory" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="px-5 pb-10">
              {/* ─ بطاقة التعريف ─ */}
              <div className="rounded-3xl p-5 mb-6" style={{ background: "oklch(0.58 0.20 25 / 0.08)", border: "1px solid oklch(0.58 0.20 25 / 0.30)" }}>
                <p className="text-xs leading-relaxed" style={{ color: "oklch(0.58 0.20 25)" }}>
                  {t(
                    "وفق المادة 107 من نظام العمل السعودي: إذا طلب صاحب العمل من العامل العمل في أيام العطل أو ساعات إضافية، يستحق العامل إجازة تعويضية بمعدل يوم ونصف عن كل يوم عمل، وساعة ونصف عن كل ساعة عمل إضافي.",
                    "Per Article 107 of Saudi Labor Law: If the employer requires the employee to work on holidays or overtime, the employee is entitled to compensatory leave at a rate of 1.5 days per work day, and 1.5 hours per overtime hour."
                  )}
                </p>
              </div>

              {/* ─ نموذج الإدخال ─ */}
              <div className="rounded-3xl p-5 mb-5" style={{ background: "oklch(0.58 0.20 25 / 0.06)", border: "1px solid oklch(0.58 0.20 25 / 0.25)" }}>
                <h3 className="text-sm font-bold mb-4" style={{ color: "oklch(0.58 0.20 25)" }}>
                  {t("بيانات العمل", "Work Details")}
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label style={labelStyle}>{t("عدد أيام العمل (في العطل)", "Work Days (on holidays)")}</label>
                    <input
                      type="number" min="0" step="0.5"
                      value={compDays}
                      onChange={e => setCompDays(e.target.value)}
                      placeholder={t("مثال: 3", "e.g. 3")}
                      style={inputStyle}
                    />
                    <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>{t("كل يوم عمل يستحق 1.5 يوم تعويضي", "Each work day earns 1.5 compensatory days")}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>{t("ساعات العمل الإضافي", "Overtime Hours")}</label>
                    <input
                      type="number" min="0" step="0.5"
                      value={compHours}
                      onChange={e => setCompHours(e.target.value)}
                      placeholder={t("مثال: 4", "e.g. 4")}
                      style={inputStyle}
                    />
                    <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>{t("كل ساعة عمل إضافي تستحق 1.5 ساعة تعويضية", "Each overtime hour earns 1.5 compensatory hours")}</p>
                  </div>
                </div>

                {/* أمثلة سريعة */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { d: "1", h: "0", label: t("1 يوم", "1 day") },
                    { d: "3", h: "0", label: t("3 أيام", "3 days") },
                    { d: "0", h: "4", label: t("4 ساعات", "4 hours") },
                    { d: "5", h: "0", label: t("5 أيام", "5 days") },
                    { d: "0", h: "8", label: t("8 ساعات", "8 hours") },
                    { d: "2", h: "4", label: t("2 يوم + 4 ساعات", "2d + 4h") },
                  ].map(ex => (
                    <button
                      key={ex.label}
                      onClick={() => { setCompDays(ex.d); setCompHours(ex.h); }}
                      className="py-1.5 px-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: "oklch(0.58 0.20 25 / 0.10)", border: "1px solid oklch(0.58 0.20 25 / 0.30)", color: "oklch(0.58 0.20 25)" }}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCompCalculate}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm"
                    style={{ background: "oklch(0.58 0.20 25)", color: "white", boxShadow: "0 4px 16px oklch(0.58 0.20 25 / 0.35)" }}
                  >
                    {t("احسب الإجازة التعويضية", "Calculate Compensatory Leave")}
                  </button>
                  <button
                    onClick={handleCompReset}
                    className="px-5 py-3 rounded-2xl font-bold text-sm"
                    style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, color: "var(--muted-foreground)" }}
                  >
                    {t("مسح", "Reset")}
                  </button>
                </div>
              </div>

              {/* ─ النتائج ─ */}
              <AnimatePresence>
                {compResult && (
                  <motion.div
                    id="comp-result"
                    key="comp-result"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* بطاقة النتيجة الرئيسية */}
                    <div className="rounded-3xl p-6 mb-4" style={{ background: "oklch(0.58 0.20 25 / 0.10)", border: "2px solid oklch(0.58 0.20 25 / 0.40)" }}>
                      <p className="text-xs font-bold mb-3" style={{ color: "var(--muted-foreground)" }}>{t("الإجازة التعويضية المستحقة", "Compensatory Leave Entitlement")}</p>

                      {/* بطاقات التفاصيل */}
                      <div className="grid gap-3 mb-4">
                        {compResult.inputDays > 0 && (
                          <div className="rounded-2xl p-4" style={{ background: "oklch(0.58 0.20 25 / 0.08)", border: "1px solid oklch(0.58 0.20 25 / 0.20)" }}>
                            <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{t("عن أيام العمل (عطل)", "For Holiday Work Days")}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                {compResult.inputDays} {t("يوم", "day")} × 1.5
                              </span>
                              <span className="text-xl font-black" style={{ color: "oklch(0.58 0.20 25)" }}>
                                {compResult.inputDays * 1.5 % 1 === 0
                                  ? `${compResult.inputDays * 1.5} ${t("يوم", "days")}`
                                  : `${Math.floor(compResult.inputDays * 1.5)} ${t("يوم", "days")} ${t("و", "and")} ${Math.round((compResult.inputDays * 1.5 % 1) * 8)} ${t("ساعات", "hours")}`
                                }
                              </span>
                            </div>
                          </div>
                        )}
                        {compResult.inputHours > 0 && (
                          <div className="rounded-2xl p-4" style={{ background: "oklch(0.58 0.20 25 / 0.08)", border: "1px solid oklch(0.58 0.20 25 / 0.20)" }}>
                            <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{t("عن ساعات العمل الإضافي", "For Overtime Hours")}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                {compResult.inputHours} {t("ساعة", "hr")} × 1.5
                              </span>
                              <span className="text-xl font-black" style={{ color: "oklch(0.58 0.20 25)" }}>
                                {compResult.inputHours * 1.5 % 1 === 0
                                  ? `${compResult.inputHours * 1.5} ${t("ساعة", "hours")}`
                                  : `${Math.floor(compResult.inputHours * 1.5)} ${t("ساعة", "hours")} ${t("و", "and")} 30 ${t("دقيقة", "min")}`
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* المجموع الكلي */}
                      {compResult.inputDays > 0 && compResult.inputHours > 0 && (
                        <div className="rounded-2xl p-4 mt-2" style={{ background: "oklch(0.58 0.20 25 / 0.15)", border: "1.5px solid oklch(0.58 0.20 25 / 0.50)" }}>
                          <p className="text-xs font-bold mb-2" style={{ color: "var(--muted-foreground)" }}>{t("إجمالي الإجازة التعويضية", "Total Compensatory Leave")}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{t("أيام + ساعات مجتمعة", "Combined days & hours")}</span>
                            <span className="text-2xl font-black" style={{ color: "oklch(0.58 0.20 25)", fontFamily: "'Cairo', sans-serif" }}>
                              {compResult.totalDays > 0 ? `${compResult.totalDays} ${t("يوم", "days")}` : ""}
                              {compResult.totalDays > 0 && compResult.totalHours > 0 ? ` ${t("و", "and")} ` : ""}
                              {compResult.totalHours > 0 ? `${compResult.totalHours % 1 === 0 ? compResult.totalHours : compResult.totalHours.toFixed(1)} ${t("ساعة", "hours")}` : ""}
                              {compResult.totalDays === 0 && compResult.totalHours === 0 ? "0" : ""}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* تفاصيل الحساب */}
                    <div className="rounded-3xl p-5" style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}` }}>
                      <h4 className="text-sm font-bold mb-3" style={{ color: "var(--muted-foreground)" }}>{t("تفاصيل الحساب", "Calculation Breakdown")}</h4>
                      <div className="space-y-2">
                        {compResult.breakdown.map((row, i) => (
                          <div key={i} className="flex justify-between items-center py-2 px-3 rounded-xl" style={{ background: "var(--secondary)" }}>
                            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{lang === "ar" ? row.label : row.labelEn}</span>
                            <span className="text-sm font-bold" style={{ color: "oklch(0.58 0.20 25)" }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 rounded-xl" style={{ background: "oklch(0.58 0.20 25 / 0.08)", border: "1px solid oklch(0.58 0.20 25 / 0.25)" }}>
                        <p className="text-[10px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                          {t(
                            "ℹ️ المعدل المستخدم: كل يوم عمل = 1.5 يوم تعويضي، وكل ساعة عمل إضافي = 1.5 ساعة تعويضية. يوم العمل = 8 ساعات.",
                            "ℹ️ Rate used: 1 work day = 1.5 compensatory days, 1 overtime hour = 1.5 compensatory hours. Work day = 8 hours."
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
