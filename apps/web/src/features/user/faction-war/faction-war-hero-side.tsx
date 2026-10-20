import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { getFactionWarFactionArt } from "./faction-war-art";
import { FACTION_WAR_STYLE } from "./faction-war-faction-style";
import type { FactionWarStanding } from "./faction-war-standings";
import {
  formatFactionWarMultiplier,
  formatFactionWarPoints,
} from "./format-faction-war-number";

type FactionWarHeroSideProps = {
  warId: string;
  standing: FactionWarStanding;
  /** The faction across the seam, which the underdog bonus is measured against. */
  opponent: FactionWarStanding;
  side: "start" | "end";
  isWinner: boolean;
};

/** One faction's crest, score and players at its end of the hero. */
export const FactionWarHeroSide = ({
  warId,
  standing,
  opponent,
  side,
  isWinner,
}: FactionWarHeroSideProps) => {
  const { t } = useTranslation();
  const style = FACTION_WAR_STYLE[standing.faction];
  const hasBonus = standing.multiplier > 1;
  const isBoosted = standing.rawPoints !== standing.points;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        side === "end" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          side === "end" && "flex-row-reverse",
        )}
      >
        <img
          src={getFactionWarFactionArt(warId, standing.faction).emblem}
          alt=""
          width={256}
          height={256}
          decoding="async"
          className="size-9 shrink-0 drop-shadow-md sm:size-12"
        />
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold sm:text-base",
            style.textOnArt,
          )}
        >
          {isWinner && (
            <Crown
              className="size-4 shrink-0"
              aria-label={t("factionWar.hero.winner")}
            />
          )}
          {t(`factionWar.factions.${standing.faction}`)}
        </span>
      </div>
      <p className="text-2xl leading-8 font-semibold tabular-nums sm:text-4xl sm:leading-10">
        {formatFactionWarPoints(standing.points)}
        <span className="sr-only"> {t("factionWar.hero.pointsUnit")}</span>
      </p>
      <p className="text-xs text-white/80 sm:text-sm">
        {t("factionWar.hero.players", { count: standing.players })}
      </p>
      {isBoosted && (
        <p className="text-xs text-white/70">
          {t("factionWar.hero.rawPoints", {
            points: formatFactionWarPoints(standing.rawPoints),
          })}
        </p>
      )}
      {hasBonus && (
        <p className="max-w-full rounded-md bg-black/45 px-2 py-0.5 text-xs font-medium text-white">
          {t("factionWar.hero.bonus", {
            multiplier: formatFactionWarMultiplier(standing.multiplier),
            opponent: t(`factionWar.factionsGenitive.${opponent.faction}`),
          })}
        </p>
      )}
    </div>
  );
};
