import { formatLevel } from "@lootlog/domain/profession";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_HOVER_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@lootlog/ui/lib/list-tile";
import type { EventHeroNpc } from "@/lib/api/event-types";
import { HeroAvatar } from "../shared/hero-avatar";
import { EventHeroActionsMenu } from "./event-hero-actions-menu";
import {
  getTotalMapsCount,
  type EventHeroTableRow,
} from "./event-heroes-table-columns";
import { HeroTimerDisplay } from "./hero-timer-display";

type EventHeroTilesProps = {
  rows: EventHeroTableRow[];
  guildId: string;
  eventId: string;
  canManage: boolean;
  showStandings: boolean;
  onEditHero: (hero: EventHeroNpc) => void;
  onManageMaps: (hero: EventHeroNpc) => void;
  onRequestDeleteHero: (hero: EventHeroNpc) => void;
};

export const EventHeroTiles = ({
  rows,
  guildId,
  eventId,
  canManage,
  showStandings,
  onEditHero,
  onManageMaps,
  onRequestDeleteHero,
}: EventHeroTilesProps) => {
  const { t } = useTranslation();

  return (
    <ul>
      {rows.map(({ hero, stats, timer, score }) => {
        const npcLevel = hero.npcLvl
          ? formatLevel(hero.npcLvl, stats?.npcProf)
          : null;

        const details = [
          t("events.maps.mapCount", { count: getTotalMapsCount(hero) }),
          t("events.heroes.killCount", { count: stats?.killCount ?? 0 }),
          showStandings && score?.place !== undefined
            ? t("events.score.place", { place: score.place })
            : null,
        ].filter(Boolean);

        return (
          <li
            key={hero.id}
            data-list-tile
            className={cn(
              "flex min-h-16 items-center",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_HOVER_CLASS,
            )}
          >
            <Link
              to="/$guildId/events/$eventId/heroes/$heroId"
              params={{ guildId, eventId, heroId: hero.id }}
              className={getListTileLinkClassName(true)}
            >
              <HeroAvatar hero={hero} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {hero.npcName}
                  {npcLevel && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {npcLevel}
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground tabular-nums">
                  {details.join(" · ")}
                </span>
              </span>
            </Link>
            <div className={LIST_TILE_ACTIONS_CLASS}>
              <HeroTimerDisplay
                timer={timer}
                t={t}
                className="rounded-md bg-muted/50 px-2 py-1 ring-1 ring-inset ring-border/70"
              />
              {canManage && (
                <EventHeroActionsMenu
                  hero={hero}
                  onEditHero={onEditHero}
                  onManageMaps={onManageMaps}
                  onRequestDeleteHero={onRequestDeleteHero}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
