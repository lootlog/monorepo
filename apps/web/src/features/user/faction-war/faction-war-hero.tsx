import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import { formatStatisticsDateHour } from "@/components/common/kill-analytics/format-statistics-date";
import {
  getFactionWarFactionArt,
  getFactionWarSeamArt,
} from "./faction-war-art";
import { FactionWarHeroSide } from "./faction-war-hero-side";
import { FactionWarStatus } from "./faction-war-status";
import { getFactionWarStandings } from "./faction-war-standings";
import { FactionWarTugBar } from "./faction-war-tug-bar";
import type { FactionWar } from "./faction-war-queries";

type FactionWarHeroProps = {
  war: Pick<
    FactionWar,
    "id" | "status" | "startsAt" | "endsAt" | "totals" | "winners"
  >;
};

/**
 * The war's banner: the two factions face each other across the seam, with
 * their scores, the tug of war between them, and the time left.
 */
export const FactionWarHero = ({ war }: FactionWarHeroProps) => {
  const { t } = useTranslation();
  const titleId = useId();
  const standings = getFactionWarStandings(war.totals);
  const [left, right] = standings;
  const winners: readonly FactionWarFaction[] = war.winners;

  const isWinner = (faction: FactionWarFaction) =>
    war.status === "ENDED" && winners.includes(faction);

  if (!left || !right) return null;

  const leftArt = getFactionWarFactionArt(war.id, left.faction);
  const rightArt = getFactionWarFactionArt(war.id, right.faction);

  return (
    <section
      aria-labelledby={titleId}
      data-list-tile
      className="relative isolate overflow-hidden border-b border-border bg-[#0b0c10] text-white"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <img
          src={leftArt.backdrop}
          alt=""
          decoding="async"
          className="absolute inset-y-0 left-0 h-full w-1/2 object-cover object-right"
        />
        <img
          src={rightArt.backdrop}
          alt=""
          decoding="async"
          className="absolute inset-y-0 right-0 h-full w-1/2 object-cover object-left"
        />
        <img
          src={getFactionWarSeamArt(war.id)}
          alt=""
          decoding="async"
          className="absolute inset-y-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2"
        />
        <img
          src={leftArt.character}
          alt=""
          width={768}
          height={1152}
          decoding="async"
          className="absolute bottom-0 left-0 h-[92%] w-auto max-w-[46%] object-contain object-bottom-left sm:left-[4%]"
        />
        <img
          src={rightArt.character}
          alt=""
          width={768}
          height={1152}
          decoding="async"
          className="absolute right-0 bottom-0 h-[92%] w-auto max-w-[46%] object-contain object-bottom-right sm:right-[4%]"
        />
        {/* Keeps the scores readable over the brightest art. */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/35 to-black/55" />
      </div>
      <div className="flex min-h-80 flex-col justify-between gap-6 px-3 py-5 sm:px-4 lg:min-h-96 lg:px-6">
        <div className="flex flex-col items-center gap-1 text-center [text-shadow:0_1px_8px_rgb(0_0_0/0.8)]">
          <p className="text-xs font-semibold tracking-wide text-white/80 uppercase">
            {t("factionWar.hero.eyebrow")}
          </p>
          <h1
            id={titleId}
            className="text-2xl font-semibold text-balance sm:text-3xl"
          >
            {t("factionWar.hero.title", {
              left: t(`factionWar.factions.${left.faction}`),
              right: t(`factionWar.factions.${right.faction}`),
            })}
          </h1>
          <FactionWarStatus
            status={war.status}
            startsAt={war.startsAt}
            endsAt={war.endsAt}
            winners={winners}
          />
          <p className="text-xs text-white/75">
            {t("factionWar.hero.dates", {
              start: formatStatisticsDateHour(war.startsAt),
              end: formatStatisticsDateHour(war.endsAt),
            })}
          </p>
        </div>
        <div className="flex flex-col gap-3 [text-shadow:0_1px_6px_rgb(0_0_0/0.8)]">
          <div className="grid grid-cols-2 gap-4">
            <FactionWarHeroSide
              warId={war.id}
              standing={left}
              opponent={right}
              side="start"
              isWinner={isWinner(left.faction)}
            />
            <FactionWarHeroSide
              warId={war.id}
              standing={right}
              opponent={left}
              side="end"
              isWinner={isWinner(right.faction)}
            />
          </div>
          <FactionWarTugBar standings={standings} />
        </div>
      </div>
    </section>
  );
};
