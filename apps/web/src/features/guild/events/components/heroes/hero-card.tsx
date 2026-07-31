import { Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import {
  Swords,
  ChevronRight,
  Pencil,
  MoreVertical,
  Trash2,
  Map as MapIcon,
} from "lucide-react";
import { NpcTile } from "@/components/tiles";
import { cn } from "@/utils/cn";
import { HeroTimerDisplay } from "./hero-timer-display";
import { HeroWindowStatusBadge } from "./hero-window-status-badge";
import type { TFunction } from "i18next";
import type { EventHeroNpc, EventTimer } from "../../types/api";

interface HeroStats {
  npcId: number | null;
  npcProf: string | null;
  killCount: number;
}

interface HeroCardProps {
  hero: EventHeroNpc;
  timer?: EventTimer;
  stats?: HeroStats;
  guildId: string;
  eventId: string;
  canManage: boolean;
  onEditHero: (hero: EventHeroNpc) => void;
  onManageMaps: (hero: EventHeroNpc) => void;
  onDeleteHero: (heroId: string) => void;
  t: TFunction;
}

export const HeroCard = ({
  hero,
  timer,
  stats,
  guildId,
  eventId,
  canManage,
  onEditHero,
  onManageMaps,
  onDeleteHero,
  t,
}: HeroCardProps) => {
  const killCount = stats?.killCount ?? 0;
  const totalMapsCount =
    (hero.locations?.reduce((sum, loc) => sum + loc.maps.length, 0) ?? 0) +
    (hero.maps?.length ?? 0);
  const npcLevel = hero.npcLvl;
  const npcProfession = stats?.npcProf?.charAt(0).toLowerCase() ?? "";
  const npcLevelAndProfession =
    npcLevel === null || npcLevel === undefined
      ? null
      : `${npcLevel}${npcProfession}`;

  return (
    <Card className="flex-row items-stretch gap-0 overflow-hidden border-border bg-card p-0 transition-colors">
      <Link
        to="/$guildId/events/$eventId/heroes/$heroId"
        params={{
          guildId,
          eventId,
          heroId: hero.id,
        }}
        className="group/hero grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 p-3 outline-none transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset sm:gap-y-1.5 sm:p-3.5"
      >
        <div
          className={cn(
            "col-start-1 row-start-1 flex size-10 shrink-0 items-center justify-center rounded-lg sm:row-span-2",
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

        <div className="row-start-1 flex min-w-0 items-center [grid-column:2/span_1] sm:gap-2">
          <p className="min-w-0 truncate text-sm font-semibold leading-tight">
            {hero.npcName}
            {npcLevelAndProfession ? ` (${npcLevelAndProfession})` : ""}
          </p>
          <HeroWindowStatusBadge
            eventId={eventId}
            heroId={hero.id}
            className="hidden h-5 shrink-0 px-2 text-[11px] sm:inline-flex"
          />
        </div>

        <div className="row-start-2 hidden min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-muted-foreground sm:flex sm:[grid-column:2/span_1]">
          <span>ID: {hero.npcId}</span>
          <span aria-hidden="true">•</span>
          <span>
            {t("events.maps.mapCount", {
              count: totalMapsCount,
            })}
          </span>
          <span aria-hidden="true">•</span>
          <span>{t("events.heroes.killCount", { count: killCount })}</span>
        </div>

        <div className="col-start-3 row-start-1 flex items-center gap-1.5 sm:row-span-2">
          <HeroTimerDisplay
            timer={timer}
            t={t}
            className="rounded-md bg-muted/50 px-2 py-1 text-xs font-semibold tabular-nums ring-1 ring-inset ring-border/70 sm:px-2.5 sm:py-1.5"
          />

          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/hero:translate-x-0.5 group-hover/hero:text-foreground" />
        </div>
      </Link>

      {canManage && (
        <div className="flex shrink-0 items-center border-l border-border px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground"
                aria-label={t("events.heroes.actions")}
                title={t("events.heroes.actions")}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditHero(hero)}>
                <Pencil className="mr-2 size-4" />
                {t("events.heroes.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageMaps(hero)}>
                <MapIcon className="mr-2 size-4" />
                {t("events.heroes.manageMaps")}
              </DropdownMenuItem>
              <ConfirmDeleteDialog
                onConfirm={() => onDeleteHero(hero.id)}
                title={t("events.heroes.deleteTitle")}
                description={t("events.heroes.deleteDescription", {
                  name: hero.npcName,
                })}
                trigger={
                  <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:text-destructive data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                    <Trash2 className="mr-2 size-4" />
                    {t("events.heroes.deleteAction")}
                  </div>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Card>
  );
};
