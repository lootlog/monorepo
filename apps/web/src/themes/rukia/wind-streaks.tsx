import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

// Wind streaks that sweep across the screen
const streaks = [
  { y: "15%", duration: 8, delay: 0, width: 200, opacity: 0.06 },
  { y: "35%", duration: 12, delay: 3, width: 300, opacity: 0.045 },
  { y: "55%", duration: 10, delay: 6, width: 250, opacity: 0.05 },
  { y: "75%", duration: 14, delay: 2, width: 180, opacity: 0.04 },
  { y: "25%", duration: 9, delay: 8, width: 220, opacity: 0.045 },
  { y: "65%", duration: 11, delay: 5, width: 280, opacity: 0.05 },
  { y: "85%", duration: 13, delay: 1, width: 160, opacity: 0.04 },
];

export const WindStreaks = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      {streaks.map((streak) => (
        <m.div
          key={`${streak.y}:${prefersReducedMotion}`}
          className="absolute pointer-events-none"
          style={{
            top: streak.y,
            left: "-20%",
            width: streak.width,
            height: 1,
            background: `linear-gradient(90deg, transparent, rgba(220, 240, 255, ${streak.opacity}), transparent)`,
            filter: "blur(1px)",
          }}
          animate={{
            x: ["0vw", "140vw"],
            opacity: [0, streak.opacity, streak.opacity, 0],
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  x: {
                    duration: streak.duration,
                    repeat: Infinity,
                    ease: "linear",
                    delay: streak.delay,
                  },
                  opacity: {
                    duration: streak.duration,
                    repeat: Infinity,
                    ease: "linear",
                    delay: streak.delay,
                  },
                }
          }
        />
      ))}
    </>
  );
};
