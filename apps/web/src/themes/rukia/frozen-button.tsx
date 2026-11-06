/* eslint-disable react-doctor/no-scale-from-zero -- These zero-scale elements are intentional point-origin decorative particles and SVG crystals, never text or controls; the rule explicitly permits point-origin illustration effects. */
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";
import type { ReactNode } from "react";
import { FrostFilter } from "./frost-filter";
import { ScatteredCrystal } from "./scattered-crystal";
import { Snowflake } from "./snowflake";
import { IceCracks } from "./ice-cracks";
import {
  buttonCrystalPositions,
  buttonSnowflakePositions,
} from "./frost-button-positions";

// Frozen wrapper for rectangular buttons - matches RukiaBorderGlow visual style
// but keeps button text readable by not covering it with opaque overlays
export const FrozenButton = ({
  children,
  isHovered,
  isActive,
  className = "",
  subtle = false,
  rounded = "rounded-md",
}: {
  children: ReactNode;
  isHovered: boolean;
  isActive: boolean;
  className?: string;
  subtle?: boolean;
  rounded?: string;
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isFrozen = isHovered || isActive;

  return (
    <div
      className={`relative overflow-hidden ${rounded} flex flex-col ${className}`}
    >
      {isFrozen && (
        <>
          <FrostFilter />

          {/* Frost texture + edge frost - only on hover, skipped on active to keep text readable */}
          {!isActive && (
            <>
              <m.div
                className={`absolute inset-0 ${rounded} pointer-events-none overflow-hidden`}
                initial={{ opacity: 0 }}
                animate={{ opacity: subtle ? 0.15 : 0.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    filter: "url(#frost-noise-subtle)",
                    background: "white",
                  }}
                />
              </m.div>

              <m.div
                className={`absolute inset-0 ${rounded} pointer-events-none overflow-hidden`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <m.div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(200, 230, 255, 0.1) 0%, transparent 25%), " +
                      "linear-gradient(0deg, rgba(200, 230, 255, 0.1) 0%, transparent 25%), " +
                      "linear-gradient(90deg, rgba(200, 230, 255, 0.08) 0%, transparent 15%), " +
                      "linear-gradient(270deg, rgba(200, 230, 255, 0.08) 0%, transparent 15%)",
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </m.div>
            </>
          )}

          <IceCracks isVisible />

          {buttonCrystalPositions.map((crystal) => (
            <ScatteredCrystal
              key={`${crystal.x}:${crystal.y}`}
              x={crystal.x}
              y={crystal.y}
              size={crystal.size}
              rotation={crystal.rotation}
              isVisible
              delay={crystal.delay}
            />
          ))}

          {buttonSnowflakePositions.map((snowflake) => (
            <Snowflake
              key={`${snowflake.x}:${snowflake.y}`}
              x={snowflake.x}
              y={snowflake.y}
              size={snowflake.size}
              isVisible
              delay={snowflake.delay}
            />
          ))}

          {/* Ice glow border - outer glow only, no inset */}
          <m.div
            className={`absolute inset-0 ${rounded} pointer-events-none`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              boxShadow:
                "inset 0 0 8px 1px rgba(200, 230, 255, 0.25), 0 0 12px 2px rgba(180, 220, 255, 0.2)",
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Active state: shimmer + cyan border */}
          {isActive && !subtle && (
            <>
              <m.div
                className={`absolute inset-0 ${rounded} pointer-events-none overflow-hidden`}
              >
                <m.div
                  key={String(prefersReducedMotion)}
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%)",
                  }}
                  animate={{ x: ["-200%", "200%"] }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : {
                          duration: 2.5,
                          repeat: Infinity,
                          repeatDelay: 1.5,
                          ease: "easeInOut",
                        }
                  }
                />
              </m.div>
              <m.div
                className={`absolute inset-0 ${rounded} pointer-events-none border border-cyan-200/30`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            </>
          )}

          {/* Active burst (one-shot) */}
          {isActive && !subtle && (
            <m.div
              className={`absolute inset-0 ${rounded} pointer-events-none`}
              style={{
                background:
                  "radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, rgba(220, 240, 255, 0.15) 30%, transparent 60%)",
              }}
              initial={{ opacity: 1, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 min-h-0">{children}</div>
    </div>
  );
};
