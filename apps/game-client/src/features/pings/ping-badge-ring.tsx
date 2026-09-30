import { getCountdownRingEasing } from "@/lib/countdown-ring-easing";
import { useEffect, useRef, type FC } from "react";

type PingBadgeRingProps = {
  color: string;
  /** Drains the ring while the ping lasts; without it the ring stays full. */
  countdown?: {
    durationMs: number;
    /** `performance.now()` time the ping expires at. */
    expiresAt: number;
  };
  size: number;
};

const STROKE = 2;

/**
 * A ring around a badge. A countdown is one Web Animation of the dash offset,
 * so the marker never re-renders for it.
 */
export const PingBadgeRing: FC<PingBadgeRingProps> = ({
  color,
  countdown,
  size,
}) => {
  const ringRef = useRef<SVGCircleElement>(null);
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const durationMs = countdown?.durationMs;
  const expiresAt = countdown?.expiresAt;

  useEffect(() => {
    const ring = ringRef.current;

    if (!ring || durationMs === undefined || expiresAt === undefined) return;

    const remainingMs = Math.min(durationMs, expiresAt - performance.now());

    if (remainingMs <= 0) return;

    const animation = ring.animate(
      [
        {
          strokeDashoffset: String(
            circumference * (1 - remainingMs / durationMs),
          ),
        },
        { strokeDashoffset: String(circumference) },
      ],
      {
        duration: remainingMs,
        easing: getCountdownRingEasing(remainingMs),
        fill: "forwards",
      },
    );

    return () => animation.cancel();
  }, [circumference, durationMs, expiresAt]);

  return (
    <svg
      aria-hidden="true"
      className="ll:pointer-events-none ll:absolute ll:left-1/2 ll:top-1/2 ll:-rotate-90"
      height={size}
      style={{ margin: -size / 2 }}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke="#150f0d"
        strokeOpacity={0.7}
        strokeWidth={STROKE}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        ref={ringRef}
        stroke={color}
        strokeDasharray={circumference}
        strokeLinecap="round"
        strokeWidth={STROKE}
      />
    </svg>
  );
};
