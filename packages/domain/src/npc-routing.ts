import { parseFiniteNumber as normalizeNpcWeight } from "@lootlog/schema/numbers";
import { Schema } from "effect";
import { NpcTypeEnum, NpcTypeSchema } from "@lootlog/schema/npc-type";
import type {
  NpcRoutingData,
  NpcRoutingTier,
} from "@lootlog/schema/npc-routing";
import { getNpcTypeByWt } from "./npc-type.js";

const isNpcTypeEnum = Schema.is(NpcTypeSchema);

const isNumericNpcType = Schema.is(Schema.Number);

const HERO_ROUTING_NPC_TYPES = new Set<NpcTypeEnum>([
  NpcTypeEnum.HERO,
  NpcTypeEnum.EVENT_HERO,
]);

export function resolveNpcType(
  npc?: NpcRoutingData | null,
): NpcTypeEnum | null {
  if (!npc) {
    return null;
  }

  if (isNpcTypeEnum(npc.type)) {
    return npc.type;
  }

  const weight = normalizeNpcWeight(npc.wt);

  if (weight === null) {
    return null;
  }

  return getNpcTypeByWt(
    NpcTypeEnum,
    weight,
    npc.prof ?? undefined,
    isNumericNpcType(npc.type) ? npc.type : undefined,
  );
}

export function getNpcRoutingTier(npc?: NpcRoutingData | null): NpcRoutingTier {
  const npcType = resolveNpcType(npc);

  if (npcType === NpcTypeEnum.TITAN) {
    return "titans";
  }

  if (npcType && HERO_ROUTING_NPC_TYPES.has(npcType)) {
    return "heroes";
  }

  return "base";
}
