import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";

export type FallingSnowflakeType = "simple" | "detailed" | "dot";

// Single falling snowflake with dynamic behavior
export const FallingSnowflake = ({
  initialX,
  size,
  fallDuration,
  delay,
  windStrength,
  rotationSpeed,
  rotateDirection,
  opacity,
  type,
}: {
  initialX: number;
  size: number;
  fallDuration: number;
  delay: number;
  windStrength: number;
  rotationSpeed: number;
  rotateDirection: number;
  opacity: number;
  type: FallingSnowflakeType;
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <m.div
      key={String(prefersReducedMotion)}
      className="absolute pointer-events-none"
      style={{ left: `${initialX}%`, top: "-5%" }}
      animate={{
        y: ["0vh", "110vh"],
        x: [
          "0px",
          `${windStrength * 30}px`,
          `${-windStrength * 20}px`,
          `${windStrength * 40}px`,
          `${-windStrength * 25}px`,
          `${windStrength * 15}px`,
        ],
        rotate: [0, rotateDirection * 2],
        opacity: [opacity, opacity * 0.6, opacity, opacity * 0.8, opacity],
        scale: [1, 1.1, 0.95, 1.05, 1],
      }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              y: {
                duration: fallDuration,
                repeat: Infinity,
                ease: "linear",
                delay,
              },
              x: {
                duration: fallDuration * 0.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
              },
              rotate: {
                duration: rotationSpeed,
                repeat: Infinity,
                ease: "linear",
                delay,
              },
              opacity: {
                duration: fallDuration * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
              },
              scale: {
                duration: fallDuration * 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
              },
            }
      }
    >
      {type === "dot" ? (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: `rgba(220, 240, 255, ${opacity})`,
            boxShadow: `0 0 ${size}px rgba(200, 230, 255, ${opacity * 0.5})`,
          }}
        />
      ) : type === "simple" ? (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <g
            fill="none"
            stroke={`rgba(220, 240, 255, ${opacity})`}
            strokeWidth="0.8"
          >
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
          </g>
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <g
            fill="none"
            stroke={`rgba(220, 240, 255, ${opacity})`}
            strokeWidth="0.6"
          >
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
            <line x1="12" y1="2" x2="10" y2="5" />
            <line x1="12" y1="2" x2="14" y2="5" />
            <line x1="12" y1="22" x2="10" y2="19" />
            <line x1="12" y1="22" x2="14" y2="19" />
            <line x1="2" y1="12" x2="5" y2="10" />
            <line x1="2" y1="12" x2="5" y2="14" />
            <line x1="22" y1="12" x2="19" y2="10" />
            <line x1="22" y1="12" x2="19" y2="14" />
          </g>
        </svg>
      )}
    </m.div>
  );
};
