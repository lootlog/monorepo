import { motion } from "framer-motion";
import type { ReactNode } from "react";

// SVG Frost Filter - creates organic ice texture
export const FrostFilter = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <filter id="frost-noise" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.05"
          numOctaves="4"
          result="noise"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer result="frost">
          <feFuncA type="table" tableValues="0 0.08 0.15 0.12 0.08" />
        </feComponentTransfer>
        <feFlood floodColor="rgb(220, 240, 255)" result="color" />
        <feComposite in="color" in2="frost" operator="in" />
      </filter>
      <filter id="frost-noise-subtle" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.03"
          numOctaves="3"
          result="noise"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer result="frost">
          <feFuncA type="table" tableValues="0 0.03 0.06 0.04 0.02" />
        </feComponentTransfer>
        <feFlood floodColor="rgb(220, 240, 255)" result="color" />
        <feComposite in="color" in2="frost" operator="in" />
      </filter>
    </defs>
  </svg>
);

// Scattered ice crystal - can be placed anywhere
export const ScatteredCrystal = ({
  x,
  y,
  size,
  rotation,
  isVisible,
  delay,
}: {
  x: string;
  y: string;
  size: number;
  rotation: number;
  isVisible: boolean;
  delay: number;
}) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{
      left: x,
      top: y,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: isVisible ? 0.7 : 0,
      scale: isVisible ? 1 : 0,
    }}
    transition={{
      duration: 0.4,
      delay: isVisible ? delay : 0,
      ease: "easeOut",
    }}
  >
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path
        d="M8 0 L9 6 L15 6 L10 9 L12 16 L8 11 L4 16 L6 9 L1 6 L7 6 Z"
        fill="rgba(220, 240, 255, 0.6)"
        style={{
          filter: "drop-shadow(0 0 2px rgba(180, 220, 255, 0.9))",
        }}
      />
    </svg>
  </motion.div>
);

// Snowflake component
export const Snowflake = ({
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
    style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
    initial={{ opacity: 0, scale: 0, rotate: 0 }}
    animate={{
      opacity: isVisible ? 0.5 : 0,
      scale: isVisible ? 1 : 0,
      rotate: isVisible ? 360 : 0,
    }}
    transition={{
      opacity: { duration: 0.3, delay: isVisible ? delay : 0 },
      scale: { duration: 0.3, delay: isVisible ? delay : 0 },
      rotate: { duration: 8, repeat: Infinity, ease: "linear" },
    }}
  >
    <svg width={size} height={size} viewBox="0 0 24 24">
      <g fill="none" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1">
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
  </motion.div>
);

// Ice crack lines
export const IceCracks = ({ isVisible }: { isVisible: boolean }) => (
  <motion.svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    initial={{ opacity: 0 }}
    animate={{ opacity: isVisible ? 1 : 0 }}
    transition={{ duration: 0.3 }}
  >
    <motion.path
      d="M50 50 L30 30 L20 35 M30 30 L25 20"
      fill="none"
      stroke="rgba(200, 230, 255, 0.4)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    />
    <motion.path
      d="M50 50 L70 35 L80 40 M70 35 L75 25"
      fill="none"
      stroke="rgba(200, 230, 255, 0.35)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    />
    <motion.path
      d="M50 50 L35 70 L30 80 M35 70 L25 75"
      fill="none"
      stroke="rgba(200, 230, 255, 0.3)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.55, delay: 0.35 }}
    />
    <motion.path
      d="M50 50 L65 65 L75 70 M65 65 L70 80"
      fill="none"
      stroke="rgba(200, 230, 255, 0.35)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    />
  </motion.svg>
);

// Crystal positions for buttons
export const buttonCrystalPositions = [
  { x: "10%", y: "20%", size: 10, rotation: 0, delay: 0.1 },
  { x: "85%", y: "25%", size: 12, rotation: 30, delay: 0.15 },
  { x: "20%", y: "75%", size: 11, rotation: 60, delay: 0.2 },
  { x: "90%", y: "70%", size: 9, rotation: 15, delay: 0.25 },
  { x: "50%", y: "15%", size: 8, rotation: 45, delay: 0.18 },
  { x: "45%", y: "85%", size: 10, rotation: 20, delay: 0.22 },
  { x: "5%", y: "50%", size: 9, rotation: 75, delay: 0.28 },
  { x: "95%", y: "45%", size: 11, rotation: 10, delay: 0.3 },
  { x: "30%", y: "40%", size: 7, rotation: 50, delay: 0.35 },
  { x: "70%", y: "55%", size: 8, rotation: 25, delay: 0.38 },
];

// Snowflake positions for buttons
export const buttonSnowflakePositions = [
  { x: "25%", y: "30%", size: 14, delay: 0.4 },
  { x: "75%", y: "65%", size: 12, delay: 0.5 },
  { x: "60%", y: "20%", size: 10, delay: 0.45 },
  { x: "35%", y: "70%", size: 11, delay: 0.55 },
];

// Wind streaks that sweep across the screen
const WindStreaks = () => {
  const streaks = [
    { y: "15%", duration: 8, delay: 0, width: 200, opacity: 0.08 },
    { y: "35%", duration: 12, delay: 3, width: 300, opacity: 0.06 },
    { y: "55%", duration: 10, delay: 6, width: 250, opacity: 0.07 },
    { y: "75%", duration: 14, delay: 2, width: 180, opacity: 0.05 },
    { y: "25%", duration: 9, delay: 8, width: 220, opacity: 0.06 },
    { y: "65%", duration: 11, delay: 5, width: 280, opacity: 0.07 },
    { y: "85%", duration: 13, delay: 1, width: 160, opacity: 0.05 },
  ];

  return (
    <>
      {streaks.map((streak, i) => (
        <motion.div
          key={i}
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
          transition={{
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
          }}
        />
      ))}
    </>
  );
};

// Frost mist that drifts across the bottom
const FrostMist = () => {
  const mistLayers = [
    { y: "92%", duration: 40, delay: 0, opacity: 0.04 },
    { y: "95%", duration: 35, delay: 10, opacity: 0.06 },
    { y: "88%", duration: 45, delay: 20, opacity: 0.03 },
  ];

  return (
    <>
      {mistLayers.map((mist, i) => (
        <motion.div
          key={i}
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
          transition={{
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
          }}
        />
      ))}
    </>
  );
};

// Ice sparkles that appear and fade randomly
const IceSparkles = () => {
  const sparkles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 10,
  }));

  return (
    <>
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
            background: "rgba(255, 255, 255, 0.8)",
            boxShadow:
              "0 0 6px rgba(200, 230, 255, 0.8), 0 0 12px rgba(180, 220, 255, 0.4)",
          }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: sparkle.duration,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
};

// Global ambient frost overlay for the entire app
export const GlobalFrostOverlay = () => (
  <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
    <FrostFilter />

    {/* Subtle frost texture on edges */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, rgba(200, 230, 255, 0.08) 0%, transparent 5%), " +
          "linear-gradient(0deg, rgba(200, 230, 255, 0.08) 0%, transparent 5%), " +
          "linear-gradient(90deg, rgba(200, 230, 255, 0.06) 0%, transparent 3%), " +
          "linear-gradient(270deg, rgba(200, 230, 255, 0.06) 0%, transparent 3%)",
      }}
    />

    {/* Corner frost accumulation */}
    <div
      className="absolute top-0 left-0 w-32 h-32"
      style={{
        background:
          "radial-gradient(ellipse at 0% 0%, rgba(220, 240, 255, 0.12) 0%, transparent 70%)",
      }}
    />
    <div
      className="absolute top-0 right-0 w-32 h-32"
      style={{
        background:
          "radial-gradient(ellipse at 100% 0%, rgba(220, 240, 255, 0.12) 0%, transparent 70%)",
      }}
    />
    <div
      className="absolute bottom-0 left-0 w-32 h-32"
      style={{
        background:
          "radial-gradient(ellipse at 0% 100%, rgba(220, 240, 255, 0.10) 0%, transparent 70%)",
      }}
    />
    <div
      className="absolute bottom-0 right-0 w-32 h-32"
      style={{
        background:
          "radial-gradient(ellipse at 100% 100%, rgba(220, 240, 255, 0.10) 0%, transparent 70%)",
      }}
    />

    {/* Wind streaks */}
    <WindStreaks />

    {/* Bottom frost mist */}
    <FrostMist />

    {/* Ice sparkles */}
    <IceSparkles />

    {/* Floating snowflakes across the screen */}
    <FloatingSnowflakes />
  </div>
);

// Single falling snowflake with dynamic behavior
const FallingSnowflake = ({
  initialX,
  size,
  fallDuration,
  delay,
  windStrength,
  rotationSpeed,
  opacity,
  type,
}: {
  initialX: number;
  size: number;
  fallDuration: number;
  delay: number;
  windStrength: number;
  rotationSpeed: number;
  opacity: number;
  type: "simple" | "detailed" | "dot";
}) => {
  const rotateDirection = Math.random() > 0.5 ? 360 : -360;

  return (
    <motion.div
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
      transition={{
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
      }}
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
    </motion.div>
  );
};

// Generate snowflake configurations
const generateSnowflakes = () => {
  const snowflakes = [];
  const count = 35;

  for (let i = 0; i < count; i++) {
    const isTiny = i > count * 0.7;
    const isLarge = i < count * 0.2;

    snowflakes.push({
      id: i,
      initialX: Math.random() * 100,
      size: isTiny
        ? 3 + Math.random() * 4
        : isLarge
          ? 14 + Math.random() * 6
          : 8 + Math.random() * 6,
      fallDuration: isTiny
        ? 25 + Math.random() * 15
        : isLarge
          ? 35 + Math.random() * 15
          : 28 + Math.random() * 12,
      delay: Math.random() * 20,
      windStrength: 0.5 + Math.random() * 1.5,
      rotationSpeed: 15 + Math.random() * 25,
      opacity: isTiny
        ? 0.15 + Math.random() * 0.15
        : isLarge
          ? 0.2 + Math.random() * 0.15
          : 0.18 + Math.random() * 0.12,
      type: (isTiny ? "dot" : Math.random() > 0.6 ? "detailed" : "simple") as
        | "simple"
        | "detailed"
        | "dot",
    });
  }

  return snowflakes;
};

const snowflakeConfigs = generateSnowflakes();

// Floating snowflakes for ambient effect
const FloatingSnowflakes = () => {
  return (
    <>
      {snowflakeConfigs.map((sf) => (
        <FallingSnowflake key={sf.id} {...sf} />
      ))}
    </>
  );
};

// Frozen wrapper for circular elements (like avatars)
export const FrozenCircle = ({
  children,
  isHovered,
  isActive,
  size = 48,
}: {
  children: ReactNode;
  isHovered: boolean;
  isActive: boolean;
  size?: number;
}) => {
  const isFrozen = isHovered || isActive;

  return (
    <div className="relative">
      {/* Ice ring */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isFrozen ? 1 : 0,
          boxShadow: isFrozen
            ? "inset 0 0 10px 2px rgba(200, 230, 255, 0.5), 0 0 15px 3px rgba(180, 220, 255, 0.4)"
            : "none",
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Frost overlay */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle, rgba(220, 240, 255, 0.3) 0%, rgba(200, 230, 255, 0.15) 50%, transparent 70%)",
          }}
        />
      </motion.div>

      {/* Ice crystals around */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const radius = size / 2 + 4;
        const x = 50 + Math.cos(rad) * (radius / (size / 100));
        const y = 50 + Math.sin(rad) * (radius / (size / 100));
        return (
          <motion.div
            key={angle}
            className="absolute pointer-events-none"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: isFrozen ? 0.8 : 0,
              scale: isFrozen ? 1 : 0,
            }}
            transition={{
              duration: 0.3,
              delay: isFrozen ? i * 0.05 : 0,
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8">
              <path
                d="M4 0 L5 3 L8 3 L5.5 5 L6.5 8 L4 6 L1.5 8 L2.5 5 L0 3 L3 3 Z"
                fill="rgba(220, 240, 255, 0.7)"
                style={{
                  filter: "drop-shadow(0 0 1px rgba(180, 220, 255, 0.9))",
                }}
              />
            </svg>
          </motion.div>
        );
      })}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Ice crystal positions for FrozenButton - many scattered across surface
const frozenButtonCrystals = [
  // Edges
  { x: "5%", y: "15%", size: 7, rotation: 0, delay: 0.05 },
  { x: "95%", y: "20%", size: 8, rotation: 30, delay: 0.08 },
  { x: "8%", y: "85%", size: 6, rotation: 15, delay: 0.12 },
  { x: "92%", y: "80%", size: 7, rotation: 45, delay: 0.1 },
  // Top row
  { x: "20%", y: "10%", size: 5, rotation: 60, delay: 0.15 },
  { x: "40%", y: "8%", size: 6, rotation: 20, delay: 0.18 },
  { x: "60%", y: "12%", size: 5, rotation: 40, delay: 0.2 },
  { x: "80%", y: "10%", size: 6, rotation: 10, delay: 0.22 },
  // Bottom row
  { x: "15%", y: "90%", size: 5, rotation: 70, delay: 0.25 },
  { x: "35%", y: "92%", size: 6, rotation: 25, delay: 0.28 },
  { x: "55%", y: "88%", size: 5, rotation: 55, delay: 0.3 },
  { x: "75%", y: "90%", size: 6, rotation: 35, delay: 0.32 },
  // Middle scattered
  { x: "25%", y: "35%", size: 4, rotation: 80, delay: 0.35 },
  { x: "75%", y: "40%", size: 5, rotation: 5, delay: 0.38 },
  { x: "30%", y: "60%", size: 4, rotation: 50, delay: 0.4 },
  { x: "70%", y: "65%", size: 5, rotation: 65, delay: 0.42 },
  { x: "50%", y: "50%", size: 6, rotation: 22, delay: 0.45 },
  { x: "45%", y: "30%", size: 4, rotation: 75, delay: 0.48 },
  { x: "55%", y: "70%", size: 4, rotation: 12, delay: 0.5 },
  // Extra corners
  { x: "3%", y: "50%", size: 6, rotation: 90, delay: 0.52 },
  { x: "97%", y: "50%", size: 6, rotation: 0, delay: 0.55 },
];

// Snowflake positions for FrozenButton
const frozenButtonSnowflakes = [
  { x: "18%", y: "25%", size: 12, delay: 0.2 },
  { x: "82%", y: "30%", size: 10, delay: 0.25 },
  { x: "15%", y: "70%", size: 11, delay: 0.3 },
  { x: "85%", y: "65%", size: 12, delay: 0.35 },
  { x: "50%", y: "20%", size: 9, delay: 0.4 },
  { x: "50%", y: "80%", size: 10, delay: 0.45 },
  { x: "35%", y: "45%", size: 8, delay: 0.5 },
  { x: "65%", y: "55%", size: 9, delay: 0.55 },
];

// Frost particle dots
const frozenButtonFrostDots = [
  { x: "12%", y: "30%", size: 2, delay: 0.1 },
  { x: "88%", y: "35%", size: 2, delay: 0.12 },
  { x: "22%", y: "50%", size: 3, delay: 0.14 },
  { x: "78%", y: "55%", size: 2, delay: 0.16 },
  { x: "32%", y: "20%", size: 2, delay: 0.18 },
  { x: "68%", y: "25%", size: 3, delay: 0.2 },
  { x: "42%", y: "75%", size: 2, delay: 0.22 },
  { x: "58%", y: "80%", size: 2, delay: 0.24 },
  { x: "10%", y: "65%", size: 3, delay: 0.26 },
  { x: "90%", y: "70%", size: 2, delay: 0.28 },
  { x: "38%", y: "40%", size: 2, delay: 0.3 },
  { x: "62%", y: "45%", size: 3, delay: 0.32 },
  { x: "28%", y: "85%", size: 2, delay: 0.34 },
  { x: "72%", y: "15%", size: 2, delay: 0.36 },
  { x: "48%", y: "60%", size: 3, delay: 0.38 },
  { x: "52%", y: "35%", size: 2, delay: 0.4 },
];

// Frozen wrapper for rectangular buttons
export const FrozenButton = ({
  children,
  isHovered,
  isActive,
  className = "",
  subtle = false,
  rounded = "rounded-xl",
}: {
  children: ReactNode;
  isHovered: boolean;
  isActive: boolean;
  className?: string;
  subtle?: boolean;
  rounded?: string;
}) => {
  const isFrozen = isHovered || isActive;
  const intensity = subtle ? 0.35 : 1;

  return (
    <div
      className={`relative overflow-hidden ${rounded} flex flex-col ${className}`}
    >
      {/* Frost overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: subtle
            ? "linear-gradient(135deg, rgba(220, 240, 255, 0.06) 0%, rgba(200, 230, 255, 0.03) 50%, rgba(220, 240, 255, 0.05) 100%)"
            : "linear-gradient(135deg, rgba(220, 240, 255, 0.2) 0%, rgba(200, 230, 255, 0.1) 50%, rgba(220, 240, 255, 0.15) 100%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      />

      {/* Edge frost */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: subtle
            ? "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 30%), " +
              "linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, transparent 20%), " +
              "linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0%, transparent 15%), " +
              "linear-gradient(270deg, rgba(255, 255, 255, 0.03) 0%, transparent 15%)"
            : "linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 30%), " +
              "linear-gradient(0deg, rgba(255, 255, 255, 0.1) 0%, transparent 20%), " +
              "linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, transparent 15%), " +
              "linear-gradient(270deg, rgba(255, 255, 255, 0.1) 0%, transparent 15%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Ice glow border */}
      <motion.div
        className={`absolute inset-0 ${rounded} pointer-events-none`}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isFrozen ? 1 : 0,
          boxShadow: isFrozen
            ? subtle
              ? "inset 0 0 8px 1px rgba(200, 230, 255, 0.15), 0 0 10px 2px rgba(180, 220, 255, 0.08)"
              : "inset 0 0 8px 1px rgba(200, 230, 255, 0.4), 0 0 10px 2px rgba(180, 220, 255, 0.25)"
            : "none",
        }}
        transition={{ duration: 0.25 }}
      />

      {/* Ice crystals scattered across */}
      {frozenButtonCrystals.map((crystal, i) => (
        <motion.div
          key={`crystal-${i}`}
          className="absolute pointer-events-none"
          style={{
            left: crystal.x,
            top: crystal.y,
            transform: `translate(-50%, -50%) rotate(${crystal.rotation}deg)`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: isFrozen ? 0.7 * intensity : 0,
            scale: isFrozen ? 1 : 0,
          }}
          transition={{
            duration: 0.3,
            delay: isFrozen ? crystal.delay : 0,
          }}
        >
          <svg width={crystal.size} height={crystal.size} viewBox="0 0 8 8">
            <path
              d="M4 0 L5 3 L8 3 L5.5 5 L6.5 8 L4 6 L1.5 8 L2.5 5 L0 3 L3 3 Z"
              fill={`rgba(220, 240, 255, ${0.7 * intensity})`}
              style={{
                filter: `drop-shadow(0 0 1px rgba(180, 220, 255, ${0.8 * intensity}))`,
              }}
            />
          </svg>
        </motion.div>
      ))}

      {/* Snowflakes */}
      {frozenButtonSnowflakes.map((sf, i) => (
        <motion.div
          key={`snowflake-${i}`}
          className="absolute pointer-events-none"
          style={{
            left: sf.x,
            top: sf.y,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{
            opacity: isFrozen ? 0.5 * intensity : 0,
            scale: isFrozen ? 1 : 0,
            rotate: isFrozen ? 360 : 0,
          }}
          transition={{
            opacity: { duration: 0.3, delay: isFrozen ? sf.delay : 0 },
            scale: { duration: 0.3, delay: isFrozen ? sf.delay : 0 },
            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
          }}
        >
          <svg width={sf.size} height={sf.size} viewBox="0 0 24 24">
            <g
              fill="none"
              stroke={`rgba(255, 255, 255, ${0.6 * intensity})`}
              strokeWidth="1"
            >
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
              <line x1="12" y1="2" x2="10" y2="5" />
              <line x1="12" y1="2" x2="14" y2="5" />
              <line x1="12" y1="22" x2="10" y2="19" />
              <line x1="12" y1="22" x2="14" y2="19" />
            </g>
          </svg>
        </motion.div>
      ))}

      {/* Frost particle dots */}
      {frozenButtonFrostDots.map((dot, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
            background: `rgba(220, 240, 255, ${0.8 * intensity})`,
            boxShadow: `0 0 3px rgba(200, 230, 255, ${0.6 * intensity})`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: isFrozen ? 0.6 * intensity : 0,
            scale: isFrozen ? 1 : 0,
          }}
          transition={{
            duration: 0.2,
            delay: isFrozen ? dot.delay : 0,
          }}
        />
      ))}

      {/* Ice crack lines */}
      <motion.svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? intensity : 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.path
          d="M50 50 L25 25 L15 30 M25 25 L20 15"
          fill="none"
          stroke={`rgba(200, 230, 255, ${0.3 * intensity})`}
          strokeWidth="0.4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isFrozen ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        />
        <motion.path
          d="M50 50 L75 30 L85 35 M75 30 L80 20"
          fill="none"
          stroke={`rgba(200, 230, 255, ${0.25 * intensity})`}
          strokeWidth="0.4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isFrozen ? 1 : 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        />
        <motion.path
          d="M50 50 L30 75 L25 85 M30 75 L18 78"
          fill="none"
          stroke={`rgba(200, 230, 255, ${0.25 * intensity})`}
          strokeWidth="0.4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isFrozen ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        />
        <motion.path
          d="M50 50 L70 70 L82 75 M70 70 L75 85"
          fill="none"
          stroke={`rgba(200, 230, 255, ${0.3 * intensity})`}
          strokeWidth="0.4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isFrozen ? 1 : 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        />
      </motion.svg>

      {/* Active state shimmer */}
      {isActive && !subtle && (
        <motion.div
          className={`absolute inset-0 pointer-events-none overflow-hidden ${rounded}`}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.4) 50%, transparent 60%)",
            }}
            animate={{ x: ["-200%", "200%"] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1.5,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 min-h-0">{children}</div>
    </div>
  );
};

// Frost overlay for containers where we don't want to wrap content (e.g., sheets with close buttons)
export const FrostOverlay = ({
  subtle = false,
  rounded = "rounded-xl",
}: {
  subtle?: boolean;
  rounded?: string;
}) => {
  const intensity = subtle ? 0.35 : 1;

  return (
    <>
      {/* Frost overlay */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded}`}
        style={{
          background: subtle
            ? "linear-gradient(135deg, rgba(220, 240, 255, 0.06) 0%, rgba(200, 230, 255, 0.03) 50%, rgba(220, 240, 255, 0.05) 100%)"
            : "linear-gradient(135deg, rgba(220, 240, 255, 0.2) 0%, rgba(200, 230, 255, 0.1) 50%, rgba(220, 240, 255, 0.15) 100%)",
        }}
      />

      {/* Edge frost */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded}`}
        style={{
          background: subtle
            ? "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 30%), " +
              "linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, transparent 20%), " +
              "linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0%, transparent 15%), " +
              "linear-gradient(270deg, rgba(255, 255, 255, 0.03) 0%, transparent 15%)"
            : "linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 30%), " +
              "linear-gradient(0deg, rgba(255, 255, 255, 0.1) 0%, transparent 20%), " +
              "linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, transparent 15%), " +
              "linear-gradient(270deg, rgba(255, 255, 255, 0.1) 0%, transparent 15%)",
        }}
      />

      {/* Ice glow border */}
      <div
        className={`absolute inset-0 ${rounded} pointer-events-none`}
        style={{
          boxShadow: subtle
            ? "inset 0 0 8px 1px rgba(200, 230, 255, 0.15), 0 0 10px 2px rgba(180, 220, 255, 0.08)"
            : "inset 0 0 8px 1px rgba(200, 230, 255, 0.4), 0 0 10px 2px rgba(180, 220, 255, 0.25)",
        }}
      />

      {/* Scattered ice crystals */}
      {frozenButtonCrystals.slice(0, 12).map((crystal, i) => (
        <div
          key={`crystal-${i}`}
          className="absolute pointer-events-none"
          style={{
            left: crystal.x,
            top: crystal.y,
            transform: `translate(-50%, -50%) rotate(${crystal.rotation}deg)`,
            opacity: 0.7 * intensity,
          }}
        >
          <svg width={crystal.size} height={crystal.size} viewBox="0 0 8 8">
            <path
              d="M4 0 L5 3 L8 3 L5.5 5 L6.5 8 L4 6 L1.5 8 L2.5 5 L0 3 L3 3 Z"
              fill={`rgba(220, 240, 255, ${0.7 * intensity})`}
              style={{
                filter: `drop-shadow(0 0 1px rgba(180, 220, 255, ${0.8 * intensity}))`,
              }}
            />
          </svg>
        </div>
      ))}

      {/* Snowflakes */}
      {frozenButtonSnowflakes.slice(0, 4).map((sf, i) => (
        <motion.div
          key={`snowflake-${i}`}
          className="absolute pointer-events-none"
          style={{
            left: sf.x,
            top: sf.y,
            transform: "translate(-50%, -50%)",
            opacity: 0.5 * intensity,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <svg width={sf.size} height={sf.size} viewBox="0 0 24 24">
            <g
              fill="none"
              stroke={`rgba(255, 255, 255, ${0.6 * intensity})`}
              strokeWidth="1"
            >
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
            </g>
          </svg>
        </motion.div>
      ))}

      {/* Frost particle dots */}
      {frozenButtonFrostDots.slice(0, 8).map((dot, i) => (
        <div
          key={`dot-${i}`}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
            background: `rgba(220, 240, 255, ${0.8 * intensity})`,
            boxShadow: `0 0 3px rgba(200, 230, 255, ${0.6 * intensity})`,
            opacity: 0.6 * intensity,
          }}
        />
      ))}
    </>
  );
};
