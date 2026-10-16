import { formatLevel } from "@lootlog/domain/profession";
import { cn } from "cn";
import { TextLink } from "@lootlog/ui/components/text-link";
import type { TFunction } from "i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { Map as MapIcon, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { HeroAvatar } from "../shared/hero-avatar";
import type { EventHeroNpc, EventTimer } from "../../types/api";
import { HeroTimerDisplay } from "./hero-timer-display";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { EMPTY_VALUE } from "@/constants/empty-value";
import type { MyHeroScore } from "../../utils/my-hero-scores";
import { formatPoints } from "../../utils/format-points";

type EventHeroStats = {
  npcId: number | null;
  npcProf: string | null;
  killCount: number;
};

export type EventHeroTableRow = {
  hero: EventHeroNpc;
  stats?: EventHeroStats;
  timer?: EventTimer;
  /** The player's place in the hero's ranking, for a standings table. */
  score?: MyHeroScore;
};

type CreateEventHeroesTableColumnsOptions = {
  canManage: boolean;
  eventId: string;
  guildId: string;
  onRequestDeleteHero: (hero: EventHeroNpc) => void;
  onEditHero: (hero: EventHeroNpc) => void;
  onManageMaps: (hero: EventHeroNpc) => void;
  /** Adds the player's place in each hero's ranking and drops the game's NPC id. */
  showStandings?: boolean;
  t: TFunction;
};

const getTotalMapsCount = (hero: EventHeroNpc) =>
  (hero.locations ?? []).reduce(
    (sum, location) => sum + location.maps.length,
    0,
  ) + (hero.maps?.length ?? 0);

export const createEventHeroesTableColumns = ({
  canManage,
  eventId,
  guildId,
  onRequestDeleteHero,
  onEditHero,
  onManageMaps,
  showStandings = false,
  t,
}: CreateEventHeroesTableColumnsOptions): ColumnDef<
  typeof coreTableFeatures,
  EventHeroTableRow
>[] => {
  const columns: ColumnDef<typeof coreTableFeatures, EventHeroTableRow>[] = [
    {
      id: "hero",
      header: t("events.heroes.columns.hero"),
      cell: ({ row }) => {
        const { hero, stats, score } = row.original;
        const totalMapsCount = getTotalMapsCount(hero);
        const killCount = stats?.killCount ?? 0;

        const npcLevel = hero.npcLvl
          ? formatLevel(hero.npcLvl, stats?.npcProf)
          : null;

        return (
          <TextLink
            className="flex min-w-0 items-center gap-2.5 text-sm"
            render=<Link
              to="/$guildId/events/$eventId/heroes/$heroId"
              params={{ guildId, eventId, heroId: hero.id }}
            />
          >
            <HeroAvatar hero={hero} />

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="min-w-0 truncate text-sm font-semibold leading-tight">
                  {hero.npcName}
                  {npcLevel ? (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {npcLevel}
                    </span>
                  ) : null}
                </span>
              </div>
              <div
                className={cn(
                  "mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-none text-muted-foreground",
                  showStandings && "lg:hidden",
                )}
              >
                {!showStandings && (
                  <>
                    <span>
                      {t("events.heroes.columns.idValue", {
                        id: hero.npcId ?? EMPTY_VALUE,
                      })}
                    </span>
                    <span className="lg:hidden" aria-hidden="true">
                      •
                    </span>
                  </>
                )}
                <span className="lg:hidden">
                  {t("events.maps.mapCount", { count: totalMapsCount })}
                </span>
                <span className="lg:hidden" aria-hidden="true">
                  •
                </span>
                <span className="lg:hidden">
                  {t("events.heroes.killCount", { count: killCount })}
                </span>
                {showStandings && score?.place !== undefined && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span className="font-medium text-foreground">
                      {t("events.score.place", { place: score.place })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </TextLink>
        );
      },
    },
    {
      id: "timer",
      header: t("events.heroes.columns.timer"),
      cell: ({ row }) => (
        <div className="flex justify-end">
          <HeroTimerDisplay
            timer={row.original.timer}
            t={t}
            className="rounded-md bg-muted/50 px-2 py-1 ring-1 ring-inset ring-border/70"
          />
        </div>
      ),
    },
    {
      id: "maps",
      header: t("events.heroes.columns.maps"),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {getTotalMapsCount(row.original.hero)}
        </span>
      ),
    },
    {
      id: "kills",
      header: t("events.heroes.columns.kills"),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {row.original.stats?.killCount ?? 0}
        </span>
      ),
    },
  ];

  if (showStandings) {
    const mineColumn: ColumnDef<typeof coreTableFeatures, EventHeroTableRow> = {
      id: "mine",
      header: t("events.heroes.columns.mine"),
      cell: ({ row }) => {
        const score = row.original.score;

        return score?.place === undefined ? (
          <span className="text-muted-foreground">{EMPTY_VALUE}</span>
        ) : (
          <span className="flex flex-col items-end">
            <span className="text-sm font-semibold tabular-nums">
              {t("events.score.place", { place: score.place })}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("events.score.pointsValue", {
                points: formatPoints(score.points),
              })}
            </span>
          </span>
        );
      },
    };

    columns.splice(2, 0, mineColumn);
  }

  if (canManage) {
    columns.push({
      id: "actions",
      header: () => (
        <span className="sr-only">{t("events.heroes.columns.actions")}</span>
      ),
      cell: ({ row }) => {
        const { hero } = row.original;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground"
                    aria-label={t("events.heroes.actions")}
                    title={t("events.heroes.actions")}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditHero(hero)}>
                  <Pencil className="size-4" />
                  {t("events.heroes.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onManageMaps(hero)}>
                  <MapIcon className="size-4" />
                  {t("events.heroes.manageMaps")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onRequestDeleteHero(hero)}
                >
                  <Trash2 className="size-4" />
                  {t("events.heroes.deleteAction")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });
  }

  return columns;
};
