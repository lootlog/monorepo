import type { CatalogNpcDtoOutput } from "@lootlog/client/catalog";
import type { ReactNode } from "react";
import { t } from "@/i18n/messages";
import { formatCatalogDay } from "@/lib/catalog-days";
import { npcKind, npcProfession } from "@/lib/npc-summary";

type Fact = { label: string; value: ReactNode };

/**
 * The monster's key facts as one ruled line under its heading: its kind, its
 * level and the map it is fought on most. The Locations section lists every
 * map.
 */
export function NpcFacts({ npc }: { npc: CatalogNpcDtoOutput }) {
  const kind = npcKind(npc);
  const profession = npcProfession(npc.prof);
  const topLocation = npc.locations[0];
  const hasOtherMaps = npc.locations.length > 1;

  const facts: Fact[] = [
    ...(kind ? [{ label: t("npc.type"), value: kind }] : []),
    ...(profession ? [{ label: t("npc.profession"), value: profession }] : []),
    {
      label: t("item.level"),
      value: npc.lvl > 0 ? npc.lvl : t("npc.elasticLevel"),
    },
    // A catalog released before first sightings were served sends none.
    ...(npc.firstSeenOn
      ? [
          {
            label: t("npc.firstSeenOn"),
            value: formatCatalogDay(npc.firstSeenOn),
          },
        ]
      : []),
    ...(topLocation
      ? [
          {
            label: t("npc.topMap"),
            value: (
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="[overflow-wrap:anywhere]">
                  {topLocation.map}
                </span>
                {hasOtherMaps ? (
                  <>
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("catalog.locationShare", {
                        share: Math.round(topLocation.share * 100),
                      })}
                    </span>
                    <a
                      href="#npc-locations"
                      className="font-medium text-primary outline-none hover:underline focus-visible:underline"
                    >
                      {t("npc.allMaps", { count: npc.locations.length })}
                    </a>
                  </>
                ) : null}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y border-border/60 py-3">
      {facts.map(({ label, value }) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-sm font-semibold text-foreground tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
