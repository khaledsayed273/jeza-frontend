import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

export type PublicUser = {
  id: number;
  email: string;
  name: string | null;
  role: "user" | "admin";
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").trim().replace(/\/+$/, "");

const API_PREFIX = "/api/v1";

/** Function الوحيدة لبناء روابط الـ API من الـ base الموجود في .env */
export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.replace(/^\/+/, "");
  if (!API_BASE_URL) return `${API_PREFIX}/${clean}`;
  return `${API_BASE_URL}${API_PREFIX}/${clean}`;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(buildApiUrl("auth/refresh"), { method: "POST", credentials: "include" });
      return res.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
    }
  })();
  return refreshPromise;
}

async function request<T = any>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const { method, body, headers } = options;
  const url = buildApiUrl(path);
  const doFetch = () =>
    fetch(url, {
      method: method ?? (body !== undefined ? "POST" : "GET"),
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(headers ?? {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

  let res = await doFetch();

  if (res.status === 401 && !path.replace(/^\/+/, "").startsWith("auth/")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let message = res.statusText || "Request failed";
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {
      // ignore json parse errors
    }
    throw new ApiError(res.status, message);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

type QueryHook<Input, Output> = (
  input?: Input,
  options?: Omit<UseQueryOptions<Output, ApiError>, 'queryKey' | 'queryFn'>,
) => UseQueryResult<Output, ApiError>;

type MutationHook<Input, Output> = (
  options?: UseMutationOptions<Output, ApiError, Input>,
) => ReturnType<typeof useMutation<Output, ApiError, Input>>;

function makeQuery<Input, Output>(key: string, fn: (input: Input) => Promise<Output>): QueryHook<Input, Output> {
  return (input?: Input, options?: Omit<UseQueryOptions<Output, ApiError>, 'queryKey' | 'queryFn'>) =>
    useQuery<Output, ApiError>({
      queryKey: [key, input ?? null],
      queryFn: () => fn(input as Input),
      ...options,
    });
}

function makeMutation<Input, Output>(fn: (input: Input) => Promise<Output>): MutationHook<Input, Output> {
  return (options?: UseMutationOptions<Output, ApiError, Input>) =>
    useMutation<Output, ApiError, Input>({
      mutationFn: fn,
      ...options,
    });
}

// ── Auth ─────────────────────────────────────────────────────────────────────
const authMe = () => request<PublicUser | null>("auth/me");
const authLogin = (input: { email: string; password: string }) =>
  request<{ user: PublicUser }>("auth/login", { method: "POST", body: input });
const authRegister = (input: { email: string; password: string; name: string }) =>
  request<{ user: PublicUser }>("auth/register", { method: "POST", body: input });
const authLogout = () => request<{ success: boolean }>("auth/logout", { method: "POST" });
const authUpdateProfile = (input: { name?: string; email?: string }) =>
  request<{ success: boolean }>("auth/profile", { method: "PATCH", body: input });
const authChangePassword = (input: { currentPassword: string; newPassword: string }) =>
  request<{ success: boolean }>("auth/change-password", { method: "POST", body: input });
const authSessions = () => request<unknown[]>("auth/sessions");
const authRevokeOtherSessions = () =>
  request<{ success: boolean }>("auth/revoke-other-sessions", { method: "POST" });
const authForgotPassword = (input: { email: string }) =>
  request<{ success: boolean }>("auth/forgot-password", { method: "POST", body: input });
const authResetPassword = (input: { token: string; password: string }) =>
  request<{ success: boolean }>("auth/reset-password", { method: "POST", body: input });

// ── HR Explainers ──────────────────────────────────────────────────────────
const hrExplainersGetAll = () => request("content/hr-explainers");
// ── Updates ────────────────────────────────────────────────────────────────
const updatesGetAll = () => request("content/updates");
// ── Templates ──────────────────────────────────────────────────────────────
const templatesGetAll = () => request("content/templates");
// ── Policies ───────────────────────────────────────────────────────────────
const policiesGetAll = () => request("content/policies");
// ── Declarations ───────────────────────────────────────────────────────────
const declarationsGetAll = () => request("content/declarations");
// ── Job Descriptions ──────────────────────────────────────────────────────
const jobDescriptionsGetAll = () => request("content/job-descriptions");
// ── Quiz ──────────────────────────────────────────────────────────────────
const quizGetAll = () => request("content/quiz");
// ── HC Indicators ─────────────────────────────────────────────────────────
const hcIndicatorsGetAll = () => request("content/hc-indicators");
// ── Config ────────────────────────────────────────────────────────────────
const configGetAll = () => request<Record<string, string>>("config");
// ── Calculator ────────────────────────────────────────────────────────────
const calculatorGetAll = () => request("calculator");
// ── About ─────────────────────────────────────────────────────────────────
const aboutGetAll = () => request("site/about");
// ── Resources ─────────────────────────────────────────────────────────────
const resourcesGetAll = () => request("site/resources");
// ── FAQ ───────────────────────────────────────────────────────────────────
const faqGetAll = () => request("site/faq");
// ── Home ──────────────────────────────────────────────────────────────────
const homeGetAll = () => request("site/home");
// ── HR Cost ───────────────────────────────────────────────────────────────
const hrCostGetAll = () => request("hr-cost");
// ── Leave ─────────────────────────────────────────────────────────────────
const leaveGetAll = () => request("leave");
// ── Turnover ──────────────────────────────────────────────────────────────
const turnoverGetAll = () => request("turnover");
// ── Employee Market ───────────────────────────────────────────────────────
const employeeMarketGetAll = () => request("employee-market");
// ── Training ──────────────────────────────────────────────────────────────────
const trainingGetAll = () =>
  request<{
    decisions: Array<{ num: string; ar: string; en: string }>;
    sectors: Array<{ ar: string; en: string }>;
    disclosurePoints: Array<{ num: string; titleAr: string; titleEn: string; textAr: string; textEn: string }>;
  }>("training");

// ── Letters ──────────────────────────────────────────────────────────────────
const lettersGenerate = (input: {
  companyName: string;
  crNumber: string;
  recipientType: "قطاع_خاص" | "بنك" | "جهة_حكومية";
  recipientName: string;
  letterIdea: string;
}) => request<{ letter: string }>("letters/generate", { method: "POST", body: input });

// ── Contact ──────────────────────────────────────────────────────────────────
const contactSubmitRequest = (input: unknown) =>
  request<{ success: boolean }>("contact/submit", { method: "POST", body: input });

// ── HC-KPI ───────────────────────────────────────────────────────────────────
type SessionInput = { sessionToken?: string };
function hcKpiHeaders(input?: SessionInput) {
  return input?.sessionToken ? { "x-session-token": input.sessionToken } : undefined;
}

const hcKpiListOrganizations = (input?: SessionInput) =>
  request("hc-kpi/organizations", { headers: hcKpiHeaders(input) });
const hcKpiCreateOrganization = (input: SessionInput & { nameAr: string; nameEn?: string; industry?: string; size?: string }) =>
  request("hc-kpi/organizations", { method: "POST", body: input, headers: hcKpiHeaders(input) });
const hcKpiUpdateOrganization = (input: SessionInput & { id: number; nameAr: string; nameEn?: string; industry?: string; size?: string }) =>
  request(`hc-kpi/organizations/${input.id}`, { method: "PATCH", body: input, headers: hcKpiHeaders(input) });
const hcKpiDeleteOrganization = (input: SessionInput & { id: number }) =>
  request(`hc-kpi/organizations/${input.id}`, { method: "DELETE", headers: hcKpiHeaders(input) });
const hcKpiListReports = (input: SessionInput & { organizationId: number }) =>
  request(`hc-kpi/organizations/${input.organizationId}/reports`, { headers: hcKpiHeaders(input) });
const hcKpiGetReport = (input: SessionInput & { reportId: number }) =>
  request(`hc-kpi/reports/${input.reportId}`, { headers: hcKpiHeaders(input) });
const hcKpiCreateReport = (input: SessionInput & Record<string, unknown>) =>
  request("hc-kpi/reports", { method: "POST", body: input, headers: hcKpiHeaders(input) });
const hcKpiUpdateReportStatus = (input: SessionInput & { reportId: number; status: string }) =>
  request(`hc-kpi/reports/${input.reportId}/status`, { method: "PATCH", body: { status: input.status }, headers: hcKpiHeaders(input) });
const hcKpiDeleteReport = (input: SessionInput & { reportId: number }) =>
  request(`hc-kpi/reports/${input.reportId}`, { method: "DELETE", headers: hcKpiHeaders(input) });
const hcKpiUpdateEntry = (input: { entryId: number } & Record<string, unknown>) =>
  request(`hc-kpi/entries/${input.entryId}`, { method: "PATCH", body: input });
const hcKpiAddCustomIndicator = (input: { reportId: number } & Record<string, unknown>) =>
  request(`hc-kpi/reports/${input.reportId}/indicators`, { method: "POST", body: input });
const hcKpiDeleteEntry = (input: { entryId: number }) =>
  request(`hc-kpi/entries/${input.entryId}`, { method: "DELETE" });

// ── Subscriptions ────────────────────────────────────────────────────────────
const subsListPlans = () => request("subscriptions/plans");
const subsMySubscription = () => request("subscriptions/me");
const subsListAllSubscriptions = () => request("subscriptions");
const subsCreateSubscription = (input: unknown) =>
  request("subscriptions", { method: "POST", body: input });

// ── Tickets ──────────────────────────────────────────────────────────────────
const ticketsMyTickets = () => request("tickets");
const ticketsListAll = () => request("tickets/all");
const ticketsGetTicket = (input: { ticketId: number }) =>
  request(`tickets/${input.ticketId}`);
const ticketsCreate = (input: unknown) => request("tickets", { method: "POST", body: input });
const ticketsAddMessage = (input: { ticketId: number; message: string }) =>
  request(`tickets/${input.ticketId}/messages`, { method: "POST", body: { message: input.message } });
const ticketsAdminAddMessage = (input: { ticketId: number; message: string }) =>
  request(`tickets/${input.ticketId}/admin-messages`, { method: "POST", body: { message: input.message } });
const ticketsUpdateStatus = (input: { ticketId: number; status: string }) =>
  request(`tickets/${input.ticketId}/status`, { method: "PATCH", body: { status: input.status } });

export const api = {
  auth: {
    me: { useQuery: makeQuery("auth.me", authMe) },
    login: { useMutation: makeMutation(authLogin) },
    register: { useMutation: makeMutation(authRegister) },
    logout: { useMutation: makeMutation(authLogout) },
    updateProfile: { useMutation: makeMutation(authUpdateProfile) },
    changePassword: { useMutation: makeMutation(authChangePassword) },
    sessions: { useQuery: makeQuery("auth.sessions", authSessions) },
    revokeOtherSessions: { useMutation: makeMutation(authRevokeOtherSessions) },
    forgotPassword: { useMutation: makeMutation(authForgotPassword) },
    resetPassword: { useMutation: makeMutation(authResetPassword) },
  },
  hrExplainers: {
    getAll: { useQuery: makeQuery("hrExplainers.all", hrExplainersGetAll) },
  },
  updates: {
    getAll: { useQuery: makeQuery("updates.all", updatesGetAll) },
  },
  templates: {
    getAll: { useQuery: makeQuery("templates.all", templatesGetAll) },
  },
  policies: {
    getAll: { useQuery: makeQuery("policies.all", policiesGetAll) },
  },
  declarations: {
    getAll: { useQuery: makeQuery("declarations.all", declarationsGetAll) },
  },
  jobDescriptions: {
    getAll: { useQuery: makeQuery("jobDescriptions.all", jobDescriptionsGetAll) },
  },
  quiz: {
    getAll: { useQuery: makeQuery("quiz.all", quizGetAll) },
  },
  hcIndicators: {
    getAll: { useQuery: makeQuery("hcIndicators.all", hcIndicatorsGetAll) },
  },
  config: {
    getAll: { useQuery: makeQuery("config.all", configGetAll) },
  },
  calculator: {
    getAll: { useQuery: makeQuery("calculator.all", calculatorGetAll) },
  },
  about: {
    getAll: { useQuery: makeQuery("about.all", aboutGetAll) },
  },
  resources: {
    getAll: { useQuery: makeQuery("resources.all", resourcesGetAll) },
  },
  faq: {
    getAll: { useQuery: makeQuery("faq.all", faqGetAll) },
  },
  home: {
    getAll: { useQuery: makeQuery("home.all", homeGetAll) },
  },
  hrCost: {
    getAll: { useQuery: makeQuery("hrCost.all", hrCostGetAll) },
  },
  leave: {
    getAll: { useQuery: makeQuery("leave.all", leaveGetAll) },
  },
  turnover: {
    getAll: { useQuery: makeQuery("turnover.all", turnoverGetAll) },
  },
  employeeMarket: {
    getAll: { useQuery: makeQuery("employeeMarket.all", employeeMarketGetAll) },
  },
  training: {
    getAll: { useQuery: makeQuery("training.all", trainingGetAll) },
  },
  letters: {
    generate: { useMutation: makeMutation(lettersGenerate) },
  },
  contact: {
    submitRequest: { useMutation: makeMutation(contactSubmitRequest) },
  },
  hcKpi: {
    listOrganizations: { useQuery: makeQuery("hcKpi.organizations", hcKpiListOrganizations) },
    createOrganization: { useMutation: makeMutation(hcKpiCreateOrganization) },
    updateOrganization: { useMutation: makeMutation(hcKpiUpdateOrganization) },
    deleteOrganization: { useMutation: makeMutation(hcKpiDeleteOrganization) },
    listReports: { useQuery: makeQuery("hcKpi.reports", hcKpiListReports) },
    getReport: { useQuery: makeQuery("hcKpi.report", hcKpiGetReport) },
    createReport: { useMutation: makeMutation(hcKpiCreateReport) },
    updateReportStatus: { useMutation: makeMutation(hcKpiUpdateReportStatus) },
    deleteReport: { useMutation: makeMutation(hcKpiDeleteReport) },
    updateKpiEntry: { useMutation: makeMutation(hcKpiUpdateEntry) },
    addCustomIndicator: { useMutation: makeMutation(hcKpiAddCustomIndicator) },
    deleteKpiEntry: { useMutation: makeMutation(hcKpiDeleteEntry) },
  },
  subscriptions: {
    listPlans: { useQuery: makeQuery("subscriptions.plans", subsListPlans) },
    mySubscription: { useQuery: makeQuery("subscriptions.me", subsMySubscription) },
    listAllSubscriptions: { useQuery: makeQuery("subscriptions.all", subsListAllSubscriptions) },
    createSubscription: { useMutation: makeMutation(subsCreateSubscription) },
  },
  tickets: {
    myTickets: { useQuery: makeQuery("tickets.my", ticketsMyTickets) },
    getTicket: { useQuery: makeQuery("tickets.get", ticketsGetTicket) },
    create: { useMutation: makeMutation(ticketsCreate) },
    addMessage: { useMutation: makeMutation(ticketsAddMessage) },
    listAll: { useQuery: makeQuery("tickets.all", ticketsListAll) },
    updateStatus: { useMutation: makeMutation(ticketsUpdateStatus) },
    adminAddMessage: { useMutation: makeMutation(ticketsAdminAddMessage) },
  },
};
