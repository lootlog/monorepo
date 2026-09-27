import { getLootlogHostPortalThemeClassName } from "@/components/ui/theme-boundary";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { BattlePingMark, BattlePingTarget } from "./battle-ping-store";
import { PingIcon } from "./ping-icon";
import { PingPill } from "./ping-pill";
import { PING_TONES, getPingPresentation } from "./ping-presentation";

type BattlePingMarkerProps = {
  mark: BattlePingMark | undefined;
  target: BattlePingTarget | undefined;
};

/** Rendered inside the warrior element, so it follows the battle scaling. */
export const BattlePingMarker: FC<BattlePingMarkerProps> = ({
  mark,
  target,
}) => {
  const { t } = useTranslation("pings");
  const attack = getPingPresentation("attack");
  const markPresentation = mark ? getPingPresentation(mark.type) : null;

  return (
    // `display: contents` keeps the warrior element as the positioning box.
    <div className={`${getLootlogHostPortalThemeClassName()} ll:contents`}>
      {target ? (
        // Mirrors the game's own `.selector` ellipse, in gold so it never
        // reads as the local player's red target.
        <div
          aria-hidden="true"
          className="ll:pointer-events-none ll:absolute ll:bottom-0 ll:left-0 ll:right-0 ll:h-4 ll:rounded-[22px]"
          style={{
            boxShadow: `0 0 9px 4px ${PING_TONES.gold.glow}`,
            transform: "rotateX(63deg)",
            zIndex: -2,
          }}
        />
      ) : null}
      <div
        className="ll:pointer-events-none ll:absolute ll:left-1/2 ll:flex ll:flex-col ll:items-center ll:gap-[3px]"
        style={{ top: -24, transform: "translate(-50%, -100%)", zIndex: 10 }}
      >
        {mark && markPresentation ? (
          <div
            className="ll:animate-in ll:fade-in-0 ll:slide-in-from-top-2 ll:duration-200 ll:motion-reduce:animate-none"
            key={`${mark.type}-${mark.expiresAt}`}
          >
            <PingPill highlighted={mark.forMe}>
              <PingIcon
                color={PING_TONES[markPresentation.tone].glow}
                name={markPresentation.icon}
                size={13}
              />
              <span>{t(markPresentation.translationKey)}</span>
              <span className="ll:font-normal" style={{ color: "#bebebe" }}>
                · {mark.senderName}
              </span>
            </PingPill>
          </div>
        ) : null}
        {target ? (
          <div
            className="ll:animate-in ll:fade-in-0 ll:slide-in-from-top-2 ll:duration-200 ll:motion-reduce:animate-none"
            key={`target-${target.senderName}`}
          >
            <PingPill tone={attack.tone}>
              <PingIcon
                color={PING_TONES[attack.tone].glow}
                name={attack.icon}
                size={13}
              />
              <span className="ll:text-[10px]">{target.senderName}</span>
            </PingPill>
          </div>
        ) : null}
      </div>
    </div>
  );
};
