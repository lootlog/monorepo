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
import { HeroTimerDisplay } from "./hero-timer-display";
import { HeroWindowStatusBadge } from "./hero-window-status-badge";
import type { TFunction } from "i18next";
import type { EventTimer } from "../../hooks/queries/use-event-hero-timers";
import type { EventHeroNpc } from "../../hooks/queries/use-events";

interface HeroStats {
  npcId: number;
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

  return (
    <div className="relative group">
      <Link
        to="/$guildId/events/$eventId/heroes/$heroId"
        params={{
          guildId,
          eventId,
          heroId: hero.id,
        }}
        className="block"
      >
        <Card className="bg-card/40 border-border hover:bg-card/60 hover:border-primary/30 transition-colors cursor-pointer group-hover:border-primary/30 gap-0 py-2 pl-2 pr-2">
          <div className="flex flex-col gap-3 p-2 sm:flex-row sm:items-center sm:gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {hero.npcIcon ? (
                <NpcTile
                  npc={{
                    id: hero.npcId ?? undefined,
                    name: hero.npcName,
                    icon: hero.npcIcon,
                  }}
                />
              ) : (
                <Swords className="w-5 h-5 text-yellow-500" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium break-words">
                  {hero.npcName} {hero.npcLvl ? `(${hero.npcLvl})` : ""}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  ID: {hero.npcId} •{" "}
                  {t("events.maps.mapCount", {
                    count: totalMapsCount,
                  })}{" "}
                  • {t("events.heroes.killCount", { count: killCount })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <HeroWindowStatusBadge
                  eventId={eventId}
                  heroNpcId={hero.npcId}
                  heroName={hero.npcName}
                  className="shrink-0"
                />
                <HeroTimerDisplay timer={timer} t={t} className="shrink-0" />
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.preventDefault()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem onClick={() => onEditHero(hero)}>
                        <Pencil className="mr-2 w-4 h-4" />
                        {t("events.heroes.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onManageMaps(hero)}>
                        <MapIcon className="mr-2 w-4 h-4" />
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
                            <Trash2 className="mr-2 w-4 h-4" />
                            {t("events.heroes.deleteAction")}
                          </div>
                        }
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
};
