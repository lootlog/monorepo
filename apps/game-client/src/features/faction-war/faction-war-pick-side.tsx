import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { getFactionWarAssetUrl } from "./faction-war-assets";
import { FactionWarCrest } from "./faction-war-crest";
import { FactionWarSide, type FactionSideEmphasis } from "./faction-war-side";

type FactionWarPickSideProps = {
  warId: string;
  faction: FactionWarFaction;
  emphasis: FactionSideEmphasis;
  /** False under reduced motion: no particles, bursts or cracks. */
  motion: boolean;
  players: number | null;
  bonus: number | null;
  disabled: boolean;
  onHoverChange: (faction: FactionWarFaction | null) => void;
  onChoose: (faction: FactionWarFaction) => void;
};

const formatMultiplier = (multiplier: number) =>
  multiplier.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

/** One half of the pick screen: the faction's art, crest and choice. */
export const FactionWarPickSide: FC<FactionWarPickSideProps> = ({
  warId,
  faction,
  emphasis,
  motion,
  players,
  bonus,
  disabled,
  onHoverChange,
  onChoose,
}) => {
  const { t } = useTranslation("factionWar");

  const asset = (name: Parameters<typeof getFactionWarAssetUrl>[2]) =>
    getFactionWarAssetUrl(warId, faction, name) ?? undefined;

  return (
    <FactionWarSide
      warId={warId}
      faction={faction}
      emphasis={emphasis}
      motion={motion}
    >
      <button
        type="button"
        className="ll-fw-choose"
        disabled={disabled}
        onPointerEnter={() => onHoverChange(faction)}
        onPointerLeave={() => onHoverChange(null)}
        onFocus={() => onHoverChange(faction)}
        onBlur={() => onHoverChange(null)}
        onClick={() => onChoose(faction)}
      >
        <span className="ll-fw-info">
          <FactionWarCrest warId={warId} faction={faction} players={players} />
          {bonus === null ? null : (
            <span className="ll-fw-bonus">
              {t("pick.bonus", { multiplier: formatMultiplier(bonus) })}
            </span>
          )}
          <span className="ll-fw-cta" data-motion={motion || undefined}>
            {motion ? (
              <span className="ll-fw-cta-sparks">
                <span
                  className="ll-fw-cta-sparks-track"
                  style={{ backgroundImage: `url(${asset("particles")})` }}
                />
              </span>
            ) : null}
            <img
              className="ll-fw-cta-plate"
              src={asset("button")}
              alt=""
              draggable={false}
            />
            <img
              className="ll-fw-cta-plate ll-fw-cta-glow"
              src={asset("buttonHover")}
              alt=""
              draggable={false}
            />
            {motion ? <span className="ll-fw-cta-shine" /> : null}
            <span className="ll-fw-cta-label">
              {t(`factions.${faction}.choose`)}
            </span>
          </span>
        </span>
      </button>
    </FactionWarSide>
  );
};
