import { SectionCard } from "@/components/common/section-card/section-card";
import type {
  GuildKillStatsResponseDtoOutputOverview,
  NpcType,
} from "@lootlog/client/main";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { sum } from "es-toolkit";
import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TRACKABLE_NPC_TYPES } from "../constants";

// One hue, as on the activity heatmaps: the most common type is the brightest.
const NPC_TYPE_FILLS: Partial<Record<NpcType, string>> = {
  ELITE2: "bg-primary",
  COLOSSUS: "bg-primary/70",
  HERO: "bg-primary/45",
  TITAN: "bg-primary/25",
};

const numberFormatter = new Intl.NumberFormat("pl-PL");

const shareFormatter = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumFractionDigits: 1,
});

type KillStatsOverviewProps = {
  data?: GuildKillStatsResponseDtoOutputOverview;
  isLoading?: boolean;
  /** The type the leaderboards show; picking a type switches them. */
  selectedType?: NpcType;
  onSelectType?: (type: NpcType) => void;
};

export const KillStatsOverview = ({
  data,
  isLoading = false,
  selectedType,
  onSelectType,
}: KillStatsOverviewProps) => {
  const { t } = useTranslation();
  const total = data?.guildUniqueKills ?? 0;

  const types = TRACKABLE_NPC_TYPES.map((type) => ({
    type,
    kills: data?.killsByType[type] ?? 0,
    participations: data?.participationsByType[type] ?? 0,
  }));

  const otherKills = Math.max(0, total - sum(types.map(({ kills }) => kills)));

  return (
    <SectionCard className="flex flex-col gap-4 p-4 lg:flex-row lg:gap-6">
      <div className="flex min-w-0 shrink-0 flex-col gap-1 lg:w-52 lg:justify-center">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Swords className="size-4 text-primary" aria-hidden="true" />
          {t("kills.overview.totalKills")}
        </div>
        {isLoading ? (
          <>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-24" />
          </>
        ) : (
          <>
            <div className="text-4xl font-semibold leading-tight tabular-nums">
              {numberFormatter.format(total)}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("kills.overview.participations", {
                value: numberFormatter.format(
                  data?.totalMemberParticipations ?? 0,
                ),
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-2 w-full rounded-full" />
        ) : (
          <div
            aria-hidden
            className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
          >
            {total > 0 &&
              [
                ...types,
                { type: undefined, kills: otherKills, participations: 0 },
              ].map(
                ({ type, kills }) =>
                  kills > 0 && (
                    <span
                      key={type ?? "other"}
                      className={cn(
                        "min-w-1 transition-opacity duration-200",
                        type ? NPC_TYPE_FILLS[type] : "bg-muted-foreground/30",
                        selectedType && type !== selectedType && "opacity-50",
                      )}
                      style={{ flexGrow: kills }}
                    />
                  ),
              )}
          </div>
        )}

        <div
          role="group"
          aria-label={t("kills.overview.pickType")}
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          {types.map(({ type, kills, participations }) => {
            const selected = type === selectedType;

            return (
              <button
                key={type}
                type="button"
                aria-pressed={selected}
                disabled={!onSelectType}
                onClick={() => onSelectType?.(type)}
                className={cn(
                  "flex min-w-0 flex-col gap-1 rounded-md border px-3 py-2 text-left outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  "enabled:hover:bg-muted/60 disabled:cursor-default",
                  selected
                    ? "border-primary/60 bg-primary/10"
                    : "border-border/70",
                )}
              >
                <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-sm",
                      NPC_TYPE_FILLS[type],
                    )}
                  />
                  <span className="truncate">{t(`npcType.${type}`)}</span>
                  {!isLoading && total > 0 && (
                    <span className="ml-auto tabular-nums">
                      {shareFormatter.format(kills / total)}
                    </span>
                  )}
                </span>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <span className="text-xl font-semibold leading-6 tabular-nums">
                    {numberFormatter.format(kills)}
                  </span>
                )}
                <span className="truncate text-xs text-muted-foreground">
                  {t("kills.overview.participations", {
                    value: numberFormatter.format(participations),
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
};
