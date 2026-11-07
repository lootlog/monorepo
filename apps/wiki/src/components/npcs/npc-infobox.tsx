import type { CatalogNpcDtoOutput } from "@lootlog/client/search";
import { Infobox } from "@/components/article/infobox";
import { InfoboxRow } from "@/components/article/infobox-row";
import { InfoboxSection } from "@/components/article/infobox-section";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { t } from "@/i18n/messages";
import { npcKind } from "@/lib/npc-summary";
import { NpcFormerLevels } from "./npc-former-levels";

// The card lists the most fought maps; the Locations section lists them all.
const INFOBOX_LOCATIONS = 5;

/** The monster's fact box: its sprite, kind, level and the maps it is fought on most. */
export function NpcInfobox({ npc }: { npc: CatalogNpcDtoOutput }) {
  const shownLocations = npc.locations.slice(0, INFOBOX_LOCATIONS);

  return (
    <Infobox
      title={npc.name}
      subtitle={npcKind(npc)}
      media={<NpcPortrait key={npc.icon} icon={npc.icon} size="lg" />}
    >
      <InfoboxSection title={t("npc.factsTitle")}>
        <InfoboxRow label={t("npc.type")}>{npcKind(npc)}</InfoboxRow>
        <InfoboxRow label={t("item.level")}>
          {npc.lvl > 0 ? (
            <span className="tabular-nums">{npc.lvl}</span>
          ) : (
            <span className="text-muted-foreground">
              {t("npc.elasticLevel")}
            </span>
          )}
        </InfoboxRow>
      </InfoboxSection>
      {shownLocations.length > 0 ? (
        <InfoboxSection
          title={t("npc.mapsTitle")}
          footer={
            npc.locations.length > INFOBOX_LOCATIONS ? (
              <p className="px-4 pt-0.5 pb-1.5 text-sm">
                <a
                  href="#npc-locations"
                  className="font-medium text-primary outline-none hover:underline focus-visible:underline"
                >
                  {t("npc.allMaps", { count: npc.locations.length })}
                </a>
              </p>
            ) : null
          }
        >
          {shownLocations.map(({ map, share }) => (
            <div
              key={map}
              className="flex items-baseline gap-3 px-4 py-1.5 text-sm"
            >
              <dt className="min-w-0 flex-1 font-medium text-foreground [overflow-wrap:anywhere]">
                {map}
              </dt>
              {npc.locations.length > 1 ? (
                <dd className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t("catalog.locationShare", {
                    share: Math.round(share * 100),
                  })}
                </dd>
              ) : null}
            </div>
          ))}
        </InfoboxSection>
      ) : null}
      {npc.formerLevels.length > 0 ? (
        <InfoboxSection title={t("npc.historyTitle")}>
          <div className="px-4 py-1.5">
            <NpcFormerLevels formerLevels={npc.formerLevels} />
          </div>
        </InfoboxSection>
      ) : null}
    </Infobox>
  );
}
