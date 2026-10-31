import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { BandSection } from "@/components/common/band-section";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { STATS_TILE_CELL_CLASS } from "@/components/common/stats-tile";
import type { FactionWarPointSource } from "@lootlog/domain/faction-war";
import type { FactionWarScoring } from "./faction-war-queries";
import { formatFactionWarMultiplier } from "./format-faction-war-number";

const SECONDS_PER_MINUTE = 60;

type FactionWarRulesProps = {
  scoring: FactionWarScoring;
};

/** How points are earned and the war is won, from the war's own scoring. */
export const FactionWarRules = ({ scoring }: FactionWarRulesProps) => {
  const { t } = useTranslation();

  const sources: {
    source: FactionWarPointSource;
    rows: { label: string; points: number }[];
  }[] = [
    {
      source: "KILL",
      rows: Object.entries(scoring.killPoints).map(([npcType, points]) => ({
        label: t(`npcType.${npcType}`, { defaultValue: npcType }),
        points,
      })),
    },
    {
      source: "LOOT",
      rows: Object.entries(scoring.lootPoints).map(([rarity, points]) => ({
        label: t(`itemRarity.${rarity}`, { defaultValue: rarity }),
        points,
      })),
    },
    {
      source: "ONLINE",
      rows: [
        {
          label: t("factionWar.rules.onlineRow", {
            minutes: scoring.onlineSecondsPerPoint / SECONDS_PER_MINUTE,
          }),
          points: 1,
        },
      ],
    },
    {
      source: "PVP",
      rows: [
        { label: t("factionWar.rules.pvpRow"), points: scoring.pvpWinPoints },
      ],
    },
  ];

  return (
    <BandSection
      id="faction-war-rules"
      title={t("factionWar.rules.title")}
      description={t("factionWar.rules.description")}
      tiled
    >
      <div className="overflow-hidden">
        <div className="-mr-px grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {sources.map(({ source, rows }) => (
            <div
              key={source}
              className={cn("flex flex-col gap-3 p-4", STATS_TILE_CELL_CLASS)}
            >
              <h3 className="text-sm font-semibold">
                {t(`factionWar.sources.${source}`)}
              </h3>
              <dl className="flex flex-col gap-1.5 text-sm">
                {rows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-3">
                    <dt className="min-w-0 text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="shrink-0 font-medium tabular-nums">
                      {t("factionWar.rules.points", { count: row.points })}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-auto text-xs text-muted-foreground">
                {t("factionWar.rules.dailyCap", {
                  count: scoring.dailyCaps[source],
                })}
              </p>
            </div>
          ))}
        </div>
      </div>
      <ul
        className={cn(
          LIST_TILE_INSET_CLASS,
          "flex max-w-3xl list-disc flex-col gap-2 py-5 pl-8 text-sm text-muted-foreground sm:pl-9",
        )}
      >
        <li>{t("factionWar.rules.pick")}</li>
        <li>{t("factionWar.rules.loot")}</li>
        <li>{t("factionWar.rules.days")}</li>
        <li>
          {t("factionWar.rules.underdog", {
            cap: formatFactionWarMultiplier(scoring.underdogBonusCap),
          })}
        </li>
        <li>{t("factionWar.rules.winner")}</li>
        <li>{t("factionWar.rules.reward")}</li>
      </ul>
    </BandSection>
  );
};
