const REJECTION_TTL_MS = 10 * 60_000;

const MAX_REJECTIONS = 64;

export type LootAcceptanceKey = {
  readonly scope: string;
  readonly rarities: readonly string[];
};

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
