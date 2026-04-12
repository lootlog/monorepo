import { motion } from "framer-motion";

export const SidebarMagicCircle = () => (
  <div className="flex items-center justify-center py-4 mt-auto pointer-events-none">
    <motion.svg
      viewBox="0 0 200 200"
      fill="none"
      className="w-32 h-32"
      style={{
        filter: "drop-shadow(0 0 8px rgba(200, 30, 60, 0.3))",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
    >
      {/* Outer ring */}
      <circle
        cx="100"
        cy="100"
        r="95"
        stroke="rgba(200, 30, 60, 0.25)"
        strokeWidth="1"
      />
      <circle
        cx="100"
        cy="100"
        r="90"
        stroke="rgba(200, 30, 60, 0.15)"
        strokeWidth="0.5"
        strokeDasharray="4 3"
      />

      {/* Middle ring */}
      <circle
        cx="100"
        cy="100"
        r="75"
        stroke="rgba(200, 30, 60, 0.2)"
        strokeWidth="0.8"
      />

      {/* Pentagram star — 5 points evenly on r=75 circle */}
      <polygon
        points="100,25 144.1,160.7 28.7,76.8 171.3,76.8 55.9,160.7"
        stroke="rgba(200, 30, 60, 0.18)"
        strokeWidth="0.8"
        fill="none"
        strokeLinejoin="round"
      />

      {/* Inner hexagon — 6 points evenly on r=35 circle */}
      <polygon
        points="100,65 130.3,82.5 130.3,117.5 100,135 69.7,117.5 69.7,82.5"
        stroke="rgba(200, 30, 60, 0.14)"
        strokeWidth="0.6"
        fill="none"
      />

      {/* Inner circle */}
      <circle
        cx="100"
        cy="100"
        r="55"
        stroke="rgba(200, 30, 60, 0.12)"
        strokeWidth="0.5"
      />

      {/* Center circle with glow */}
      <circle
        cx="100"
        cy="100"
        r="18"
        stroke="rgba(200, 30, 60, 0.2)"
        strokeWidth="0.6"
      />
      <circle
        cx="100"
        cy="100"
        r="8"
        fill="rgba(200, 30, 60, 0.08)"
        stroke="rgba(200, 30, 60, 0.15)"
        strokeWidth="0.5"
      />

      {/* Cardinal rune marks */}
      <line
        x1="100"
        y1="2"
        x2="100"
        y2="10"
        stroke="rgba(200, 30, 60, 0.2)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="100"
        y1="190"
        x2="100"
        y2="198"
        stroke="rgba(200, 30, 60, 0.2)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="2"
        y1="100"
        x2="10"
        y2="100"
        stroke="rgba(200, 30, 60, 0.2)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="190"
        y1="100"
        x2="198"
        y2="100"
        stroke="rgba(200, 30, 60, 0.2)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Diagonal marks */}
      <line
        x1="17"
        y1="17"
        x2="23"
        y2="23"
        stroke="rgba(200, 30, 60, 0.12)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <line
        x1="177"
        y1="17"
        x2="183"
        y2="23"
        stroke="rgba(200, 30, 60, 0.12)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="183"
        x2="23"
        y2="177"
        stroke="rgba(200, 30, 60, 0.12)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <line
        x1="177"
        y1="183"
        x2="183"
        y2="177"
        stroke="rgba(200, 30, 60, 0.12)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </motion.svg>
  </div>
);
