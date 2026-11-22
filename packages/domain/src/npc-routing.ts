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

export function isRoutableNpcSource(
  npc?: (NpcRoutingData & { readonly lvl: number }) | null,
): boolean {
  if (!npc) return false;

  return (
    Number.isFinite(npc.lvl) && npc.lvl >= 0 && resolveNpcType(npc) !== null
  );
}
