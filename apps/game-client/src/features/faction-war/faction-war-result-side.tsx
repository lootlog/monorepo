import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { FactionWarCrest } from "./faction-war-crest";
import { formatFactionWarPoints } from "./faction-war-presentation";
import { FactionWarSide, type FactionSideEmphasis } from "./faction-war-side";

type FactionWarResultSideProps = {
  warId: string;
  faction: FactionWarFaction;
  emphasis: FactionSideEmphasis;
  motion: boolean;
  players: number | null;
  points: number;
  won: boolean;
};

/** One half of the result: the faction's art, crest and final score. */
export const FactionWarResultSide: FC<FactionWarResultSideProps> = ({
  warId,
  faction,
  emphasis,
  motion,
  players,
  points,
  won,
}) => {
  const { t } = useTranslation("factionWar");

  return (
    <FactionWarSide
      warId={warId}
      faction={faction}
      emphasis={emphasis}
      motion={motion}
    >
      <div className="ll-fw-corner">
        <div className="ll-fw-info">
          <FactionWarCrest warId={warId} faction={faction} players={players} />
          {won ? (
            <span className="ll-fw-bonus">{t("result.victory")}</span>
          ) : null}
          <span className="ll-fw-score">
            {t("result.score", { points: formatFactionWarPoints(points) })}
          </span>
        </div>
      </div>
    </FactionWarSide>
  );
};
