/* eslint-disable react-doctor/no-scale-from-zero -- These zero-scale elements are intentional point-origin decorative particles and SVG crystals, never text or controls; the rule explicitly permits point-origin illustration effects. */
import * as m from "framer-motion/m";

// Demonic runes that fade in on hover/active
export const DestructionRunes = ({ isVisible }: { isVisible: boolean }) => (
  <>
    {[
      { x: "12%", y: "75%", size: 10, delay: 0.1, rotate: 15 },
      { x: "78%", y: "22%", size: 9, delay: 0.25, rotate: -10 },
      { x: "45%", y: "15%", size: 8, delay: 0.35, rotate: 25 },
    ].map((rune) => (
      <m.div
        key={`${rune.x}:${rune.y}`}
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
      </m.div>
    ))}
  </>
);
