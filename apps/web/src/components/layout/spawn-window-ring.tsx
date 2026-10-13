import type { FC } from "react";
import { cn } from "cn";

const RADIUS = 6;

const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface SpawnWindowRingProps {
  minSpawnTimestamp: number;
  maxSpawnTimestamp: number;
  currentTimestamp: number;
}

/**
 * A dashed ring while the hero cannot spawn yet; once the window opens it
 * fills with the share of the window that has passed.
 */
export const SpawnWindowRing: FC<SpawnWindowRingProps> = ({
  minSpawnTimestamp,
  maxSpawnTimestamp,
  currentTimestamp,
}) => {
  const isWindowOpen = currentTimestamp >= minSpawnTimestamp;

  const windowProgress = isWindowOpen
    ? Math.min(
        (currentTimestamp - minSpawnTimestamp) /
          Math.max(maxSpawnTimestamp - minSpawnTimestamp, 1),
        1,
      )
    : 0;

  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 -rotate-90",
        isWindowOpen ? "text-signal-ready" : "text-signal-timer",
      )}
    >
      <circle
        cx="8"
        cy="8"
        r={RADIUS}
        fill="none"
        strokeWidth="2"
        stroke="currentColor"
        strokeDasharray={isWindowOpen ? undefined : "2 2.71"}
        className={isWindowOpen ? "opacity-20" : "opacity-60"}
      />
      {isWindowOpen && (
        <>
          <circle
            cx="8"
            cy="8"
            r={RADIUS}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={`${CIRCUMFERENCE * windowProgress} ${CIRCUMFERENCE}`}
            className="transition-[stroke-dasharray] duration-1000 ease-linear motion-reduce:transition-none"
          />
          <circle
            cx="8"
            cy="8"
            r="2"
            fill="currentColor"
            className="animate-glow-breathe motion-reduce:animate-none"
          />
        </>
      )}
    </svg>
  );
};
