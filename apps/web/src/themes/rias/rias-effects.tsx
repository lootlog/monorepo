import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";

// SVG filter for destruction energy glow
const DestructionFilter = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <filter
        id="destruction-glow"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.04"
          numOctaves="3"
          result="noise"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer result="energy">
          <feFuncA type="table" tableValues="0 0.06 0.1 0.08 0.05" />
        </feComponentTransfer>
        <feFlood floodColor="rgb(200, 30, 60)" result="color" />
        <feComposite in="color" in2="energy" operator="in" />
      </filter>
      <filter
        id="destruction-glow-subtle"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.03"
          numOctaves="2"
          result="noise"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer result="energy">
          <feFuncA type="table" tableValues="0 0.02 0.04 0.03 0.01" />
        </feComponentTransfer>
        <feFlood floodColor="rgb(200, 30, 60)" result="color" />
        <feComposite in="color" in2="energy" operator="in" />
      </filter>
    </defs>
  </svg>
);

// Destruction energy particle
const DestructionParticle = ({
  x,
  y,
  size,
  isVisible,
  delay,
}: {
  x: string;
  y: string;
  size: number;
  isVisible: boolean;
  delay: number;
}) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{
      left: x,
      top: y,
      transform: "translate(-50%, -50%)",
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: isVisible ? [0, 0.8, 0] : 0,
      scale: isVisible ? [0, 1.2, 0.6] : 0,
    }}
    transition={{
      duration: 1.5,
      delay: isVisible ? delay : 0,
      repeat: isVisible ? Infinity : 0,
      repeatDelay: 1 + delay,
      ease: "easeOut",
    }}
  >
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(200, 30, 60, 0.8) 0%, rgba(90, 20, 60, 0.4) 60%, transparent 100%)",
        boxShadow: "0 0 6px rgba(200, 30, 60, 0.5)",
      }}
    />
  </motion.div>
);

// Small magic circle SVG element
const MagicCircle = ({
  x,
  y,
  size,
  isVisible,
  delay,
}: {
  x: string;
  y: string;
  size: number;
  isVisible: boolean;
  delay: number;
}) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{
      left: x,
      top: y,
      transform: "translate(-50%, -50%)",
    }}
    initial={{ opacity: 0, scale: 0, rotate: 0 }}
    animate={{
      opacity: isVisible ? 0.5 : 0,
      scale: isVisible ? 1 : 0,
      rotate: isVisible ? 360 : 0,
    }}
    transition={{
      opacity: { duration: 0.5, delay: isVisible ? delay : 0 },
      scale: { duration: 0.5, delay: isVisible ? delay : 0 },
      rotate: { duration: 12, repeat: Infinity, ease: "linear" },
    }}
  >
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="rgba(200, 30, 60, 0.6)"
        strokeWidth="0.8"
      />
      <circle
        cx="12"
        cy="12"
        r="7"
        fill="none"
        stroke="rgba(200, 30, 60, 0.4)"
        strokeWidth="0.5"
      />
      <polygon
        points="12,3 14.5,9 21,9.5 16,14 17.5,21 12,17.5 6.5,21 8,14 3,9.5 9.5,9"
        fill="none"
        stroke="rgba(200, 30, 60, 0.35)"
        strokeWidth="0.5"
      />
      <circle cx="12" cy="12" r="2" fill="rgba(200, 30, 60, 0.3)" />
    </svg>
  </motion.div>
);

// Demonic runes that fade in on hover/active
const DestructionRunes = ({ isVisible }: { isVisible: boolean }) => (
  <>
    {[
      { x: "12%", y: "75%", size: 10, delay: 0.1, rotate: 15 },
      { x: "78%", y: "22%", size: 9, delay: 0.25, rotate: -10 },
      { x: "45%", y: "15%", size: 8, delay: 0.35, rotate: 25 },
    ].map((rune, i) => (
      <motion.div
        key={i}
        className="absolute pointer-events-none"
        style={{
          left: rune.x,
          top: rune.y,
          transform: `translate(-50%, -50%) rotate(${rune.rotate}deg)`,
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: isVisible ? 0.3 : 0,
          scale: isVisible ? 1 : 0.5,
        }}
        transition={{ duration: 0.5, delay: isVisible ? rune.delay : 0 }}
      >
        <svg width={rune.size} height={rune.size} viewBox="0 0 16 16">
          <circle
            cx="8"
            cy="8"
            r="6.5"
            fill="none"
            stroke="rgba(200, 30, 60, 0.5)"
            strokeWidth="0.5"
          />
          <polygon
            points="8,2 9.5,6 14,6.5 10.5,9 11.5,14 8,11 4.5,14 5.5,9 2,6.5 6.5,6"
            fill="none"
            stroke="rgba(200, 30, 60, 0.35)"
            strokeWidth="0.4"
          />
          <circle cx="8" cy="8" r="1.5" fill="rgba(200, 30, 60, 0.25)" />
        </svg>
      </motion.div>
    ))}
  </>
);

// Pre-computed positions for button particles
const buttonParticlePositions = [
  { x: "15%", y: "25%", size: 4, delay: 0 },
  { x: "80%", y: "70%", size: 3, delay: 0.2 },
  { x: "60%", y: "15%", size: 3.5, delay: 0.1 },
  { x: "30%", y: "80%", size: 3, delay: 0.3 },
];

const buttonMagicCirclePositions = [
  { x: "85%", y: "20%", size: 14, delay: 0 },
  { x: "10%", y: "75%", size: 12, delay: 0.15 },
];

const floatingParticles = Array.from({ length: 12 }, (_, index) => ({
  delay: (index * 2.17) % 8,
  drift: ((index * 37) % 60) - 30,
  duration: 8 + ((index * 7) % 12),
  id: index,
  size: 2 + ((index * 11) % 4),
  x: 5 + ((index * 29) % 90),
}));

// Floating destruction particles for global overlay
const FloatingParticles = () => {
  return (
    <>
      {floatingParticles.map((p) => (
        <motion.div
          key={p.id}
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
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </>
  );
};

// Ambient magic circle watermark
const AmbientMagicCircle = () => (
  <motion.div
    className="absolute pointer-events-none"
    style={{
      right: "-5%",
      bottom: "-5%",
      width: 300,
      height: 300,
      opacity: 0.03,
    }}
    animate={{ rotate: 360 }}
    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
  >
    <svg viewBox="0 0 200 200" fill="none">
      <circle
        cx="100"
        cy="100"
        r="90"
        stroke="rgba(200, 30, 60, 1)"
        strokeWidth="1"
      />
      <circle
        cx="100"
        cy="100"
        r="75"
        stroke="rgba(200, 30, 60, 1)"
        strokeWidth="0.5"
      />
      <circle
        cx="100"
        cy="100"
        r="60"
        stroke="rgba(200, 30, 60, 0.8)"
        strokeWidth="0.5"
      />
      <polygon
        points="100,15 118,60 170,60 128,90 142,140 100,110 58,140 72,90 30,60 82,60"
        stroke="rgba(200, 30, 60, 0.6)"
        strokeWidth="0.8"
        fill="none"
      />
      {/* Inner hexagon */}
      <polygon
        points="100,45 130,65 130,95 100,115 70,95 70,65"
        stroke="rgba(200, 30, 60, 0.4)"
        strokeWidth="0.5"
        fill="none"
      />
      <circle
        cx="100"
        cy="100"
        r="15"
        stroke="rgba(200, 30, 60, 0.6)"
        strokeWidth="0.5"
        fill="rgba(200, 30, 60, 0.1)"
      />
    </svg>
  </motion.div>
);

// Edge energy glow for the global overlay
const DestructionEdgeGlow = () => (
  <div
    className="absolute inset-0"
    style={{
      background:
        "linear-gradient(180deg, rgba(200, 30, 60, 0.04) 0%, transparent 5%), " +
        "linear-gradient(0deg, rgba(200, 30, 60, 0.04) 0%, transparent 5%), " +
        "linear-gradient(90deg, rgba(200, 30, 60, 0.03) 0%, transparent 3%), " +
        "linear-gradient(270deg, rgba(200, 30, 60, 0.03) 0%, transparent 3%)",
    }}
  />
);

// Second ambient magic circle - top left, counter-rotating
const AmbientMagicCircleTopLeft = () => (
  <motion.div
    className="absolute pointer-events-none"
    style={{
      left: "-8%",
      top: "-8%",
      width: 220,
      height: 220,
      opacity: 0.025,
    }}
    animate={{ rotate: -360 }}
    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
  >
    <svg viewBox="0 0 200 200" fill="none">
      <circle
        cx="100"
        cy="100"
        r="90"
        stroke="rgba(200, 30, 60, 1)"
        strokeWidth="1"
      />
      <circle
        cx="100"
        cy="100"
        r="70"
        stroke="rgba(200, 30, 60, 0.8)"
        strokeWidth="0.5"
        strokeDasharray="8 4"
      />
      <polygon
        points="100,20 115,55 155,55 125,80 135,120 100,95 65,120 75,80 45,55 85,55"
        stroke="rgba(200, 30, 60, 0.5)"
        strokeWidth="0.6"
        fill="none"
      />
      <circle
        cx="100"
        cy="100"
        r="20"
        stroke="rgba(200, 30, 60, 0.5)"
        strokeWidth="0.5"
        fill="rgba(200, 30, 60, 0.05)"
      />
    </svg>
  </motion.div>
);

// Pulsating Power of Destruction vignette — breathing crimson edges
const DestructionVignette = () => (
  <motion.div
    className="absolute inset-0 pointer-events-none"
    animate={{ opacity: [0.3, 0.55, 0.3] }}
    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    style={{
      background:
        "radial-gradient(ellipse at center, transparent 50%, rgba(200, 30, 60, 0.06) 75%, rgba(120, 15, 35, 0.1) 90%, rgba(40, 5, 15, 0.14) 100%)",
    }}
  />
);

// Drifting destruction energy blobs — dark crimson masses flowing across the screen
const DestructionFlow = () => (
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
    ].map((blob, i) => (
      <motion.div
        key={i}
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
        transition={{
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
        }}
      />
    ))}
  </>
);

// Global ambient destruction overlay for the entire app
export const GlobalDestructionOverlay = () => (
  <motion.div
    className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 2, ease: "easeOut" }}
  >
    <DestructionFilter />
    <DestructionEdgeGlow />
    <DestructionVignette />
    <DestructionFlow />
    <AmbientMagicCircle />
    <AmbientMagicCircleTopLeft />
    <FloatingParticles />
  </motion.div>
);

// Gremory wrapper for circular elements (like avatars)
export const GremoryCircle = ({
  children,
  isActive,
}: {
  children: ReactNode;
  isActive: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isAnimating = isActive || isHovered;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pulsing crimson glow */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={
          isAnimating
            ? {
                opacity: 1,
                boxShadow: [
                  "0 0 8px 2px rgba(200, 30, 60, 0.25)",
                  "0 0 16px 4px rgba(200, 30, 60, 0.45)",
                  "0 0 8px 2px rgba(200, 30, 60, 0.25)",
                ],
              }
            : {
                opacity: 0,
                boxShadow: "0 0 0px 0px rgba(200, 30, 60, 0)",
              }
        }
        transition={
          isAnimating
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

      {/* Rotating mini magic circle on hover */}
      {isAnimating && (
        <motion.div
          className="absolute -inset-1 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
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
        </motion.div>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
};

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
  const isEnergized = isHovered || isActive;

  return (
    <div
      className={`relative overflow-hidden ${rounded} flex flex-col ${className}`}
    >
      {isEnergized && (
        <>
          <DestructionFilter />

          {/* Destruction energy texture — hover only */}
          {!isActive && (
            <>
              <motion.div
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
              </motion.div>

              <motion.div
                className={`absolute inset-0 ${rounded} pointer-events-none overflow-hidden`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
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
              </motion.div>
            </>
          )}

          <DestructionRunes isVisible />

          {buttonParticlePositions.map((p, index) => (
            <DestructionParticle
              key={index}
              x={p.x}
              y={p.y}
              size={p.size}
              isVisible
              delay={p.delay}
            />
          ))}

          {buttonMagicCirclePositions.map((mc, index) => (
            <MagicCircle
              key={index}
              x={mc.x}
              y={mc.y}
              size={mc.size}
              isVisible
              delay={mc.delay}
            />
          ))}

          {/* Crimson glow border */}
          <motion.div
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
              <motion.div
                className={`absolute inset-0 ${rounded} pointer-events-none overflow-hidden`}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(105deg, transparent 40%, rgba(200, 30, 60, 0.2) 50%, transparent 60%)",
                  }}
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 1.5,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
              <motion.div
                className={`absolute inset-0 ${rounded} pointer-events-none border border-red-400/25`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            </>
          )}

          {/* Active burst */}
          {isActive && !subtle && (
            <motion.div
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

// Destruction overlay for containers (static, always visible)
export const DestructionOverlay = ({
  subtle = false,
  rounded = "rounded-xl",
}: {
  subtle?: boolean;
  rounded?: string;
}) => {
  const intensity = subtle ? 0.35 : 1;

  return (
    <>
      <DestructionFilter />

      {/* Energy texture */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded} overflow-hidden`}
        style={{ opacity: intensity }}
      >
        <div
          className="absolute inset-0"
          style={{
            filter: "url(#destruction-glow)",
            background: "rgba(200, 30, 60, 0.3)",
          }}
        />
      </div>

      {/* Multi-gradient overlay */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded}`}
        style={{
          background:
            `radial-gradient(ellipse at 30% 20%, rgba(200, 30, 60, ${0.12 * intensity}) 0%, transparent 50%), ` +
            `radial-gradient(ellipse at 70% 80%, rgba(90, 20, 60, ${0.1 * intensity}) 0%, transparent 50%), ` +
            `linear-gradient(135deg, rgba(200, 30, 60, ${0.06 * intensity}) 0%, rgba(90, 20, 60, ${0.04 * intensity}) 50%, rgba(200, 30, 60, ${0.06 * intensity}) 100%)`,
        }}
      />

      {/* Edge glow */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded} overflow-hidden`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              `linear-gradient(180deg, rgba(200, 30, 60, ${0.1 * intensity}) 0%, transparent 40%), ` +
              `linear-gradient(0deg, rgba(200, 30, 60, ${0.1 * intensity}) 0%, transparent 40%), ` +
              `linear-gradient(90deg, rgba(200, 30, 60, ${0.08 * intensity}) 0%, transparent 30%), ` +
              `linear-gradient(270deg, rgba(200, 30, 60, ${0.08 * intensity}) 0%, transparent 30%)`,
          }}
        />
      </div>

      <DestructionRunes isVisible />

      {buttonMagicCirclePositions.map((mc, index) => (
        <MagicCircle
          key={index}
          x={mc.x}
          y={mc.y}
          size={mc.size}
          isVisible
          delay={mc.delay}
        />
      ))}

      {buttonParticlePositions.map((p, index) => (
        <DestructionParticle
          key={index}
          x={p.x}
          y={p.y}
          size={p.size}
          isVisible
          delay={p.delay}
        />
      ))}
    </>
  );
};
