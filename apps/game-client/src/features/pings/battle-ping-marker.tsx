import { getLootlogHostPortalThemeClassName } from "@/components/ui/theme-boundary";
import type { FC } from "react";
import { BattlePingGlow } from "./battle-ping-glow";
import { BattlePingGround } from "./battle-ping-ground";
import { BattlePingIcon } from "./battle-ping-icon";
import type { BattlePingMark, BattlePingTarget } from "./battle-ping-store";
import { PING_TONES, getPingPresentation } from "./ping-presentation";
import { useAnimationEffects } from "@/hooks/use-animation-effects";

const HIGHLIGHT_GLOW = "#ffffff";

type BattlePingMarkerProps = {
  highlighted: boolean;
  mark: BattlePingMark | undefined;
  target: BattlePingTarget | undefined;
};

export const BattlePingMarker: FC<BattlePingMarkerProps> = ({
  highlighted,
  mark,
  target,
}) => {
  const pulse = useAnimationEffects();

  const attack = getPingPresentation("attack");
  const markPresentation = mark ? getPingPresentation(mark.type) : null;
  const targetColor = target ? PING_TONES[attack.tone].glow : null;

  const glow = highlighted ? HIGHLIGHT_GLOW : targetColor;

  return (
    <div
      className={`${getLootlogHostPortalThemeClassName()} ll:contents${pulse ? "" : " ll-battle-ping-still"}`}
    >
      {targetColor ? <BattlePingGround color={targetColor} /> : null}
      {glow ? <BattlePingGlow color={glow} /> : null}
      <div
        className="ll:pointer-events-none ll:absolute ll:right-0 ll:top-0.5 ll:flex ll:flex-col ll:gap-[3px]"
        style={{ transform: "translateX(50%)", zIndex: 10 }}
      >
        {target ? (
          <BattlePingIcon
            icon={attack.icon}
            key={`target-${target.entryId}`}
            tone={attack.tone}
          />
        ) : null}
        {mark && markPresentation ? (
          <BattlePingIcon
            countdown={
              pulse
                ? {
                    durationMs: markPresentation.durationMs,
                    expiresAt: mark.expiresAt,
                  }
                : undefined
            }
            highlighted={mark.forMe}
            icon={markPresentation.icon}
            key={mark.entryId}
            tone={markPresentation.tone}
          />
        ) : null}
      </div>
    </div>
  );
};
