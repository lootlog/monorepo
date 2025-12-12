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
import type { EventTimer } from "../hooks/queries/use-event-hero-timers";

interface HeroStats {
  npcId: number;
  killCount: number;
}

interface Hero {
  id: string;
  npcId: number | null;
  npcName: string;
  npcIcon?: string | null;
  locations?: { maps: { id: string }[] }[];
  maps?: { id: string; mapId: number; mapName: string }[];
}

interface HeroCardProps {
  hero: Hero;
  timer?: EventTimer;
  stats?: HeroStats;
  guildId: string;
  eventId: string;
  canManage: boolean;
  onEditHero: (hero: Hero) => void;
  onManageMaps: (hero: Hero) => void;
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
        <Card className="bg-card/40 backdrop-blur-sm border-border hover:bg-card/60 hover:border-primary/30 transition-colors cursor-pointer group-hover:border-primary/30 gap-0 py-2 pl-2 pr-2">
          <div className="p-2 flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
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
                <p className="font-medium text-sm">{hero.npcName}</p>
                <p className="text-xs text-muted-foreground">
                  ID: {hero.npcId} •{" "}
                  {t("events.maps.mapCount", {
                    count: totalMapsCount,
                  })}{" "}
                  • {t("events.heroes.killCount", { count: killCount })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <HeroWindowStatusBadge
                eventId={eventId}
                heroNpcId={hero.npcId}
                heroName={hero.npcName}
              />
              <HeroTimerDisplay timer={timer} t={t} />
            </div>
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
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onEditHero(hero)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edytuj
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onManageMaps(hero)}>
                    <MapIcon className="w-4 h-4 mr-2" />
                    Mapy
                  </DropdownMenuItem>
                  <ConfirmDeleteDialog
                    onConfirm={() => onDeleteHero(hero.id)}
                    title="Usunąć herosa?"
                    description={`Czy na pewno chcesz usunąć herosa ${hero.npcName}? Spowoduje to również usunięcie wszystkich powiązanych map.`}
                    trigger={
                      <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Usuń
                      </div>
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        </Card>
      </Link>
    </div>
  );
};
