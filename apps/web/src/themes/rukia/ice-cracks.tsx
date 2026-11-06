import * as m from "framer-motion/m";

// Ice crack lines
export const IceCracks = ({ isVisible }: { isVisible: boolean }) => (
  <m.svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    initial={{ opacity: 0 }}
    animate={{ opacity: isVisible ? 1 : 0 }}
    transition={{ duration: 0.3 }}
  >
    <m.path
      d="M50 50 L30 30 L20 35 M30 30 L25 20"
      fill="none"
      stroke="rgba(200, 230, 255, 0.4)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    />
    <m.path
      d="M50 50 L70 35 L80 40 M70 35 L75 25"
      fill="none"
      stroke="rgba(200, 230, 255, 0.35)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    />
    <m.path
      d="M50 50 L35 70 L30 80 M35 70 L25 75"
      fill="none"
      stroke="rgba(200, 230, 255, 0.3)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.55, delay: 0.35 }}
    />
    <m.path
      d="M50 50 L65 65 L75 70 M65 65 L70 80"
      fill="none"
      stroke="rgba(200, 230, 255, 0.35)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    />
  </m.svg>
);
