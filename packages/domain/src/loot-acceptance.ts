import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";

export type LootRejectionReason =
  | "NOT_ON_CHARACTER_WHITELIST"
  | "MISSING_LOOTLOG_CONFIG"
  | "LOOT_NOT_ACCEPTED_BY_CONFIG"
  | "MISSING_MEMBER";

export type LootAcceptanceConfig = {
  readonly npcs: ReadonlyArray<{
    readonly npcType: NpcType;
    readonly allowedRarities: readonly ItemRarity[];
  }>;
};

/**
 * What the deciding side knows about one loot submission. Every input left
 * `undefined` is unknown to the caller and never rejects an Organization:
 * the API passes everything it loads, while a game client passes only what
 * it holds and therefore skips only submissions the API would reject.
 */
export type LootAcceptanceInput<TMember> = {
  /** Organizations where the submitter may write loot, in response order. */
  readonly organizationIds?: readonly string[];
  /** Organizations the character catches for. */
  readonly catchingGuildIds: readonly string[];
  readonly configs?: ReadonlyMap<string, LootAcceptanceConfig>;
  readonly members?: ReadonlyMap<string, TMember>;
  readonly loot?: {
    /** Type of the strongest NPC of the loot. */
    readonly npcType: NpcType;
    readonly rarities: ReadonlyArray<ItemRarity | undefined>;
  };
};

export type LootAcceptance<TMember> = {
  readonly accepted: Array<{
    readonly organizationId: string;
    readonly member: TMember | undefined;
  }>;
  readonly rejected: Array<{
    readonly organizationId: string;
    readonly reason: LootRejectionReason;
  }>;
};

const isAcceptedByConfig = (
  config: LootAcceptanceConfig,
  loot: NonNullable<LootAcceptanceInput<unknown>["loot"]>,
) => {
  const npcConfig = config.npcs.find((npc) => npc.npcType === loot.npcType);

  return (
    npcConfig !== undefined &&
    loot.rarities.some(
      (rarity) =>
        rarity !== undefined && npcConfig.allowedRarities.includes(rarity),
    )
  );
};

const getRejectionReason = (
  organizationId: string,
  catchingGuildIds: ReadonlySet<string>,
  input: LootAcceptanceInput<unknown>,
): LootRejectionReason | null => {
  if (!catchingGuildIds.has(organizationId)) {
    return "NOT_ON_CHARACTER_WHITELIST";
  }

  if (input.configs) {
    const config = input.configs.get(organizationId);

    if (!config) return "MISSING_LOOTLOG_CONFIG";

    if (input.loot && !isAcceptedByConfig(config, input.loot)) {
      return "LOOT_NOT_ACCEPTED_BY_CONFIG";
    }
  }

  if (input.members && !input.members.has(organizationId)) {
    return "MISSING_MEMBER";
  }

  return null;
};

/**
 * Decides which Organizations accept a loot. A submission with no accepted
 * Organization is rejected by the API.
 */
export const resolveLootAcceptance = <TMember>(
  input: LootAcceptanceInput<TMember>,
): LootAcceptance<TMember> => {
  const catchingGuildIds = new Set(input.catchingGuildIds);
  const acceptance: LootAcceptance<TMember> = { accepted: [], rejected: [] };

  for (const organizationId of input.organizationIds ?? catchingGuildIds) {
    const reason = getRejectionReason(organizationId, catchingGuildIds, input);

    if (reason === null) {
      acceptance.accepted.push({
        organizationId,
        member: input.members?.get(organizationId),
      });
    } else {
      acceptance.rejected.push({ organizationId, reason });
    }
  }

  return acceptance;
};
