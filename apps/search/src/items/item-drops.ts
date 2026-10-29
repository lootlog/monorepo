import type { GameVersion } from "@lootlog/schema/game-version";
import type { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import { npcCatalogKey, npcMonsterKey } from "#src/npcs/npcs.service";
import { earliestSeenAt, toSeenAt } from "#src/shared/first-seen";
import type { IndexItemsCommand } from "./index-items-command.js";

/** An item keeps this many NPCs it drops from; later sources are not added. */
export const MAX_DROP_SOURCES = 20;

/** An NPC an item drops from, as the NPC catalog names it. */
export type DropSource = {
  key: string;
  /** The monster across its catalog identities, as `npcMonsterKey` names it. */
  monsterKey: string;
  id: number;
  identityNamespace: NpcIdentityNamespace;
  gameVersion: GameVersion;
  name: string;
  lvl: number | null;
  icon: string | null;
  type: string | null;
};

/** What the catalog knows of an item's drops, merged across observations. */
export type ItemDropFields = {
  firstSeenAt: number | null;
  droppedBy: DropSource[];
  droppedByKeys: string[];
  /** The monsters of `droppedBy`, so any identity of one finds its drops. */
  droppedByMonsterKeys: string[];
  /** The NPC types of `droppedBy`, for filtering by the kind of boss. */
  droppedByTypes: string[];
};

type IndexItem = IndexItemsCommand["items"][number];

const toDropSource = (
  npc: NonNullable<IndexItem["droppedBy"]>,
): DropSource | null =>
  // Without a Margonem type the NPC has no catalog entry to link to.
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
  const source = item.droppedBy && toDropSource(item.droppedBy);

  return {
    firstSeenAt: toSeenAt(item.observedAt),
    droppedBy: source ? [source] : [],
    droppedByKeys: source ? [source.key] : [],
    droppedByMonsterKeys: source ? [source.monsterKey] : [],
    droppedByTypes: source?.type ? [source.type] : [],
  };
};

/**
 * One item's drops from two observations: the earliest time either saw it
 * and every NPC either names, the stored ones first. Merging is commutative
 * apart from that order, so redelivered or reordered deliveries settle on the
 * same entry. Documents indexed before these fields existed have none.
 */
export const mergeItemDropFields = (
  incoming: ItemDropFields,
  stored: Partial<ItemDropFields> | undefined,
): ItemDropFields => {
  const sources = new Map<string, DropSource>();

  for (const source of [...(stored?.droppedBy ?? []), ...incoming.droppedBy]) {
    if (!sources.has(source.key) && sources.size < MAX_DROP_SOURCES) {
      sources.set(source.key, source);
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
