import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";

// SVG Frost Filter - creates organic ice texture
const FrostFilter = () => (
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
const ScatteredCrystal = ({
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
const Snowflake = ({
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
const IceCracks = ({ isVisible }: { isVisible: boolean }) => (
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
const buttonCrystalPositions = [
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
const buttonSnowflakePositions = [
  { x: "25%", y: "30%", size: 14, delay: 0.4 },
  { x: "75%", y: "65%", size: 12, delay: 0.5 },
  { x: "60%", y: "20%", size: 10, delay: 0.45 },
  { x: "35%", y: "70%", size: 11, delay: 0.55 },
];

// Wind streaks that sweep across the screen
const WindStreaks = () => {
  const streaks = [
    { y: "15%", duration: 8, delay: 0, width: 200, opacity: 0.06 },
    { y: "35%", duration: 12, delay: 3, width: 300, opacity: 0.045 },
    { y: "55%", duration: 10, delay: 6, width: 250, opacity: 0.05 },
    { y: "75%", duration: 14, delay: 2, width: 180, opacity: 0.04 },
    { y: "25%", duration: 9, delay: 8, width: 220, opacity: 0.045 },
    { y: "65%", duration: 11, delay: 5, width: 280, opacity: 0.05 },
    { y: "85%", duration: 13, delay: 1, width: 160, opacity: 0.04 },
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
    { y: "92%", duration: 40, delay: 0, opacity: 0.03 },
    { y: "95%", duration: 35, delay: 10, opacity: 0.045 },
    { y: "88%", duration: 45, delay: 20, opacity: 0.02 },
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
const generateIceSparkles = () =>
  Array.from({ length: 20 }, (_, index) => ({
    id: index,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 10,
  }));

const iceSparkleConfigs = generateIceSparkles();

const IceSparkles = () => {
  return (
    <>
      {iceSparkleConfigs.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
            background: "rgba(255, 255, 255, 0.6)",
            boxShadow:
              "0 0 5px rgba(200, 230, 255, 0.6), 0 0 10px rgba(180, 220, 255, 0.3)",
          }}
          animate={{
            opacity: [0, 0.6, 0],
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

const getFrostPatchPlacement = (
  isX: boolean,
  isStart: boolean,
  pos: number,
) => {
  if (isX) {
    return {
      x: `${pos}%`,
      y: isStart ? "0px" : "auto",
      anchorX: "50%",
      anchorY: isStart ? "0%" : "100%",
    };
  }

  return {
    x: isStart ? "0px" : "auto",
    y: `${pos}%`,
    anchorX: isStart ? "0%" : "100%",
    anchorY: "50%",
  };
};

// Randomly generated frost patches along screen edges — irregular positions and sizes
const generateFrostPatches = () => {
  const patches: {
    x: string;
    y: string;
    w: number;
    h: number;
    anchorX: string;
    anchorY: string;
    opacity: number;
    scaleX: number;
    scaleY: number;
  }[] = [];

  const edges = [
    { side: "top", axis: "x" },
    { side: "bottom", axis: "x" },
    { side: "left", axis: "y" },
    { side: "right", axis: "y" },
  ] as const;

  for (const edge of edges) {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const pos = Math.random() * 100;
      const size = 80 + Math.random() * 160;
      const opacity = 0.08 + Math.random() * 0.1;
      const stretch = 0.5 + Math.random() * 1;

      const isX = edge.axis === "x";
      const isStart = edge.side === "top" || edge.side === "left";
      const placement = getFrostPatchPlacement(isX, isStart, pos);

      patches.push({
        ...placement,
        w: isX ? size * stretch : size,
        h: isX ? size : size * stretch,
        opacity,
        scaleX: isX ? stretch : 1,
        scaleY: isX ? 1 : stretch,
      });
    }
  }

  return patches;
};

const frostPatchConfigs = generateFrostPatches();

const FrostPatches = () => (
  <>
    {frostPatchConfigs.map((patch, i) => (
      <div
        key={i}
        className="absolute pointer-events-none"
        style={{
          left: patch.x === "auto" ? undefined : patch.x,
          right: patch.x === "auto" ? "0px" : undefined,
          top: patch.y === "auto" ? undefined : patch.y,
          bottom: patch.y === "auto" ? "0px" : undefined,
          width: patch.w,
          height: patch.h,
          transform: `translate(-50%, -50%) scale(${patch.scaleX}, ${patch.scaleY})`,
          background: `radial-gradient(ellipse at ${patch.anchorX} ${patch.anchorY}, rgba(220, 240, 255, ${patch.opacity}) 0%, transparent 60%)`,
          filter: "blur(20px)",
        }}
      />
    ))}
  </>
);

// Global ambient frost overlay for the entire app
export const GlobalFrostOverlay = () => (
  <motion.div
    className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 2, ease: "easeOut" }}
  >
    <FrostFilter />

    {/* Subtle frost texture on edges */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, rgba(200, 230, 255, 0.06) 0%, transparent 5%), " +
          "linear-gradient(0deg, rgba(200, 230, 255, 0.06) 0%, transparent 5%), " +
          "linear-gradient(90deg, rgba(200, 230, 255, 0.04) 0%, transparent 3%), " +
          "linear-gradient(270deg, rgba(200, 230, 255, 0.04) 0%, transparent 3%)",
      }}
    />

    {/* Irregular frost accumulation patches along edges */}
    <FrostPatches />

    {/* Wind streaks */}
    <WindStreaks />

    {/* Bottom frost mist */}
    <FrostMist />

    {/* Ice sparkles */}
    <IceSparkles />

    {/* Floating snowflakes across the screen */}
    <FloatingSnowflakes />
  </motion.div>
);

type FallingSnowflakeType = "simple" | "detailed" | "dot";

// Single falling snowflake with dynamic behavior
const FallingSnowflake = ({
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

const getSnowflakeSize = (isTiny: boolean, isLarge: boolean) => {
  if (isTiny) return 3 + Math.random() * 4;
  if (isLarge) return 14 + Math.random() * 6;
  return 8 + Math.random() * 6;
};

const getSnowflakeFallDuration = (isTiny: boolean, isLarge: boolean) => {
  if (isTiny) return 25 + Math.random() * 15;
  if (isLarge) return 35 + Math.random() * 15;
  return 28 + Math.random() * 12;
};

const getSnowflakeOpacity = (isTiny: boolean, isLarge: boolean) => {
  if (isTiny) return 0.1 + Math.random() * 0.1;
  if (isLarge) return 0.15 + Math.random() * 0.1;
  return 0.12 + Math.random() * 0.08;
};

const getSnowflakeType = (isTiny: boolean): FallingSnowflakeType => {
  if (isTiny) return "dot";
  if (Math.random() > 0.6) return "detailed";
  return "simple";
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
      size: getSnowflakeSize(isTiny, isLarge),
      fallDuration: getSnowflakeFallDuration(isTiny, isLarge),
      delay: Math.random() * 20,
      windStrength: 0.5 + Math.random() * 1.5,
      rotationSpeed: 15 + Math.random() * 25,
      rotateDirection: Math.random() > 0.5 ? 360 : -360,
      opacity: getSnowflakeOpacity(isTiny, isLarge),
      type: getSnowflakeType(isTiny),
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

// Generate random crystal positions around a circle — stable per mount
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
  const [isHovered, setIsHovered] = useState(false);
  const isAnimating = isActive || isHovered;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pulsing ice glow */}
      <motion.div
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

      {/* Frost overlay */}
      <motion.div
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
      </motion.div>

      {/* Ice crystals — randomly scattered, continuously animated */}
      {frozenCircleCrystals.map((crystal, i) => (
        <motion.div
          key={i}
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
            isAnimating
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
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Frozen wrapper for rectangular buttons — matches RukiaBorderGlow visual style
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
  const isFrozen = isHovered || isActive;

  return (
    <div
      className={`relative overflow-hidden ${rounded} flex flex-col ${className}`}
    >
      {isFrozen && (
        <>
          <FrostFilter />

          {/* Frost texture + edge frost — only on hover, skipped on active to keep text readable */}
          {!isActive && (
            <>
              <motion.div
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
              </motion.div>
            </>
          )}

          <IceCracks isVisible />

          {buttonCrystalPositions.map((crystal, index) => (
            <ScatteredCrystal
              key={index}
              x={crystal.x}
              y={crystal.y}
              size={crystal.size}
              rotation={crystal.rotation}
              isVisible
              delay={crystal.delay}
            />
          ))}

          {buttonSnowflakePositions.map((snowflake, index) => (
            <Snowflake
              key={index}
              x={snowflake.x}
              y={snowflake.y}
              size={snowflake.size}
              isVisible
              delay={snowflake.delay}
            />
          ))}

          {/* Ice glow border — outer glow only, no inset */}
          <motion.div
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
              <motion.div
                className={`absolute inset-0 ${rounded} pointer-events-none overflow-hidden`}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%)",
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
                className={`absolute inset-0 ${rounded} pointer-events-none border border-cyan-200/30`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            </>
          )}

          {/* Active burst (one-shot) */}
          {isActive && !subtle && (
            <motion.div
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

// Frost overlay for containers where we don't want to wrap content (e.g., sheets with close buttons)
// Styled like RukiaBorderGlow but static (always visible)
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
      <FrostFilter />

      {/* SVG frost texture */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded} overflow-hidden`}
        style={{ opacity: intensity }}
      >
        <div
          className="absolute inset-0"
          style={{
            filter: "url(#frost-noise)",
            background: "white",
          }}
        />
      </div>

      {/* Multi-gradient overlay */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded}`}
        style={{
          background:
            `radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, ${0.25 * intensity}) 0%, transparent 50%), ` +
            `radial-gradient(ellipse at 70% 80%, rgba(200, 230, 255, ${0.2 * intensity}) 0%, transparent 50%), ` +
            `linear-gradient(135deg, rgba(220, 240, 255, ${0.15 * intensity}) 0%, rgba(200, 230, 255, ${0.1 * intensity}) 50%, rgba(220, 240, 255, ${0.15 * intensity}) 100%)`,
        }}
      />

      {/* Edge frost */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded} overflow-hidden`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              `linear-gradient(180deg, rgba(255, 255, 255, ${0.2 * intensity}) 0%, transparent 40%), ` +
              `linear-gradient(0deg, rgba(255, 255, 255, ${0.2 * intensity}) 0%, transparent 40%), ` +
              `linear-gradient(90deg, rgba(255, 255, 255, ${0.15 * intensity}) 0%, transparent 30%), ` +
              `linear-gradient(270deg, rgba(255, 255, 255, ${0.15 * intensity}) 0%, transparent 30%)`,
          }}
        />
      </div>

      <IceCracks isVisible />

      {buttonCrystalPositions.map((crystal, index) => (
        <ScatteredCrystal
          key={index}
          x={crystal.x}
          y={crystal.y}
          size={crystal.size * intensity}
          rotation={crystal.rotation}
          isVisible
          delay={0}
        />
      ))}

      {buttonSnowflakePositions.map((snowflake, index) => (
        <Snowflake
          key={index}
          x={snowflake.x}
          y={snowflake.y}
          size={snowflake.size * intensity}
          isVisible
          delay={0}
        />
      ))}

      {/* Ice glow border */}
      <div
        className={`absolute inset-0 ${rounded} pointer-events-none`}
        style={{
          boxShadow: `inset 0 0 12px 3px rgba(200, 230, 255, ${0.4 * intensity}), 0 0 15px 3px rgba(180, 220, 255, ${0.3 * intensity})`,
        }}
      />
    </>
  );
};
