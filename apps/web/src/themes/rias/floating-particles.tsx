import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

const floatingParticles = Array.from({ length: 12 }, (_, index) => ({
  delay: (index * 2.17) % 8,
  drift: ((index * 37) % 60) - 30,
  duration: 8 + ((index * 7) % 12),
  id: index,
  size: 2 + ((index * 11) % 4),
  x: 5 + ((index * 29) % 90),
}));

// Floating destruction particles for global overlay
export const FloatingParticles = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      {floatingParticles.map((p) => (
        <m.div
          key={`${p.id}-${prefersReducedMotion}`}
          className="absolute pointer-events-none"
          style={{
            left: `${p.x}%`,
            bottom: -10,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(200, 30, 60, 0.6) 0%, transparent 70%)",
            boxShadow: "0 0 4px rgba(200, 30, 60, 0.3)",
          }}
          animate={{
            y: [0, "calc(-100vh - 20px)"],
            opacity: [0, 0.7, 0.5, 0],
            x: [0, p.drift],
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "linear",
                }
          }
        />
      ))}
    </>
  );
};
