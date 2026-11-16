/**
 * How long a rejection stands in for asking the API again. A Lootlog that
 * starts accepting a loot within this time receives it only afterwards.
 */
const REJECTION_TTL_MS = 10 * 60_000;

const MAX_REJECTIONS = 64;

/** What decides whether any Lootlog of the character accepts a loot. */
export type LootAcceptanceKey = {
  /** The Lootlogs asked and the NPC types of the fight. */
  readonly scope: string;
  readonly rarities: readonly string[];
};

/**
 * The loots the API recently refused for every Lootlog of the character.
 * A Lootlog accepts a loot when its settings allow at least one of the item
 * rarities for the NPC type, so a refusal also covers every loot with a
 * subset of those rarities from the same NPC types. Lootlog settings are not
 * readable by members, which is why the answer is learned and not computed.
 */
export class RejectedLootMemory {
  private rejections: Array<LootAcceptanceKey & { until: number }> = [];

  remember(key: LootAcceptanceKey): void {
    const now = Date.now();

    this.rejections = [
      ...this.rejections
        .filter((rejection) => rejection.until > now)
        .slice(1 - MAX_REJECTIONS),
      { ...key, until: now + REJECTION_TTL_MS },
    ];
  }

  covers(key: LootAcceptanceKey): boolean {
    const now = Date.now();

    return this.rejections.some(
      (rejection) =>
        rejection.until > now &&
        rejection.scope === key.scope &&
        key.rarities.every((rarity) => rejection.rarities.includes(rarity)),
    );
  }
}
