import { Ban, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { sum } from "es-toolkit";
import { cn } from "cn";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@lootlog/ui/components/progress";
import { BandSection } from "@/components/common/band-section";
import { EmptyState } from "@/components/common/empty-state";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { formatStatisticsDateHour } from "@/components/common/kill-analytics/format-statistics-date";
import { FactionWarPointSource } from "@lootlog/domain/faction-war";
import { getFactionWarFactionArt } from "./faction-war-art";
import { FACTION_WAR_STYLE } from "./faction-war-faction-style";
import type { FactionWar } from "./faction-war-queries";
import { formatFactionWarPoints } from "./format-faction-war-number";

const SOURCES = Object.values(FactionWarPointSource);

type FactionWarContributionProps = {
  war: Pick<FactionWar, "id" | "status" | "pick" | "scoring">;
};

/**
 * The caller's faction and points, and how much of each daily limit they used
 * today; only a notice once they are disqualified.
 */
export const FactionWarContribution = ({
  war,
}: FactionWarContributionProps) => {
  const { t } = useTranslation();
  const { pick } = war;

  if (!pick) {
    return (
      <BandSection
        id="faction-war-contribution"
        title={t("factionWar.contribution.title")}
        wide
      >
        <EmptyState
          compact
          icon={Swords}
          title={t(`factionWar.contribution.noPick.${war.status}.title`)}
          description={t(
            `factionWar.contribution.noPick.${war.status}.description`,
          )}
        />
      </BandSection>
    );
  }

  if (pick.disqualified) {
    // Nothing they earned counts, so no numbers suggest otherwise.
    return (
      <BandSection
        id="faction-war-contribution"
        title={t("factionWar.contribution.title")}
        wide
      >
        <EmptyState
          compact
          icon={Ban}
          title={t("factionWar.contribution.disqualified.title")}
          description={t("factionWar.contribution.disqualified.description", {
            character: pick.characterName,
            world: pick.world,
          })}
        />
      </BandSection>
    );
  }

  const today = sum(SOURCES.map((source) => pick.todayBySource[source]));

  return (
    <BandSection
      id="faction-war-contribution"
      title={t("factionWar.contribution.title")}
      tiled
    >
      <StatsTileGrid className="sm:grid-cols-3">
        <StatsTile
          media={
            <img
              src={getFactionWarFactionArt(war.id, pick.faction).emblem}
              alt=""
              width={256}
              height={256}
              decoding="async"
              className="size-10 shrink-0"
            />
          }
          label={t("factionWar.contribution.faction")}
          value={
            <span className={FACTION_WAR_STYLE[pick.faction].text}>
              {t(`factionWar.factions.${pick.faction}`)}
            </span>
          }
          detail={`${pick.characterName} · ${pick.world}`}
        />
        <StatsTile
          label={t("factionWar.contribution.points")}
          value={formatFactionWarPoints(pick.points)}
          detail={t("factionWar.contribution.pickedAt", {
            date: formatStatisticsDateHour(pick.pickedAt),
          })}
        />
        <StatsTile
          label={t("factionWar.contribution.today")}
          value={formatFactionWarPoints(today)}
          detail={t("factionWar.contribution.todayDetail")}
        />
      </StatsTileGrid>
      <div
        className={cn(
          "grid gap-x-8 gap-y-4 py-5 sm:grid-cols-2",
          LIST_TILE_INSET_CLASS,
        )}
      >
        {SOURCES.map((source) => {
          const points = pick.todayBySource[source];
          const cap = war.scoring.dailyCaps[source];

          return (
            <Progress
              key={source}
              value={cap > 0 ? Math.min(100, (points / cap) * 100) : 0}
              variant={points >= cap ? "ready" : "default"}
              className="gap-2"
            >
              <ProgressLabel>{t(`factionWar.sources.${source}`)}</ProgressLabel>
              <ProgressValue>
                {() =>
                  points >= cap
                    ? t("factionWar.contribution.capReached", { cap })
                    : t("factionWar.contribution.ofCap", {
                        points: formatFactionWarPoints(points),
                        cap,
                      })
                }
              </ProgressValue>
            </Progress>
          );
        })}
      </div>
    </BandSection>
  );
};
