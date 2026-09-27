import { getLootlogHostPortalThemeClassName } from "@/components/ui/theme-boundary";
import { useSettingsStore } from "@/store/settings.store";
import { useEffect, type FC } from "react";
import { BattlePingGround } from "./battle-ping-ground";
import { BattlePingIcon } from "./battle-ping-icon";
import type { BattlePingMark, BattlePingTarget } from "./battle-ping-store";
import { glowBattleWarrior } from "./battle-warriors";
import { PING_TONES, getPingPresentation } from "./ping-presentation";
import { usePingPulse } from "./use-ping-pulse";

/** Picks out the warrior of the history entry under the pointer. */
const HIGHLIGHT_GLOW = "#ffffff";

type BattlePingMarkerProps = {
  /** The game's warrior element this marker is portalled into. */
  element: HTMLElement;
  /** A history entry about this warrior is under the pointer. */
  highlighted: boolean;
  mark: BattlePingMark | undefined;
  target: BattlePingTarget | undefined;
};

/** Rendered inside the warrior element, so it follows the battle scaling. */
export const BattlePingMarker: FC<BattlePingMarkerProps> = ({
  element,
  highlighted,
  mark,
  target,
}) => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  const pulse = usePingPulse();

  const attack = getPingPresentation("attack");
  const markPresentation = mark ? getPingPresentation(mark.type) : null;
  const targetColor = target ? PING_TONES[attack.tone].glow : null;

  // Only the shared target lights the warrior up; marks stay icons.
  const glow = highlighted ? HIGHLIGHT_GLOW : targetColor;

  useEffect(() => {
    if (!glow) return;

    return glowBattleWarrior(element, glow);
  }, [element, glow]);

  return (
    // `display: contents` keeps the warrior element as the positioning box.
    // The marker lives outside #lootlog-root, so it stills its own animations.
    <div
      className={`${getLootlogHostPortalThemeClassName()} ll:contents${pulse ? "" : " ll-battle-ping-still"}`}
    >
      {targetColor ? <BattlePingGround color={targetColor} /> : null}
      {/* Docked on the sprite's top-right corner, below the warrior's name,
          so the rows behind stay visible. */}
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
              animationEffectsEnabled
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
