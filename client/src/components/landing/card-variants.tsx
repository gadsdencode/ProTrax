import { cva, type VariantProps } from "class-variance-authority";

export const featureCardVariants = cva(
  "rounded-2xl border bg-card p-6 transition-all duration-300 relative overflow-hidden",
  {
    variants: {
      size: {
        sm: "col-span-1 row-span-1",
        md: "col-span-1 md:col-span-2 row-span-1",
        lg: "col-span-1 md:col-span-2 row-span-2",
        hero: "col-span-1 md:col-span-2 lg:col-span-3 row-span-2",
      },
      interactive: {
        true: "hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 cursor-pointer group",
        false: "",
      },
      variant: {
        default: "bg-card",
        gradient: "bg-gradient-to-br from-card via-card to-primary/5",
        glass: "bg-card/80 backdrop-blur-sm",
        accent: "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
      },
    },
    defaultVariants: {
      size: "sm",
      interactive: true,
      variant: "default",
    },
  }
);

export type FeatureCardVariants = VariantProps<typeof featureCardVariants>;

export const bentoGridVariants = cva(
  "grid gap-4 md:gap-6",
  {
    variants: {
      columns: {
        2: "grid-cols-1 md:grid-cols-2",
        3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
      },
    },
    defaultVariants: {
      columns: 3,
    },
  }
);

export type BentoGridVariants = VariantProps<typeof bentoGridVariants>;

