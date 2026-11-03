import { m } from "framer-motion";
import { useState } from "react";

const DOT_COLORS = [
  "var(--color-pink-500)",
  "var(--color-pink-300)",
  "var(--color-violet-400)",
  "var(--color-sky-400)",
  "var(--color-emerald-300)",
  "var(--color-amber-300)",
];

const DOTS_PER_RING = 7;

const BURST_EASE = [0.15, 0.85, 0.35, 1] as const;

type Dot = {
  key: string;
  size: number;
  color: string;
  x: [number, number, number];
  y: [number, number, number];
  duration: number;
};

// Two offset rings of dots, the inner one smaller, flying out from the heart.
const createDots = (size: number): Dot[] =>
  [
    { scale: 0.12, reach: 1.15, offset: 0, colorShift: 0 },
    { scale: 0.09, reach: 0.95, offset: 0.28, colorShift: 3 },
  ].flatMap((ring, ringIndex) =>
    Array.from({ length: DOTS_PER_RING }, (_, index) => {
      const angle =
        (index / DOTS_PER_RING) * Math.PI * 2 - Math.PI / 2 + ring.offset;

      const end = size * (ring.reach + Math.random() * 0.3);

      const at = (distance: number) =>
        [Math.cos(angle) * distance, Math.sin(angle) * distance] as const;

      const [x0, y0] = at(size * 0.4);
      const [x1, y1] = at(end * 0.85);
      const [x2, y2] = at(end);

      return {
        key: `${ringIndex}-${index}`,
        size: Math.max(2.5, size * ring.scale),
        color: DOT_COLORS[(index + ring.colorShift) % DOT_COLORS.length] ?? "",
        x: [x0, x1, x2],
        y: [y0, y1, y2],
        duration: 0.7 + Math.random() * 0.2,
      };
    }),
  );

/**
 * The ring and dots around a heart that was just liked. Mount it with a new
 * key for every like; it ends invisible, so it needs no unmounting.
 */
export const LikeBurst = ({ size }: { size: number }) => {
  const [dots] = useState(() => createDots(size));
  // The outer edge of a ring stroke centred on 0.9 of the heart's size.
  const ringRadius = size * 0.9 + size * 0.225;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <m.span
        className="absolute top-1/2 left-1/2 rounded-full border-violet-400"
        style={{
          width: ringRadius * 2,
          height: ringRadius * 2,
          marginLeft: -ringRadius,
          marginTop: -ringRadius,
          borderWidth: size * 0.45,
        }}
        initial={{ scale: 0.3, opacity: 1 }}
        animate={{ scale: 1, opacity: 0 }}
        transition={{ duration: 0.48, ease: [0.2, 0.8, 0.3, 1] }}
      />
      {dots.map((dot) => (
        <m.span
          key={dot.key}
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{
            width: dot.size,
            height: dot.size,
            marginLeft: -dot.size / 2,
            marginTop: -dot.size / 2,
            backgroundColor: dot.color,
          }}
          initial={{ x: dot.x[0], y: dot.y[0], scale: 0.4, opacity: 0 }}
          animate={{
            x: dot.x,
            y: dot.y,
            scale: [0.4, 1.1, 0],
            opacity: [1, 1, 0.6],
          }}
          transition={{
            duration: dot.duration,
            delay: 0.18,
            ease: BURST_EASE,
            times: [0, 0.55, 1],
          }}
        />
      ))}
    </span>
  );
};
