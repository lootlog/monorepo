import type { FC } from "react";

type BattlePingGroundProps = {
  /** A six-digit hex colour. */
  color: string;
};

/**
 * A pool of light under the warrior's feet with a ring that pulses outwards,
 * like the map marker's ground ellipse. It sits where the game draws its own
 * `.selector` and stays behind the sprite.
 */
export const BattlePingGround: FC<BattlePingGroundProps> = ({ color }) => (
  <div
    aria-hidden="true"
    className="ll:pointer-events-none ll:absolute ll:left-1/2"
    style={{
      background: `radial-gradient(closest-side, ${color}73, ${color}00)`,
      bottom: -12,
      height: 26,
      transform: "translateX(-50%)",
      width: "calc(100% + 18px)",
      zIndex: -2,
    }}
  >
    <svg
      className="ll:absolute ll:inset-0 ll:size-full ll:overflow-visible"
      preserveAspectRatio="none"
      viewBox="0 0 100 26"
    >
      <ellipse
        cx={50}
        cy={13}
        fill="none"
        rx={46}
        ry={10}
        stroke={color}
        strokeWidth={2}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        vectorEffect="non-scaling-stroke"
      />
      <ellipse
        className="ll-battle-ping-ground-pulse"
        cx={50}
        cy={13}
        fill="none"
        rx={46}
        ry={10}
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  </div>
);
