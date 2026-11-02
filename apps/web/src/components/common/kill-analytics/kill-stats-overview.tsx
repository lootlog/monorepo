import {
  STATS_TILE_CELL_CLASS,
  StatsTileGrid,
} from "@/components/common/stats-tile";
import type { NpcType } from "@lootlog/client/main";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { sum } from "es-toolkit";
import { Swords } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

// One hue, as on the activity heatmaps: the most common type is the brightest.
const NPC_TYPE_FILLS: Partial<Record<NpcType, string>> = {
  ELITE2: "bg-primary",
  ELITE3: "bg-primary/85",
  COLOSSUS: "bg-primary/70",
  HERO: "bg-primary/45",
  EVENT_HERO: "bg-primary/35",
  TITAN: "bg-primary/25",
};

const numberFormatter = new Intl.NumberFormat("pl-PL");

const shareFormatter = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumFractionDigits: 1,
});

type KillStatsOverviewProps = {
  total?: number;
  /** A line under the total, such as its change or the participations. */
  totalDetail?: ReactNode;
  /** One tile per NPC type, in this order. */
  types: { type: NpcType; kills: number; detail?: ReactNode }[];
  isLoading?: boolean;
  /** The type the page narrows to; omit where a tile only opens the type. */
  selectedType?: NpcType;
  onSelectType?: (type: NpcType) => void;
};

/**
 * All kills in the period next to a tile per NPC type, edge to edge at the
 * top of a statistics page.
 */
export const KillStatsOverview = ({
  total = 0,
  totalDetail,
  types,
  isLoading = false,
  selectedType,
  onSelectType,
}: KillStatsOverviewProps) => {
  const { t } = useTranslation();
  const otherKills = Math.max(0, total - sum(types.map(({ kills }) => kills)));

  return (
    <StatsTileGrid
      className={cn(
        "grid-cols-2 [&>:last-child:nth-child(even)]:col-span-2 lg:[&>:last-child:nth-child(even)]:col-span-1",
        types.length > 5
          ? "lg:grid-cols-[minmax(0,1.4fr)_repeat(6,minmax(0,1fr))]"
          : types.length > 4
            ? "lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]"
            : "lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]",
      )}
    >
      <div
        className={cn(
          "col-span-2 flex flex-col gap-1 p-4 lg:col-span-1",
          STATS_TILE_CELL_CLASS,
        )}
      >
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
            <div className="text-4xl leading-tight font-semibold tabular-nums">
              {numberFormatter.format(total)}
            </div>
            {totalDetail && (
              <div className="text-xs text-muted-foreground">{totalDetail}</div>
            )}
          </>
        )}
        {isLoading ? (
          <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
        ) : (
          <div
            aria-hidden
            className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted"
          >
            {total > 0 &&
              [...types, { type: undefined, kills: otherKills }].map(
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
      </div>

      {types.map(({ type, kills, detail }) => {
        const selected = type === selectedType;

        return (
          <button
            key={type}
            type="button"
            aria-pressed={selectedType ? selected : undefined}
            disabled={!onSelectType}
            onClick={() => onSelectType?.(type)}
            className={cn(
              "flex flex-col justify-center gap-1 p-4 text-left outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              "enabled:cursor-pointer enabled:hover:bg-muted/40 disabled:cursor-default",
              selected && "bg-primary/10 enabled:hover:bg-primary/15",
              STATS_TILE_CELL_CLASS,
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
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl leading-7 font-semibold tabular-nums">
                {numberFormatter.format(kills)}
              </span>
            )}
            {isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              detail && (
                <span className="truncate text-xs text-muted-foreground">
                  {detail}
                </span>
              )
            )}
          </button>
        );
      })}
    </StatsTileGrid>
  );
};
