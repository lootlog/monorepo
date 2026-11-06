import {
  type CatalogNpcDtoOutput,
  useCatalogControllerGetItems,
} from "@lootlog/client/search";
import { partition } from "es-toolkit";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { ItemsByRarity } from "@/components/catalog/items-by-rarity";
import { NpcElasticDropsLevel } from "@/components/npcs/npc-elastic-drops-level";
import { NpcRetiredDrops } from "@/components/npcs/npc-retired-drops";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { monsterIdentity } from "@/lib/group-items-by-monster";

const DROPS_LIMIT = 96;

/**
 * A monster's drops, the most valuable rarity first, highest level within
 * each, with how often a boss's kills drop them; the items it no longer
 * drops follow, folded away. Drops that take
 * their looter's level come with the character level they show at.
 */
export function NpcDrops({
  npc,
}: {
  npc: Pick<CatalogNpcDtoOutput, "key" | "name" | "type">;
}) {
  const { data, isError } = useCatalogControllerGetItems({
    droppedBy: npc.key,
    gameVersion: WIKI_GAME_VERSION,
    sort: "lvl:desc",
    limit: DROPS_LIMIT,
  });

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
    item.droppedBy.some(
      (source) =>
        source.retired && monsterIdentity(source) === monsterIdentity(npc),
    ),
  );

  // Only bosses Lootlog counts kills of have drop rates.
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
      {hasDropRates ? (
        <p className="max-w-3xl text-sm text-pretty text-muted-foreground">
          {t("catalog.dropRatesDescription")}
        </p>
      ) : null}
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
