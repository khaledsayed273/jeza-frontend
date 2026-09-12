import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import AdminTicketsPage from "./pages/AdminTicketsPage";
import AccountPage from "./pages/AccountPage";
import AboutPage from "./pages/AboutPage";
import DeclarationsPage from "./pages/DeclarationsPage";
import ResourcesPage from "./pages/ResourcesPage";
import Home from "./pages/Home";
import CalculatorPage from "./pages/CalculatorPage";
import TrainingPage from "./pages/TrainingPage";
import EndOfServicePage from "./pages/EndOfServicePage";
import UpdatesPage from "./pages/UpdatesPage";
import HRExplainersPage from "./pages/HRExplainersPage";
import NationalityRatioPage from "./pages/NationalityRatioPage";
import TemplatesPage from "./pages/TemplatesPage";
import LettersPage from "./pages/LettersPage";
import PoliciesPage from "./pages/PoliciesPage";
import DocumentsHubPage from "./pages/DocumentsHubPage";
import EmployeeCostPage from "./pages/EmployeeCostPage";
import HRCostPage from "./pages/HRCostPage";
import TurnoverRatePage from "./pages/TurnoverRatePage";
import PayrollPage from "./pages/PayrollPage";
import ProbationPage from "./pages/ProbationPage";
import ContractConversionPage from "./pages/ContractConversionPage";
import HcKpiPage from "./pages/HcKpiPage";
import LeaveCalculatorPage from "./pages/LeaveCalculatorPage";
import JobDescriptionsPage from "./pages/JobDescriptionsPage";
import WorkforcePlanningPage from "./pages/WorkforcePlanningPage";
import OrgChartPage from "./pages/OrgChartPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PricingPage from "./pages/PricingPage";
import SupportPage from "./pages/SupportPage";
import NotFound from "./pages/NotFound";
import GlobalFooter from "./components/GlobalFooter";
import ThemeToggle from "./components/ThemeToggle";
import ErrorBoundary from "./components/ErrorBoundary";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={AboutPage} />
      <Route path="/calculator" component={CalculatorPage} />
      <Route path="/resources" component={ResourcesPage} />
      <Route path="/training" component={TrainingPage} />
      <Route path="/end-of-service" component={EndOfServicePage} />
      <Route path="/updates" component={UpdatesPage} />
      <Route path="/hr-explainers" component={HRExplainersPage} />
      <Route path="/nationality-ratio" component={NationalityRatioPage} />
      <Route path="/templates" component={TemplatesPage} />
      <Route path="/letters" component={LettersPage} />
      <Route path="/declarations" component={DeclarationsPage} />
      <Route path="/policies" component={PoliciesPage} />
      <Route path="/documents-hub" component={DocumentsHubPage} />
      <Route path="/employee-cost" component={EmployeeCostPage} />
      <Route path="/hr-cost" component={HRCostPage} />
      <Route path="/turnover-rate" component={TurnoverRatePage} />
      <Route path="/payroll" component={PayrollPage} />
      <Route path="/probation" component={ProbationPage} />
      <Route path="/contract-conversion" component={ContractConversionPage} />
      <Route path="/hc-kpi" component={HcKpiPage} />
      <Route path="/leave-calculator" component={LeaveCalculatorPage} />
      <Route path="/job-descriptions" component={JobDescriptionsPage} />
      <Route path="/workforce-planning" component={WorkforcePlanningPage} />
      <Route path="/org-chart" component={OrgChartPage} />
      <Route path="/my-dashboard" component={DashboardPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/admin/tickets" component={AdminTicketsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <div className="min-h-screen flex flex-col">
              <Router />
              <GlobalFooter />
            </div>
            <ThemeToggle />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;