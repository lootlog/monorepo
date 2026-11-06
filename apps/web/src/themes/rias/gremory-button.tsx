/* eslint-disable react-doctor/no-scale-from-zero -- These zero-scale elements are intentional point-origin decorative particles and SVG crystals, never text or controls; the rule explicitly permits point-origin illustration effects. */
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import * as m from "framer-motion/m";
import type { ReactNode } from "react";
import { DestructionFilter } from "./destruction-filter";
import { DestructionParticle } from "./destruction-particle";
import { MagicCircle } from "./magic-circle";
import { DestructionRunes } from "./destruction-runes";
import {
  buttonParticlePositions,
  buttonMagicCirclePositions,
} from "./gremory-button-positions";

// Gremory wrapper for rectangular buttons
export const GremoryButton = ({
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
  const isEnergized = isHovered || isActive;

  return (
    <div
      className={`relative overflow-hidden ${rounded} flex flex-col ${className}`}
    >
      {isEnergized && (
        <>
          <DestructionFilter />

          {/* Destruction energy texture - hover only */}
          {!isActive && (
            <>
              <m.div
                className={`absolute inset-0 ${rounded} pointer-events-none overflow-hidden`}
                initial={{ opacity: 0 }}
                animate={{ opacity: subtle ? 0.1 : 0.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    filter: "url(#destruction-glow-subtle)",
                    background: "rgba(200, 30, 60, 0.5)",
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
                      "linear-gradient(180deg, rgba(200, 30, 60, 0.08) 0%, transparent 25%), " +
                      "linear-gradient(0deg, rgba(200, 30, 60, 0.08) 0%, transparent 25%), " +
                      "linear-gradient(90deg, rgba(200, 30, 60, 0.06) 0%, transparent 15%), " +
                      "linear-gradient(270deg, rgba(200, 30, 60, 0.06) 0%, transparent 15%)",
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </m.div>
            </>
          )}

          <DestructionRunes isVisible />

          {buttonParticlePositions.map((p) => (
            <DestructionParticle
              key={`${p.x}:${p.y}`}
              x={p.x}
              y={p.y}
              size={p.size}
              isVisible
              delay={p.delay}
            />
          ))}

          {buttonMagicCirclePositions.map((mc) => (
            <MagicCircle
              key={`${mc.x}:${mc.y}`}
              x={mc.x}
              y={mc.y}
              size={mc.size}
              isVisible
              delay={mc.delay}
            />
          ))}

          {/* Crimson glow border */}
          <m.div
            className={`absolute inset-0 ${rounded} pointer-events-none`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              boxShadow:
                "inset 0 0 8px 1px rgba(200, 30, 60, 0.2), 0 0 12px 2px rgba(200, 30, 60, 0.15)",
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Active state: crimson shimmer + border */}
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
                      "linear-gradient(105deg, transparent 40%, rgba(200, 30, 60, 0.2) 50%, transparent 60%)",
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
                className={`absolute inset-0 ${rounded} pointer-events-none border border-red-400/25`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            </>
          )}

          {/* Active burst */}
          {isActive && !subtle && (
            <m.div
              className={`absolute inset-0 ${rounded} pointer-events-none`}
              style={{
                background:
                  "radial-gradient(circle at center, rgba(200, 30, 60, 0.25) 0%, rgba(90, 20, 60, 0.1) 30%, transparent 60%)",
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
