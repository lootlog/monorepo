import type { GameVersion } from "@lootlog/schema/game-version";
import type { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import { npcCatalogKey, npcMonsterKey } from "#src/npcs/npcs.service";
import { earliestSeenAt, toSeenAt } from "#src/shared/first-seen";
import type { CatalogItemObservation } from "@lootlog/protocol/rabbit/catalog";

const MAX_DROP_MONSTERS = 20;

export type DropSource = {
  key: string;
  monsterKey: string;
  id: number;
  identityNamespace: NpcIdentityNamespace;
  gameVersion: GameVersion;
  name: string;
  lvl: number | null;
  icon: string | null;
  type: string | null;
};

export type ItemDropFields = {
  firstSeenAt: number | null;
  droppedBy: DropSource[];
  droppedByKeys: string[];
  droppedByMonsterKeys: string[];
  droppedByTypes: string[];
};

type IndexItem = CatalogItemObservation;

const toDropSource = (
  npc: NonNullable<IndexItem["droppedBy"]>,
): DropSource | null =>
  npc.margonemType === null
    ? null
    : {
        key: npcCatalogKey({ ...npc, margonemType: npc.margonemType }),
        monsterKey: npcMonsterKey(npc),
        id: npc.id,
        identityNamespace: npc.identityNamespace,
        gameVersion: npc.gameVersion,
        name: npc.name,
        lvl: npc.lvl,
        icon: npc.icon,
        type: npc.type,
      };

export const toItemDropFields = (item: IndexItem): ItemDropFields => {
  const source =
    item.droppedBy?.gameVersion === item.gameVersion
      ? toDropSource(item.droppedBy)
      : null;

  return {
    firstSeenAt: toSeenAt(item.observedAt),
    droppedBy: source ? [source] : [],
    droppedByKeys: source ? [source.key] : [],
    droppedByMonsterKeys: source ? [source.monsterKey] : [],
    droppedByTypes: source?.type ? [source.type] : [],
  };
};

export const mergeItemDropFields = (
  incoming: ItemDropFields,
  stored: Partial<ItemDropFields> | undefined,
): ItemDropFields => {
  const sources = new Map<string, DropSource>();
  const monsters = new Set<string>();

  for (const source of [...(stored?.droppedBy ?? []), ...incoming.droppedBy]) {
    if (
      !sources.has(source.key) &&
      (monsters.has(source.monsterKey) || monsters.size < MAX_DROP_MONSTERS)
    ) {
      sources.set(source.key, source);
      monsters.add(source.monsterKey);
    }
  }

  const droppedBy = [...sources.values()];

  return {
    firstSeenAt: earliestSeenAt(incoming.firstSeenAt, stored?.firstSeenAt),
    droppedBy,
    droppedByKeys: droppedBy.map(({ key }) => key),
    droppedByMonsterKeys: [
      ...new Set(
        droppedBy.flatMap(({ monsterKey }) => (monsterKey ? [monsterKey] : [])),
      ),
    ],
    droppedByTypes: [
      ...new Set(droppedBy.flatMap(({ type }) => (type ? [type] : []))),
    ],
  };
};
