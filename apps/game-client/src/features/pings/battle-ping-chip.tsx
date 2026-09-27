import type { ComponentProps, FC } from "react";
import { PingBadge } from "./ping-badge";
import { PingBadgeRing } from "./ping-badge-ring";
import { PingPill } from "./ping-pill";
import {
  PING_TONES,
  type PingIconName,
  type PingTone,
} from "./ping-presentation";

const BADGE_SIZE = 22;

type BattlePingChipProps = {
  /** Drains the badge's ring while the ping lasts. */
  countdown?: ComponentProps<typeof PingBadgeRing>["countdown"];
  highlighted?: boolean;
  icon: PingIconName;
  label: string;
  senderName: string;
  tone: PingTone;
};

/**
 * One battle ping above a warrior: the icon badge docked onto the game's
 * popup-menu plate, reading "sender · ping" like the map marker.
 */
export const BattlePingChip: FC<BattlePingChipProps> = ({
  countdown,
  highlighted = false,
  icon,
  label,
  senderName,
  tone,
}) => (
  <div className="ll-battle-ping-drop ll:flex ll:items-center">
    <PingBadge
      highlighted={highlighted}
      icon={icon}
      size={BADGE_SIZE}
      tone={tone}
    >
      <PingBadgeRing
        color={PING_TONES[tone].glow}
        countdown={countdown}
        size={BADGE_SIZE + 6}
      />
    </PingBadge>
    <PingPill
      highlighted={highlighted}
      style={{ marginLeft: -9, paddingLeft: 13 }}
    >
      <span>{senderName}</span>
      <span className="ll:font-normal" style={{ color: "#bebebe" }}>
        ·
      </span>
      <span style={{ color: PING_TONES[tone].glow }}>{label}</span>
    </PingPill>
  </div>
);
