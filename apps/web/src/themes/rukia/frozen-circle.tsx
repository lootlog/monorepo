/* eslint-disable react-doctor/no-scale-from-zero -- These zero-scale elements are intentional point-origin decorative particles and SVG crystals, never text or controls; the rule explicitly permits point-origin illustration effects. */
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";
import { useState, type ReactNode } from "react";

// Generate random crystal positions around a circle - stable per mount
// Crystals stay within the avatar bounds to avoid overflow issues in narrow containers
const generateCircleCrystals = (count: number, circleSize: number) =>
  Array.from({ length: count }, (_, i) => {
    const baseAngle = (i / count) * 360;
    const jitter = (Math.random() - 0.5) * (360 / count) * 0.6;
    const angle = baseAngle + jitter;
    const rad = (angle * Math.PI) / 180;
    const radiusJitter = 0.85 + Math.random() * 0.15;
    const radius = (circleSize / 2) * radiusJitter;
    const x = 50 + Math.cos(rad) * (radius / (circleSize / 100));
    const y = 50 + Math.sin(rad) * (radius / (circleSize / 100));
    const starSize = 4 + Math.random() * 4;
    const rotation = Math.random() * 360;
    const animDuration = 2 + Math.random() * 3;
    const animDelay = Math.random() * 2;

    return { x, y, starSize, rotation, angle, animDuration, animDelay };
  });

const frozenCircleCrystals = generateCircleCrystals(10, 44);

// Frozen wrapper for circular elements (like avatars)
export const FrozenCircle = ({
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
      {/* Pulsing ice glow */}
      <m.div
        key={String(prefersReducedMotion)}
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={
          isAnimating
            ? {
                opacity: 1,
                boxShadow: [
                  "0 0 8px 2px rgba(180,220,255,0.3)",
                  "0 0 16px 4px rgba(180,220,255,0.5)",
                  "0 0 8px 2px rgba(180,220,255,0.3)",
                ],
              }
            : {
                opacity: 0,
                boxShadow: "0 0 0px 0px rgba(180,220,255,0)",
              }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : isAnimating
              ? {
                  opacity: { duration: 0.3 },
                  boxShadow: {
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }
              : { opacity: { duration: 0.3 } }
        }
      />

      {/* Frost overlay */}
      <m.div
        className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
        animate={{ opacity: isAnimating ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle, rgba(220, 240, 255, 0.3) 0%, rgba(200, 230, 255, 0.15) 50%, transparent 70%)",
          }}
        />
      </m.div>

      {/* Ice crystals - randomly scattered, continuously animated */}
      {frozenCircleCrystals.map((crystal) => (
        <m.div
          key={`${`${crystal.x}:${crystal.y}`}:${prefersReducedMotion}`}
          className="absolute pointer-events-none"
          style={{
            left: `${crystal.x}%`,
            top: `${crystal.y}%`,
          }}
          animate={
            isAnimating
              ? {
                  opacity: [0.5, 0.9, 0.5],
                  scale: [0.8, 1.1, 0.8],
                  rotate: [
                    crystal.rotation,
                    crystal.rotation + 180,
                    crystal.rotation + 360,
                  ],
                }
              : { opacity: 0, scale: 0.75 }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : isAnimating
                ? {
                    duration: crystal.animDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: crystal.animDelay,
                  }
                : { duration: 0.3 }
          }
        >
          <svg
            width={crystal.starSize}
            height={crystal.starSize}
            viewBox="0 0 8 8"
            style={{ transform: "translate(-50%, -50%)" }}
          >
            <path
              d="M4 0 L5 3 L8 3 L5.5 5 L6.5 8 L4 6 L1.5 8 L2.5 5 L0 3 L3 3 Z"
              fill="rgba(220, 240, 255, 0.7)"
              style={{
                filter: "drop-shadow(0 0 2px rgba(180, 220, 255, 0.9))",
              }}
            />
          </svg>
        </m.div>
      ))}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
