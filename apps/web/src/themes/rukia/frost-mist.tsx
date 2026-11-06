import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

// Frost mist that drifts across the bottom
const mistLayers = [
  { y: "92%", duration: 40, delay: 0, opacity: 0.03 },
  { y: "95%", duration: 35, delay: 10, opacity: 0.045 },
  { y: "88%", duration: 45, delay: 20, opacity: 0.02 },
];

export const FrostMist = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      {mistLayers.map((mist) => (
        <m.div
          key={`${mist.y}:${prefersReducedMotion}`}
          className="absolute w-full h-24 pointer-events-none"
          style={{
            top: mist.y,
            background: `linear-gradient(180deg, transparent, rgba(200, 230, 255, ${mist.opacity}))`,
            filter: "blur(20px)",
          }}
          animate={{
            x: ["-10%", "10%", "-10%"],
            opacity: [
              mist.opacity * 0.5,
              mist.opacity,
              mist.opacity * 0.7,
              mist.opacity,
              mist.opacity * 0.5,
            ],
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  x: {
                    duration: mist.duration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: mist.delay,
                  },
                  opacity: {
                    duration: mist.duration * 0.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: mist.delay,
                  },
                }
          }
        />
      ))}
    </>
  );
};
