import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import type { CatalogNpcDtoOutput } from "@lootlog/client/catalog";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { t } from "@/i18n/messages";

// A hero spawns on many maps; the most fought ones show first.
const SHOWN_LOCATIONS = 6;

// A few fixed spawns read best one by one; more tiles are an area.
const LISTED_TILES = 3;

type Location = CatalogNpcDtoOutput["locations"][number];

// Margonem writes a tile as `x,y`.
const formatTile = ({ x, y }: Location["tiles"][number]) => `${x},${y}`;

/**
 * Where on the map the monster spawns, or null before any tile is known. A
 * catalog deployed before spawn tiles sends none.
 */
const describeSpawnTiles = (tiles: Location["tiles"] | undefined) => {
  const [first] = tiles ?? [];

  if (!tiles || !first) return null;

  if (tiles.length === 1)
    return t("catalog.spawnTile", { tile: formatTile(first) });

  if (tiles.length <= LISTED_TILES) {
    return t("catalog.spawnTiles", {
      tiles: tiles.map(formatTile).join(" · "),
    });
  }

  const xs = tiles.map(({ x }) => x);
  const ys = tiles.map(({ y }) => y);

  return t("catalog.spawnArea", {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  });
};

/**
 * The maps a monster is fought on, each with its share of the monster's
 * latest recorded fights. A monster on one map shows it without a share.
 */
export function NpcLocations({
  locations,
}: {
  locations: CatalogNpcDtoOutput["locations"];
}) {
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

  const hasTiles = locations.some(
    ({ tiles }) => describeSpawnTiles(tiles) !== null,
  );

  return (
    <div className="flex flex-col gap-3">
      {locations.length > 1 || hasTiles ? (
        <p className="text-sm text-muted-foreground">
          {locations.length > 1 ? t("catalog.locationsDescription") : null}
          {locations.length > 1 && hasTiles ? " " : null}
          {hasTiles ? t("catalog.spawnTilesDescription") : null}
        </p>
      ) : null}
      <ul
        id="npc-location-list"
        className="grid gap-x-6 overflow-hidden rounded-xl border border-border/50 bg-card px-4 py-1 md:grid-cols-2"
      >
        {shown.map(({ map, share, tiles }) => {
          const spawn = describeSpawnTiles(tiles);

          return (
            <li
              key={map}
              className="flex min-h-11 min-w-0 items-center gap-3 border-b border-border/40 py-2 last:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
            >
              <MapPin
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                  {map}
                </span>
                {spawn ? (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {spawn}
                  </span>
                ) : null}
              </span>
              {locations.length > 1 ? (
                <>
                  {/* The share is read from its number; the meter only shows it. */}
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted"
                  >
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${share * 100}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {t("catalog.locationShare", {
                      share: Math.round(share * 100),
                    })}
                  </span>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
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
  );
}
