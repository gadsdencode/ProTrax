import { cn } from "@/lib/utils";
import { bentoGridVariants, type BentoGridVariants } from "./card-variants";

interface BentoGridProps extends BentoGridVariants {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, columns, className }: BentoGridProps) {
  return (
    <div className={cn(bentoGridVariants({ columns }), className)}>
      {children}
    </div>
  );
}

