import type { CatalogNpcDtoOutput } from "@lootlog/client/catalog";
import { Infobox } from "@/components/article/infobox";
import { InfoboxRow } from "@/components/article/infobox-row";
import { InfoboxSection } from "@/components/article/infobox-section";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { t } from "@/i18n/messages";
import { npcKind } from "@/lib/npc-summary";
import { NpcFormerLevels } from "./npc-former-levels";

/** The monster's fact box: its sprite, kind, level and where it is fought. */
export function NpcInfobox({ npc }: { npc: CatalogNpcDtoOutput }) {
  const [topLocation] = npc.locations;

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
        {topLocation ? (
          <InfoboxRow label={t("npc.topLocation")}>
            {topLocation.map}
          </InfoboxRow>
        ) : null}
        {npc.locations.length > 1 ? (
          <InfoboxRow label={t("npc.locationCount")}>
            <a
              href="#npc-locations"
              className="text-primary tabular-nums outline-none hover:underline focus-visible:underline"
            >
              {npc.locations.length}
            </a>
          </InfoboxRow>
        ) : null}
      </InfoboxSection>
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
