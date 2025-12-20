import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Layout, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroSection } from "@/components/landing/hero-section";
import { BentoGrid } from "@/components/landing/bento-grid";
import { 
  GanttFeatureCell, 
  KanbanFeatureCell, 
  AIInsightsCell, 
  PortfolioCell,
  CalendarCell,
  ReportsCell,
  AnalyticsCell
} from "@/components/landing/feature-cells";
import { SocialProof } from "@/components/landing/social-proof";

export default function Landing() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLogin = () => {
    setIsRedirecting(true);
    // Brief delay to show loading state before redirect
    setTimeout(() => {
      window.location.href = '/api/login';
    }, 150);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Redirect overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Redirecting to login...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Layout className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight">ProjectHub</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Enterprise
            </a>
          </nav>
          <Button
            onClick={handleLogin}
            disabled={isRedirecting}
            data-testid="button-login"
            className="h-9 px-4"
          >
            {isRedirecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Sign In"
            )}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <HeroSection onLogin={handleLogin} isRedirecting={isRedirecting} />

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 bg-gradient-to-b from-background to-card/50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className={cn(
              "text-3xl md:text-4xl font-bold tracking-tight mb-4",
              "animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
            )}>
              Powerful Features for
              <span className="text-primary"> Enterprise Teams</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage complex projects, from planning to delivery.
            </p>
          </div>

          {/* Bento Grid */}
          <BentoGrid columns={3} className="auto-rows-auto">
            {/* Row 1: Two large cards for Gantt and Kanban */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2">
              <GanttFeatureCell />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-1 row-span-2">
              <KanbanFeatureCell />
            </div>
            
            {/* Row 2: Medium cards */}
            <AIInsightsCell />
            <PortfolioCell />
            
            {/* Row 3: Small cards */}
            <CalendarCell />
            <ReportsCell />
            <AnalyticsCell />
          </BentoGrid>
        </div>
      </section>

      {/* Social Proof */}
      <SocialProof />

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-card/50 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to transform your project management?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of teams already using ProjectHub to deliver projects on time and within budget.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleLogin}
              disabled={isRedirecting}
              className="h-12 px-8 text-base gap-2 shadow-lg shadow-primary/20"
            >
              {isRedirecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Get Started Free"
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Layout className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">ProjectHub</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 ProjectHub. Enterprise Project Management Platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
