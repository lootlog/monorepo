import { useEffect, useRef, type ComponentProps, type FC } from "react";
import { PingBadge } from "./ping-badge";
import { PingBadgeRing } from "./ping-badge-ring";
import {
  PING_TONES,
  type PingIconName,
  type PingTone,
} from "./ping-presentation";

const BADGE_SIZE = 16;

/** How long an expiring icon takes to fade out at the end of its countdown. */
const FADE_OUT_MS = 400;

type BattlePingIconProps = {
  /** Drains the badge's ring and fades the icon out as the ping ends. */
  countdown?: ComponentProps<typeof PingBadgeRing>["countdown"];
  highlighted?: boolean;
  icon: PingIconName;
  tone: PingTone;
};

/**
 * One battle ping on a warrior: only its icon badge, so it never covers the
 * fight. Who sent it and why is in the battle ping window.
 */
export const BattlePingIcon: FC<BattlePingIconProps> = ({
  countdown,
  highlighted = false,
  icon,
  tone,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const expiresAt = countdown?.expiresAt;

  useEffect(() => {
    const element = ref.current;

    if (!element || expiresAt === undefined) return;

    const remainingMs = expiresAt - performance.now();

    if (remainingMs <= 0) return;

    const fade = element.animate([{ opacity: 1 }, { opacity: 0 }], {
      delay: Math.max(0, remainingMs - FADE_OUT_MS),
      duration: Math.min(FADE_OUT_MS, remainingMs),
      fill: "forwards",
    });

    return () => fade.cancel();
  }, [expiresAt]);

  return (
    <div className="ll-battle-ping-pop" ref={ref}>
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
    </div>
  );
};
