import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./dashboard-mockup";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  onLogin: () => void;
  isRedirecting: boolean;
}

export function HeroSection({ onLogin, isRedirecting }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-16 px-4 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-chart-2/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_70%)]" />
      </div>

      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          {/* Badge */}
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full",
            "bg-primary/10 border border-primary/20 text-primary text-sm font-medium",
            "mb-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
          )}>
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Project Intelligence</span>
          </div>

          {/* Headline */}
          <h1 className={cn(
            "text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6",
            "animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
          )} style={{ animationDelay: "100ms" }}>
            Enterprise Project Management
            <span className="block bg-gradient-to-r from-primary via-chart-1 to-chart-2 bg-clip-text text-transparent mt-2">
              Built for Modern Teams
            </span>
          </h1>

          {/* Subheadline */}
          <p className={cn(
            "text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed",
            "animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
          )} style={{ animationDelay: "200ms" }}>
            Comprehensive PM suite with interactive Gantt charts, Kanban boards, portfolio management, 
            and <span className="text-foreground font-medium">AI-powered insights</span>. 
            Support for Waterfall, Agile, and Hybrid methodologies.
          </p>

          {/* CTA Buttons */}
          <div className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-4",
            "animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
          )} style={{ animationDelay: "300ms" }}>
            <Button
              size="lg"
              onClick={onLogin}
              disabled={isRedirecting}
              data-testid="button-get-started"
              className="h-12 px-8 text-base gap-2 shadow-lg shadow-primary/20"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-12 px-8 text-base"
            >
              See Features
            </Button>
          </div>

          {/* Trust indicators */}
          <div className={cn(
            "flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground",
            "animate-in fade-in-0 duration-700"
          )} style={{ animationDelay: "400ms" }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-chart-2" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-chart-2" />
              <span>14-day free trial</span>
            </div>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative" style={{ animationDelay: "500ms" }}>
          <DashboardMockup />
          
          {/* Floating elements for visual interest */}
          <div className={cn(
            "absolute -left-4 top-1/4 p-3 rounded-xl bg-card border border-border shadow-lg",
            "animate-in fade-in-0 slide-in-from-left-8 duration-1000 hidden lg:block"
          )} style={{ animationDelay: "800ms" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-chart-2/20 flex items-center justify-center">
                <span className="text-chart-2 text-sm font-bold">✓</span>
              </div>
              <div>
                <p className="text-xs font-medium">Task Completed</p>
                <p className="text-[10px] text-muted-foreground">API Integration</p>
              </div>
            </div>
          </div>

          <div className={cn(
            "absolute -right-4 top-1/3 p-3 rounded-xl bg-card border border-border shadow-lg",
            "animate-in fade-in-0 slide-in-from-right-8 duration-1000 hidden lg:block"
          )} style={{ animationDelay: "900ms" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium">AI Insight</p>
                <p className="text-[10px] text-muted-foreground">3 risks detected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

