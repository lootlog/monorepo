import { motion } from "framer-motion";

export const RiasSidebarBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {/* Floating destruction particles */}
    {[
      { x: "15%", y: "12%", size: 4, delay: 0 },
      { x: "82%", y: "20%", size: 3, delay: 1.5 },
      { x: "25%", y: "40%", size: 5, delay: 0.8 },
      { x: "70%", y: "55%", size: 3.5, delay: 2.2 },
      { x: "12%", y: "65%", size: 4, delay: 1 },
      { x: "85%", y: "78%", size: 3, delay: 0.5 },
      { x: "45%", y: "88%", size: 4.5, delay: 1.8 },
      { x: "60%", y: "95%", size: 3, delay: 2.5 },
    ].map((p, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{ left: p.x, top: p.y }}
        animate={{
          y: [0, -6, 0],
          opacity: [0.2, 0.45, 0.2],
          scale: [0.8, 1.1, 0.8],
        }}
        transition={{
          y: {
            duration: 5 + p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          },
          opacity: {
            duration: 3 + p.delay * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          },
          scale: {
            duration: 4 + p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        <div
          style={{
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(200, 30, 60, 0.7) 0%, transparent 70%)",
            boxShadow: "0 0 4px rgba(200, 30, 60, 0.3)",
          }}
        />
      </motion.div>
    ))}

    {/* Small rotating magic circles */}
    {[
      { x: "8%", y: "25%", size: 16, rotation: 15, duration: 15 },
      { x: "90%", y: "50%", size: 14, rotation: -20, duration: 20 },
      { x: "10%", y: "80%", size: 12, rotation: 30, duration: 18 },
    ].map((mc, i) => (
      <motion.div
        key={`mc-${i}`}
        className="absolute"
        style={{
          left: mc.x,
          top: mc.y,
        }}
        animate={{
          rotate: [mc.rotation, mc.rotation + 360],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          rotate: {
            duration: mc.duration,
            repeat: Infinity,
            ease: "linear",
          },
          opacity: {
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        <svg width={mc.size} height={mc.size} viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="rgba(200, 30, 60, 0.5)"
            strokeWidth="0.6"
          />
          <circle
            cx="12"
            cy="12"
            r="6"
            fill="none"
            stroke="rgba(200, 30, 60, 0.3)"
            strokeWidth="0.4"
          />
          <polygon
            points="12,3 14,9 20,9.5 15.5,13 17,20 12,16.5 7,20 8.5,13 4,9.5 10,9"
            fill="none"
            stroke="rgba(200, 30, 60, 0.25)"
            strokeWidth="0.4"
          />
        </svg>
      </motion.div>
    ))}
  </div>
);
