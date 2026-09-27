import type { FC, ReactNode } from "react";
import { PingIcon } from "./ping-icon";
import {
  PING_TONES,
  type PingIconName,
  type PingTone,
} from "./ping-presentation";

type PingBadgeProps = {
  /** Drawn around the badge, e.g. the ping's countdown. */
  children?: ReactNode;
  /** Adds the gold halo used when a ping names the local hero. */
  highlighted?: boolean;
  icon: PingIconName;
  size: number;
  tone: PingTone;
};

/** The round icon badge the map marker draws, as a DOM element. */
export const PingBadge: FC<PingBadgeProps> = ({
  children,
  highlighted = false,
  icon,
  size,
  tone,
}) => {
  const colors = PING_TONES[tone];

  return (
    <div
      className="ll:relative ll:flex ll:shrink-0 ll:items-center ll:justify-center ll:rounded-full"
      style={{
        background: `radial-gradient(circle at 50% 30%, ${colors.border}, ${colors.fill} 72%)`,
        boxShadow: [
          `inset 0 0 0 1px ${highlighted ? "#eddb5e" : colors.border}`,
          "0 0 0 1px #150f0d",
          `0 0 ${highlighted ? 12 : 7}px ${highlighted ? "#eddb5e" : colors.glow}`,
          "0 2px 4px rgba(0, 0, 0, 0.6)",
        ].join(", "),
        height: size,
        width: size,
        zIndex: 1,
      }}
    >
      {highlighted ? (
        <div
          aria-hidden="true"
          className="ll-battle-ping-radiate ll:pointer-events-none ll:absolute ll:inset-0 ll:rounded-full"
          style={{ boxShadow: "0 0 0 2px #eddb5e" }}
        />
      ) : null}
      {children}
      <PingIcon color="#ffffff" name={icon} size={Math.round(size * 0.6)} />
    </div>
  );
};
