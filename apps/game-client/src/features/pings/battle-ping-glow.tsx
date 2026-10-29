import type { FC } from "react";

type BattlePingGlowProps = {
  /** A six-digit hex colour. */
  color: string;
};

/**
 * Light behind the warrior's sprite in a ping's colour. It stays a static
 * layer of its own: a filter on the game's sprite would blur the canvas the
 * game redraws on every frame again on every frame.
 */
export const BattlePingGlow: FC<BattlePingGlowProps> = ({ color }) => (
  <div
    aria-hidden="true"
    className="ll:pointer-events-none ll:absolute"
    style={{
      background: `radial-gradient(closest-side, ${color}a6, ${color}40 65%, ${color}00)`,
      inset: -4,
      zIndex: -1,
    }}
  />
);
