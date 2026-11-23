import {
  STATS_TILE_CELL_CLASS,
  StatsTile,
} from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import type { KilledNpcType } from "@/constants/npc";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { sum } from "es-toolkit";
import { Swords } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PRODUCT_LOCALE, formatNumber } from "@lootlog/domain/locale";

const NPC_TYPE_FILLS: Partial<Record<KilledNpcType, string>> = {
  ELITE2: "bg-primary",
  ELITE3: "bg-primary/85",
  COLOSSUS: "bg-primary/70",
  HERO: "bg-primary/45",
  EVENT_HERO: "bg-primary/35",
  TITAN: "bg-primary/25",
};

const shareFormatter = new Intl.NumberFormat(PRODUCT_LOCALE, {
  style: "percent",
  maximumFractionDigits: 1,
});

type KillStatsOverviewProps = {
  total?: number;
  totalDetail?: ReactNode;
  types: { type: KilledNpcType; kills: number; detail?: ReactNode }[];
  isLoading?: boolean;
  selectedType?: KilledNpcType;
  onSelectType?: (type: KilledNpcType) => void;
};

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
        "sm:grid-cols-3",
        types.length > 5
          ? "lg:grid-cols-[minmax(0,1.4fr)_repeat(6,minmax(0,1fr))]"
          : types.length > 4
            ? "lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]"
            : "lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]",
      )}
    >
      <StatsTile
        className="sm:col-span-3 lg:col-span-1"
        icon={Swords}
        label={t("kills.overview.totalKills")}
        value={
          isLoading ? <Skeleton className="h-7 w-24" /> : formatNumber(total)
        }
        detail={isLoading ? <Skeleton className="h-4 w-24" /> : totalDetail}
        footer={
          isLoading ? (
            <Skeleton className="h-1.5 w-full rounded-full" />
          ) : (
            <div
              aria-hidden
              className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted"
            >
              {total > 0 &&
                [...types, { type: undefined, kills: otherKills }].map(
                  ({ type, kills }) =>
                    kills > 0 && (
                      <span
                        key={type ?? "other"}
                        className={cn(
                          "min-w-1 transition-opacity duration-200",
                          type
                            ? NPC_TYPE_FILLS[type]
                            : "bg-muted-foreground/30",
                          selectedType && type !== selectedType && "opacity-50",
                        )}
                        style={{ flexGrow: kills }}
                      />
                    ),
                )}
            </div>
          )
        }
      />

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
            </span>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-2xl leading-7 font-semibold tabular-nums">
                  {formatNumber(kills)}
                </span>
                {total > 0 && (
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {shareFormatter.format(kills / total)}
                  </span>
                )}
              </span>
            )}
            {isLoading
              ? detail !== undefined && <Skeleton className="h-4 w-20" />
              : detail && (
                  <span className="truncate text-xs text-muted-foreground">
                    {detail}
                  </span>
                )}
          </button>
        );
      })}
    </StatsTileGrid>
  );
};
