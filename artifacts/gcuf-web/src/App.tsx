import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@/lib/use-auth";
import { ThemeProvider } from "@/context/ThemeContext";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import collegeLogo from "/college-logo.png";
import LoginPage from "@/pages/login";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import CoursesPage from "@/pages/courses";
import CourseDetailPage from "@/pages/course-detail";
import StudentsPage from "@/pages/students";
import AnalyticsPage from "@/pages/analytics";
import TopperPage from "@/pages/toppers";
import DepartmentsPage from "@/pages/departments";
import UsersPage from "@/pages/users";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AppShell() {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (location === "/login") {
      return <LoginPage onBack={() => setLocation("/")} />;
    }
    return <LandingPage onStaffLogin={() => setLocation("/login")} />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar — visible only on small screens */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-sidebar shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src={collegeLogo} alt="GGC Jhang" className="w-7 h-7 object-contain" />
          <span className="font-bold text-sm text-foreground tracking-tight">GGC Jhang</span>
        </header>
        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={DashboardPage} />
            <Route path="/login" component={DashboardPage} />
            <Route path="/courses" component={CoursesPage} />
            <Route path="/courses/:id" component={CourseDetailPage} />
            <Route path="/students" component={StudentsPage} />
            <Route path="/analytics" component={AnalyticsPage} />
            <Route path="/toppers" component={TopperPage} />
            {isAdmin && <Route path="/departments" component={DepartmentsPage} />}
            {isAdmin && <Route path="/users" component={UsersPage} />}
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppShell />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
