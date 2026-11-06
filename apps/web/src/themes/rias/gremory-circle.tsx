import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";
import { useState, type ReactNode } from "react";

// Gremory wrapper for circular elements (like avatars)
export const GremoryCircle = ({
  children,
  isActive,
}: {
  children: ReactNode;
  isActive: boolean;
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const isAnimating = isActive || isHovered;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Static shadows crossfade without repainting the shadow geometry. */}
      <m.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ boxShadow: "0 0 8px 2px rgba(200, 30, 60, 0.25)" }}
        animate={{ opacity: isAnimating ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      <m.div
        key={`glow-${prefersReducedMotion}`}
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ boxShadow: "0 0 16px 4px rgba(200, 30, 60, 0.45)" }}
        animate={{ opacity: isAnimating ? [0, 1, 0] : 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : isAnimating
              ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
        }
      />

      {/* Rotating mini magic circle on hover */}
      {isAnimating && (
        <m.div
          key={`rotation-${prefersReducedMotion}`}
          className="absolute -inset-1 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 8, repeat: Infinity, ease: "linear" }
          }
        >
          <svg viewBox="0 0 44 44" className="w-full h-full">
            <circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke="rgba(200, 30, 60, 0.2)"
              strokeWidth="0.5"
              strokeDasharray="3 5"
            />
          </svg>
        </m.div>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
};
