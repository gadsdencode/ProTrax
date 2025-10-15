import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PageTransition } from "@/components/page-transition";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { useUIStore } from "@/stores/useUIStore";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectSettings from "@/pages/project-settings";
import Gantt from "@/pages/gantt";
import Kanban from "@/pages/kanban";
import Calendar from "@/pages/calendar";
import ListView from "@/pages/list-view";
import Portfolio from "@/pages/portfolio";
import Team from "@/pages/team";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Blueprint: javascript_auth_all_persistance - Protected routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/projects" component={Projects} />
      <ProtectedRoute path="/projects/:id/settings" component={ProjectSettings} />
      <ProtectedRoute path="/projects/:id/gantt" component={Gantt} />
      <ProtectedRoute path="/projects/:id/kanban" component={Kanban} />
      <ProtectedRoute path="/projects/:id/calendar" component={Calendar} />
      <ProtectedRoute path="/projects/:id/list" component={ListView} />
      <ProtectedRoute path="/gantt" component={Gantt} />
      <ProtectedRoute path="/kanban" component={Kanban} />
      <ProtectedRoute path="/calendar" component={Calendar} />
      <ProtectedRoute path="/list" component={ListView} />
      <ProtectedRoute path="/portfolio" component={Portfolio} />
      <ProtectedRoute path="/team" component={Team} />
      <ProtectedRoute path="/reports" component={Reports} />
      
      {/* Auth page - public */}
      <Route path="/auth" component={AuthPage} />
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user } = useAuth();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  
  // Sidebar width configuration
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <>
      {user ? (
        <SidebarProvider 
          style={style as React.CSSProperties}
          open={isSidebarOpen}
          onOpenChange={setSidebarOpen}
        >
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between px-4 h-14 border-b bg-background shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto">
                <PageTransition>
                  <Router />
                </PageTransition>
              </main>
            </div>
          </div>
        </SidebarProvider>
      ) : (
        <Router />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            {/* Blueprint: javascript_auth_all_persistance */}
            <AuthProvider>
              <AppContent />
              <Toaster />
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
