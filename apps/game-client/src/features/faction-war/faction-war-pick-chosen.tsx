import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { getFactionStyle } from "./faction-war-presentation";

/** The locked choice, shown briefly before the screen closes. */
export const FactionWarPickChosen: FC<{
  faction: FactionWarFaction;
  emblemSrc: string | undefined;
}> = ({ faction, emblemSrc }) => {
  const { t } = useTranslation("factionWar");

  return (
    <div className="ll-fw-dialog" style={getFactionStyle(faction)}>
      <div className="ll-fw-card" role="status">
        <img className="ll-fw-emblem" src={emblemSrc} alt="" />
        <h3 className="ll-fw-card-title">
          {t("chosen.title", { name: t(`factions.${faction}.name`) })}
        </h3>
        <p className="ll-fw-card-text">{t("chosen.description")}</p>
      </div>
    </div>
  );
};
