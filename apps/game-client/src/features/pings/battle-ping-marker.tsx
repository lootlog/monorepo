import { getLootlogHostPortalThemeClassName } from "@/components/ui/theme-boundary";
import { useSettingsStore } from "@/store/settings.store";
import { useEffect, type FC } from "react";
import { useTranslation } from "react-i18next";
import { BattlePingChip } from "./battle-ping-chip";
import { BattlePingGround } from "./battle-ping-ground";
import type { BattlePingMark, BattlePingTarget } from "./battle-ping-store";
import { glowBattleWarrior } from "./battle-warriors";
import { PING_TONES, getPingPresentation } from "./ping-presentation";
import { usePingPulse } from "./use-ping-pulse";

type BattlePingMarkerProps = {
  /** The game's warrior element this marker is portalled into. */
  element: HTMLElement;
  mark: BattlePingMark | undefined;
  target: BattlePingTarget | undefined;
};

/** Rendered inside the warrior element, so it follows the battle scaling. */
export const BattlePingMarker: FC<BattlePingMarkerProps> = ({
  element,
  mark,
  target,
}) => {
  const { t } = useTranslation("pings");

  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  const pulse = usePingPulse();

  const attack = getPingPresentation("attack");
  const markPresentation = mark ? getPingPresentation(mark.type) : null;

  // The shared target outranks a mark in the warrior's glow and ground ring.
  const tone = target ? attack.tone : markPresentation?.tone;
  const color = tone ? PING_TONES[tone].glow : null;

  useEffect(() => {
    if (!color) return;

    return glowBattleWarrior(element, color, pulse);
  }, [color, element, pulse]);

  return (
    // `display: contents` keeps the warrior element as the positioning box.
    // The marker lives outside #lootlog-root, so it stills its own animations.
    <div
      className={`${getLootlogHostPortalThemeClassName()} ll:contents${pulse ? "" : " ll-battle-ping-still"}`}
    >
      {color ? <BattlePingGround color={color} /> : null}
      <div
        className="ll:pointer-events-none ll:absolute ll:left-1/2"
        style={{ top: -24, transform: "translate(-50%, -100%)", zIndex: 10 }}
      >
        <div className="ll-battle-ping-bob ll:flex ll:flex-col ll:items-center ll:gap-1">
          {mark && markPresentation ? (
            <BattlePingChip
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
              key={`${mark.type}-${mark.expiresAt}`}
              label={t(markPresentation.translationKey)}
              senderName={mark.senderName}
              tone={markPresentation.tone}
            />
          ) : null}
          {target ? (
            <BattlePingChip
              icon={attack.icon}
              key={`target-${target.senderName}`}
              label={t(attack.translationKey)}
              senderName={target.senderName}
              tone={attack.tone}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};
