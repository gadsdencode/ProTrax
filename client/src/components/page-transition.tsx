import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "wouter";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
};

const pageTransition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.15,
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // If user prefers reduced motion, skip animations
  if (prefersReducedMotion) {
    return <div className="h-full">{children}</div>;
  }

  return (
    <motion.div
      key={location}
      initial="initial"
      animate="animate"
      variants={pageVariants}
      transition={pageTransition}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
