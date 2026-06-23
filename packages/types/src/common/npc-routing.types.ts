import { NpcTypeEnum, getNpcTypeByWt } from "./npc-type.types.js";

export type NpcRoutingTier = "base" | "titans" | "heroes";

export type NpcRoutingData = {
  prof?: string | null;
  type?: number | string | null;
  wt?: number | string | null;
};

const NPC_TYPE_VALUES = new Set<NpcTypeEnum>(Object.values(NpcTypeEnum));
const HERO_ROUTING_NPC_TYPES = new Set<NpcTypeEnum>([
  NpcTypeEnum.HERO,
  NpcTypeEnum.EVENT_HERO,
]);

function isNpcTypeEnum(value: string): value is NpcTypeEnum {
  return NPC_TYPE_VALUES.has(value as NpcTypeEnum);
}

function normalizeNpcWeight(weight?: number | string | null): number | null {
  if (typeof weight === "number" && Number.isFinite(weight)) {
    return weight;
  }

  if (typeof weight === "string" && weight.trim() !== "") {
    const parsedWeight = Number(weight);

    if (Number.isFinite(parsedWeight)) {
      return parsedWeight;
    }
  }

  return null;
}

export function resolveNpcType(
  npc?: NpcRoutingData | null,
): NpcTypeEnum | null {
  if (!npc) {
    return null;
  }

  if (typeof npc.type === "string" && isNpcTypeEnum(npc.type)) {
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
    typeof npc.type === "number" ? npc.type : undefined,
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
