import { parseFiniteNumber as normalizeNpcWeight } from "@lootlog/schema/numbers";
import { Schema } from "effect";
import { NpcTypeEnum, NpcTypeSchema } from "@lootlog/schema/npc-type";
import {
  getNpcTypeRoutingTier,
  type NpcRoutingData,
  type NpcRoutingTier,
} from "@lootlog/schema/npc-routing";
import { getNpcType, isHeroTrackerName } from "./npc-type.js";

const isNpcTypeEnum = Schema.is(NpcTypeSchema);

const isNumericNpcType = Schema.is(Schema.Number);

export function resolveNpcType(
  npc?: NpcRoutingData | null,
): NpcTypeEnum | null {
  if (!npc) {
    return null;
  }

  if (isNpcTypeEnum(npc.type)) {
    return npc.type;
  }

  // A Hero Tracker reports no weight or profession, which would otherwise
  // route it as a plain NPC to everyone holding the base permission.
  if (npc.name && isHeroTrackerName(npc.name)) {
    return NpcTypeEnum.HERO_TRACKER;
  }

  const weight = normalizeNpcWeight(npc.wt);

  if (weight === null) {
    return null;
  }

  return getNpcType(NpcTypeEnum, {
    wt: weight,
    prof: npc.prof ?? undefined,
    type: isNumericNpcType(npc.type) ? npc.type : undefined,
    icon: npc.icon ?? undefined,
    isHeroFromEvent: npc.isHeroFromEvent,
  });
}

export function getNpcRoutingTier(npc?: NpcRoutingData | null): NpcRoutingTier {
  const npcType = resolveNpcType(npc);

  return npcType ? getNpcTypeRoutingTier(npcType) : "base";
}

/**
 * Whether an NPC source can be classified into a routing tier at all.
 *
 * `getNpcRoutingTier` answers "base" for an NPC it cannot classify, which is
 * the right default for routing but the wrong one for visibility: it would
 * grant an NPC-scoped source to anyone holding the feature's base permission.
 * Visibility callers must deny instead, so they ask this first.
 */
export function isRoutableNpcSource(
  npc?: (NpcRoutingData & { readonly lvl: number }) | null,
): boolean {
  if (!npc) return false;

  // `Number.isFinite` does not coerce, so it also rejects a level that arrived
  // as a non-number from stored or decoded data.
  return (
    Number.isFinite(npc.lvl) && npc.lvl >= 0 && resolveNpcType(npc) !== null
  );
}
