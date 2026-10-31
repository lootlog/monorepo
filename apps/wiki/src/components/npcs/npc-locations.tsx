import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import type { CatalogNpcDtoOutput } from "@lootlog/client/search";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { CATALOG_GRID } from "@/components/catalog/catalog-item-grid";
import { t } from "@/i18n/messages";

// A hero spawns on many maps; the most fought ones show first.
const SHOWN_LOCATIONS = 6;

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

  return (
    <div className="flex flex-col gap-3">
      {locations.length > 1 ? (
        <p className="text-sm text-muted-foreground">
          {t("catalog.locationsDescription")}
        </p>
      ) : null}
      <ul id="npc-location-list" className={CATALOG_GRID}>
        {shown.map(({ map, share }) => (
          <li
            key={map}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5"
          >
            <MapPin
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
              {map}
            </span>
            {locations.length > 1 ? (
              <>
                {/* The share is read from its number; the meter only shows it. */}
                <span
                  aria-hidden="true"
                  className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted"
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
        ))}
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
