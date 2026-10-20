import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { getFactionWarAssetUrl } from "./faction-war-assets";
import { FactionWarParticles } from "./faction-war-particles";
import { FACTION_SIDES, getFactionStyle } from "./faction-war-presentation";

export type FactionSideEmphasis =
  | "none"
  | "active"
  | "muted"
  | "chosen"
  | "lost";

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

  const title = t(`factions.${faction}.title`);

  return (
    <div
      className="ll-fw-side"
      data-side={FACTION_SIDES[faction]}
      data-emphasis={emphasis}
      style={getFactionStyle(faction)}
    >
      <div className="ll-fw-art" aria-hidden="true">
        <img
          className="ll-fw-backdrop"
          src={asset("backdrop")}
          alt=""
          draggable={false}
        />
        {motion ? (
          <FactionWarParticles
            src={asset("particles") ?? ""}
            drift={faction === "BARBATOS" ? "rise" : "fall"}
          />
        ) : null}
        {motion ? (
          <img className="ll-fw-cracks" src={asset("cracks")} alt="" />
        ) : null}
        <div className="ll-fw-figure">
          <div className="ll-fw-breathe">
            <img className="ll-fw-aura" src={asset("aura")} alt="" />
            {motion ? (
              <img className="ll-fw-rim" src={asset("character")} alt="" />
            ) : null}
            <img
              className="ll-fw-character"
              src={asset("character")}
              alt=""
              draggable={false}
            />
            {motion ? (
              <>
                <img className="ll-fw-burst" src={asset("burst")} alt="" />
                <img className="ll-fw-spray" src={asset("particles")} alt="" />
              </>
            ) : null}
          </div>
        </div>
        <div className="ll-fw-dim" />
        <div className="ll-fw-scrim" />
      </div>
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
          <img
            className="ll-fw-emblem"
            src={asset("emblem")}
            alt=""
            draggable={false}
          />
          <span className="ll-fw-name">{t(`factions.${faction}.name`)}</span>
          {title ? <span className="ll-fw-title">{title}</span> : null}
          <span className="ll-fw-meta">
            {t(`factions.${faction}.element`)}
            {players === null
              ? null
              : ` · ${t("pick.players", { count: players })}`}
          </span>
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
    </div>
  );
};
