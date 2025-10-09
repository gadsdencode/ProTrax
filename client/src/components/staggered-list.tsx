import { motion, useReducedMotion } from "framer-motion";

export function StaggeredList({ children, className }: { children: React.ReactNode; className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  const container = {
    hidden: { opacity: prefersReducedMotion ? 1 : 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
      },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  const item = {
    hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "tween",
        ease: "easeOut",
        duration: prefersReducedMotion ? 0 : 0.2,
      },
    },
  };

  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}
