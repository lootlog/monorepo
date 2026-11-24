import {
  type CatalogNpcDtoOutput,
  useCatalogControllerGetItems,
} from "@lootlog/client/catalog";
import { partition } from "es-toolkit";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { DropRateMethod } from "@/components/catalog/drop-rate-method";
import { ItemsByRarity } from "@/components/catalog/items-by-rarity";
import { NpcElasticDropsLevel } from "@/components/npcs/npc-elastic-drops-level";
import { NpcRetiredDrops } from "@/components/npcs/npc-retired-drops";
import { t } from "@/i18n/messages";
import { npcDropsQuery } from "@/lib/catalog-page-queries";
import { isRetiredDropOf, monsterIdentity } from "@/lib/group-items-by-monster";

export function NpcDrops({
  npc,
}: {
  npc: Pick<CatalogNpcDtoOutput, "key" | "name" | "type">;
}) {
  const { data, isError } = useCatalogControllerGetItems(
    npcDropsQuery(npc.key),
  );

  if (!data || isError || data.hits.length === 0) {
    return (
      <CatalogItemGrid
        items={data?.hits}
        isError={isError}
        placeholders={8}
        emptyLabel={t("catalog.noDropsYet")}
        showSource={false}
      />
    );
  }

  const [retired, current] = partition(data.hits, (item) =>
    isRetiredDropOf(item, npc),
  );

  const hasDropRates = current.some(({ droppedBy }) =>
    droppedBy.some(
      (source) =>
        source.dropRate !== null &&
        monsterIdentity(source) === monsterIdentity(npc),
    ),
  );

  return (
    <div className="flex flex-col gap-8">
      {data.hits.some(({ elasticLevel }) => elasticLevel) ? (
        <NpcElasticDropsLevel />
      ) : null}
      {hasDropRates ? <DropRateMethod /> : null}
      {current.length > 0 ? (
        <ItemsByRarity
          items={current}
          idPrefix="npc-drops"
          dropRateOf={hasDropRates ? npc : undefined}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("catalog.noCurrentDrops")}
        </p>
      )}
      {retired.length > 0 ? <NpcRetiredDrops items={retired} /> : null}
    </div>
  );
}
