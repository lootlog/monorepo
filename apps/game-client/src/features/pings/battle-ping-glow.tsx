import type { FC } from "react";

type BattlePingGlowProps = {
  color: string;
};

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
