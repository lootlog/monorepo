import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CatalogNpcDtoOutput } from "@lootlog/client/catalog";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { t } from "@/i18n/messages";

const SHOWN_LOCATIONS = 12;

const LISTED_TILES = 12;

type Location = CatalogNpcDtoOutput["locations"][number];

type Tile = Location["tiles"][number];

const formatTile = ({ x, y }: Tile) => `${x},${y}`;

const describeSpawnArea = (tiles: Tile[]) => {
  const xs = tiles.map(({ x }) => x);
  const ys = tiles.map(({ y }) => y);

  return t("catalog.spawnArea", {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  });
};

const describeFixedSpawns = (tiles: Tile[]) => {
  const listed = tiles.slice(0, LISTED_TILES).map(formatTile).join(" · ");
  const unlisted = tiles.length - LISTED_TILES;

  return unlisted > 0
    ? t("catalog.spawnTilesMore", { tiles: listed, count: unlisted })
    : listed;
};

const describeSpawnTiles = (tiles: Tile[] | undefined, randomArea: boolean) => {
  const [first] = tiles ?? [];

  if (!tiles || !first) return null;

  if (tiles.length === 1) return formatTile(first);

  return randomArea ? describeSpawnArea(tiles) : describeFixedSpawns(tiles);
};

export function NpcLocations({ npc }: { npc: CatalogNpcDtoOutput }) {
  const { locations } = npc;
  const randomArea = npc.type === "ELITE2";
  const [expanded, setExpanded] = useState(false);

  if (locations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("catalog.noLocationsYet")}
      </p>
    );
  }

  const shown = expanded ? locations : locations.slice(0, SHOWN_LOCATIONS);
  const hidden = locations.length - SHOWN_LOCATIONS;
  const showsShare = locations.length > 1;

  return (
    <div className="flex flex-col gap-2">
      <ul
        id="npc-location-list"
        className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-x-6 rounded-xl border border-border/50 bg-card px-4 py-2"
      >
        {shown.map(({ map, share, tiles }) => {
          const spawn = describeSpawnTiles(tiles, randomArea);

          return (
            <li key={map} className="flex min-w-0 items-baseline gap-3 py-1">
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                  {map}
                </span>
                {spawn ? (
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {spawn}
                  </span>
                ) : null}
              </span>
              {showsShare ? (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t("catalog.locationShare", {
                    share: Math.round(share * 100),
                  })}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs text-muted-foreground">
          {[
            showsShare ? t("catalog.locationsDescription") : null,
            randomArea ? t("catalog.spawnAreaDescription") : null,
          ]
            .filter(Boolean)
            .join(" ")}
        </p>
        {hidden > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls="npc-location-list"
            icon={
              <ChevronDown
                className={cn(
                  "transition-[rotate] duration-200 ease-out motion-reduce:transition-none",
                  expanded && "rotate-180",
                )}
              />
            }
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? t("catalog.showFewerLocations")
              : t("catalog.showAllLocations", { count: locations.length })}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
