import { cn } from "@/lib/utils";

// Enterprise client logos - these would be actual client logos in production
const enterpriseLogos = [
  { name: "TechCorp", initials: "TC" },
  { name: "GlobalFinance", initials: "GF" },
  { name: "InnovateLabs", initials: "IL" },
  { name: "ScaleUp", initials: "SU" },
  { name: "EnterpriseOne", initials: "E1" },
  { name: "DataFlow", initials: "DF" },
];

export function SocialProof() {
  return (
    <section className="py-16 px-4 border-t border-border/50">
      <div className="container mx-auto max-w-6xl">
        <p className="text-center text-sm text-muted-foreground mb-8 tracking-wide uppercase">
          Trusted by leading enterprise teams worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {enterpriseLogos.map((logo, index) => (
            <div
              key={logo.name}
              className={cn(
                "flex items-center gap-2 text-muted-foreground/60 hover:text-muted-foreground transition-colors",
                "animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-sm font-semibold">
                {logo.initials}
              </div>
              <span className="text-sm font-medium hidden sm:block">{logo.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>99.9% Uptime SLA</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>SOC 2 Type II Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>GDPR Compliant</span>
          </div>
        </div>
      </div>
    </section>
  );
}

