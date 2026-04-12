import { motion } from "framer-motion";

export const FrozenSidebarBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[
      { x: "15%", y: "8%", size: 12, delay: 0 },
      { x: "80%", y: "15%", size: 10, delay: 2 },
      { x: "25%", y: "35%", size: 14, delay: 1 },
      { x: "70%", y: "45%", size: 11, delay: 3 },
      { x: "10%", y: "60%", size: 13, delay: 2 },
      { x: "85%", y: "70%", size: 9, delay: 1 },
      { x: "40%", y: "85%", size: 12, delay: 4 },
      { x: "60%", y: "92%", size: 10, delay: 2 },
    ].map((sf, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{ left: sf.x, top: sf.y }}
        animate={{
          y: [0, 8, 0],
          rotate: [0, 360],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          y: { duration: 6 + sf.delay, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <svg width={sf.size} height={sf.size} viewBox="0 0 24 24">
          <g fill="none" stroke="rgba(200, 230, 255, 0.4)" strokeWidth="1">
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

    {[
      { x: "5%", y: "20%", size: 8, rotation: 15 },
      { x: "92%", y: "40%", size: 10, rotation: -20 },
      { x: "8%", y: "75%", size: 9, rotation: 30 },
      { x: "88%", y: "88%", size: 7, rotation: -10 },
    ].map((crystal, i) => (
      <motion.div
        key={`crystal-${i}`}
        className="absolute"
        style={{
          left: crystal.x,
          top: crystal.y,
          transform: `rotate(${crystal.rotation}deg)`,
        }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width={crystal.size} height={crystal.size} viewBox="0 0 16 16">
          <path
            d="M8 0 L9 6 L15 6 L10 9 L12 16 L8 11 L4 16 L6 9 L1 6 L7 6 Z"
            fill="rgba(220, 240, 255, 0.5)"
            style={{ filter: "drop-shadow(0 0 2px rgba(180, 220, 255, 0.6))" }}
          />
        </svg>
      </motion.div>
    ))}
  </div>
);
