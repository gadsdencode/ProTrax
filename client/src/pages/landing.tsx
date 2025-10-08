import { Button } from "@/components/ui/button";
import { BarChart3, Calendar, Kanban, Layout, Network, TrendingUp } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">ProjectHub</span>
          </div>
          <Button
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Enterprise Project Management
            <span className="block text-primary mt-2">Built for Modern Teams</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Comprehensive PM suite with Gantt charts, Kanban boards, portfolio management, 
            and AI-powered insights. Support for Waterfall, Agile, and Hybrid methodologies.
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started"
            className="h-12 px-8"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-card">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Powerful Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8 text-primary" />}
              title="Advanced Gantt Charts"
              description="Interactive timeline with critical path analysis, dependency tracking, and automatic schedule updates"
            />
            <FeatureCard
              icon={<Kanban className="h-8 w-8 text-primary" />}
              title="Kanban Boards"
              description="Customizable workflows with WIP limits, drag-and-drop cards, and real-time collaboration"
            />
            <FeatureCard
              icon={<Calendar className="h-8 w-8 text-primary" />}
              title="Calendar & List Views"
              description="Multiple perspectives on your work with powerful filtering, sorting, and grouping capabilities"
            />
            <FeatureCard
              icon={<Network className="h-8 w-8 text-primary" />}
              title="Portfolio Management"
              description="Executive dashboards, strategic alignment, and demand management for project portfolios"
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8 text-primary" />}
              title="AI-Powered Insights"
              description="Predictive analytics, automated summaries, and intelligent risk predictions using Gemini AI"
            />
            <FeatureCard
              icon={<Layout className="h-8 w-8 text-primary" />}
              title="Comprehensive Reporting"
              description="Excel exports, burndown charts, budget tracking, and customizable status reports"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <p>© 2024 ProjectHub. Enterprise Project Management Platform.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border bg-background hover-elevate transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
