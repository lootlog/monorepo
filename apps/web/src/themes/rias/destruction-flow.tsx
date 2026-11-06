import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

// Drifting destruction energy blobs - dark crimson masses flowing across the screen
export const DestructionFlow = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      {[
        {
          size: 350,
          x: ["-10%", "40%", "110%"],
          y: ["20%", "60%", "30%"],
          duration: 35,
          delay: 0,
        },
        {
          size: 280,
          x: ["110%", "55%", "-10%"],
          y: ["70%", "25%", "80%"],
          duration: 40,
          delay: 5,
        },
        {
          size: 220,
          x: ["50%", "-10%", "60%"],
          y: ["-10%", "50%", "110%"],
          duration: 45,
          delay: 12,
        },
      ].map((blob) => (
        <m.div
          key={`${blob.size}:${prefersReducedMotion}`}
          className="absolute pointer-events-none"
          style={{
            left: 0,
            top: 0,
            width: blob.size,
            height: blob.size,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(200, 30, 60, 0.22) 0%, rgba(120, 15, 35, 0.12) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
          animate={{
            x: blob.x,
            y: blob.y,
            scale: [1, 1.3, 0.9, 1.1, 1],
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  x: {
                    duration: blob.duration,
                    delay: blob.delay,
                    repeat: Infinity,
                    ease: "linear",
                  },
                  y: {
                    duration: blob.duration,
                    delay: blob.delay,
                    repeat: Infinity,
                    ease: "linear",
                  },
                  scale: {
                    duration: blob.duration * 0.6,
                    delay: blob.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }
          }
        />
      ))}
    </>
  );
};
