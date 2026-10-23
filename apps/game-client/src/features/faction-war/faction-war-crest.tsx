import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { getFactionWarAssetUrl } from "./faction-war-assets";

/** A half's crest, faction name, title and element with its player count. */
export const FactionWarCrest: FC<{
  warId: string;
  faction: FactionWarFaction;
  players: number | null;
}> = ({ warId, faction, players }) => {
  const { t } = useTranslation("factionWar");
  const title = t(`factions.${faction}.title`);

  return (
    <>
      <img
        className="ll-fw-emblem"
        src={getFactionWarAssetUrl(warId, faction, "emblem") ?? undefined}
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
    </>
  );
};
