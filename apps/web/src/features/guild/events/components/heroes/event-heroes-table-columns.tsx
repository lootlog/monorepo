import type { TFunction } from "i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import {
  Map as MapIcon,
  MoreVertical,
  Pencil,
  Swords,
  Trash2,
} from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { NpcTile } from "@/components/tiles";
import { cn } from "@lootlog/ui/lib/utils";
import type { EventHeroNpc, EventTimer } from "../../types/api";
import { HeroTimerDisplay } from "./hero-timer-display";
import { HeroWindowStatusBadge } from "./hero-window-status-badge";

type EventHeroStats = {
  npcId: number | null;
  npcProf: string | null;
  killCount: number;
};

export type EventHeroTableRow = {
  hero: EventHeroNpc;
  stats?: EventHeroStats;
  timer?: EventTimer;
};

type CreateEventHeroesTableColumnsOptions = {
  canManage: boolean;
  eventId: string;
  guildId: string;
  onDeleteHero: (heroId: string) => void;
  onEditHero: (hero: EventHeroNpc) => void;
  onManageMaps: (hero: EventHeroNpc) => void;
  t: TFunction;
};

const getTotalMapsCount = (hero: EventHeroNpc) =>
  (hero.locations?.reduce(
    (mapCount, location) => mapCount + location.maps.length,
    0,
  ) ?? 0) + (hero.maps?.length ?? 0);

export const createEventHeroesTableColumns = ({
  canManage,
  eventId,
  guildId,
  onDeleteHero,
  onEditHero,
  onManageMaps,
  t,
}: CreateEventHeroesTableColumnsOptions): ColumnDef<EventHeroTableRow>[] => {
  const columns: ColumnDef<EventHeroTableRow>[] = [
    {
      id: "hero",
      header: t("events.heroes.columns.hero"),
      cell: ({ row }) => {
        const { hero, stats } = row.original;
        const totalMapsCount = getTotalMapsCount(hero);
        const killCount = stats?.killCount ?? 0;
        const npcProfession = stats?.npcProf?.charAt(0).toLowerCase() ?? "";
        const npcLevelAndProfession =
          hero.npcLvl === null || hero.npcLvl === undefined
            ? null
            : `${hero.npcLvl}${npcProfession}`;

        return (
          <Link
            to="/$guildId/events/$eventId/heroes/$heroId"
            params={{ guildId, eventId, heroId: hero.id }}
            className="flex min-w-0 items-center gap-2.5 rounded-sm py-0.5 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                !hero.npcIcon && "bg-muted/50",
              )}
            >
              {hero.npcIcon ? (
                <NpcTile
                  npc={{
                    id: hero.npcId ?? undefined,
                    name: hero.npcName,
                    icon: hero.npcIcon,
                  }}
                />
              ) : (
                <Swords className="size-4 text-yellow-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="min-w-0 truncate text-sm font-semibold leading-tight">
                  {hero.npcName}
                  {npcLevelAndProfession ? ` (${npcLevelAndProfession})` : ""}
                </span>
                <HeroWindowStatusBadge
                  eventId={eventId}
                  heroId={hero.id}
                  className="hidden h-5 shrink-0 px-1.5 lg:inline-flex"
                />
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-none text-muted-foreground">
                <span>
                  {t("events.heroes.columns.idValue", {
                    id: hero.npcId ?? "—",
                  })}
                </span>
                <span className="lg:hidden" aria-hidden="true">
                  •
                </span>
                <span className="lg:hidden">
                  {t("events.maps.mapCount", { count: totalMapsCount })}
                </span>
                <span className="lg:hidden" aria-hidden="true">
                  •
                </span>
                <span className="lg:hidden">
                  {t("events.heroes.killCount", { count: killCount })}
                </span>
              </div>
            </div>
          </Link>
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
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground"
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
                <ConfirmDeleteDialog
                  onConfirm={() => onDeleteHero(hero.id)}
                  title={t("events.heroes.deleteTitle")}
                  description={t("events.heroes.deleteDescription", {
                    name: hero.npcName,
                  })}
                  trigger={
                    <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:text-destructive data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                      <Trash2 className="size-4" />
                      {t("events.heroes.deleteAction")}
                    </div>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });
  }

  return columns;
};
