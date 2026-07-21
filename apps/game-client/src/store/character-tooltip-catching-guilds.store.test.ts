import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHARACTER_TOOLTIP_ENTRY_CAP,
  CHARACTER_TOOLTIP_ENTRY_TTL_MS,
  type CharacterTooltipCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "./character-tooltip-catching-guilds.store";

function createTarget(index: number): CharacterTooltipCatchingGuildsTarget {
  return {
    accountId: "account-1",
    characterId: String(index),
    key: `account-1:${index}`,
    playerName: `Player ${index}`,
    requestKey: `user-${index}:account-1:${index}`,
    userId: `user-${index}`,
  };
}

describe("useCharacterTooltipCatchingGuildsStore retention", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    useCharacterTooltipCatchingGuildsStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps only the most recently accessed inactive entries", () => {
    for (let index = 0; index <= CHARACTER_TOOLTIP_ENTRY_CAP; index += 1) {
      vi.setSystemTime(1_000_000 + index);
      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setSuccess(createTarget(index), [], Date.now());
    }

    const entries =
      useCharacterTooltipCatchingGuildsStore.getState().entriesByKey;

    expect(Object.keys(entries)).toHaveLength(CHARACTER_TOOLTIP_ENTRY_CAP);
    expect(entries[createTarget(0).key]).toBeUndefined();
    expect(
      entries[createTarget(CHARACTER_TOOLTIP_ENTRY_CAP).key],
    ).toBeDefined();
  });

  it("expires inactive entries while retaining visible targets", () => {
    const expiredTarget = createTarget(1);
    const visibleTarget = createTarget(2);
    const recentTarget = createTarget(3);
    const store = useCharacterTooltipCatchingGuildsStore.getState();

    store.setSuccess(expiredTarget, [], Date.now());
    store.setSuccess(visibleTarget, [], Date.now());
    store.pruneEntries([visibleTarget.key], Date.now());
    vi.advanceTimersByTime(CHARACTER_TOOLTIP_ENTRY_TTL_MS + 1);
    store.setSuccess(recentTarget, [], Date.now());
    store.pruneEntries([visibleTarget.key], Date.now());

    const entries =
      useCharacterTooltipCatchingGuildsStore.getState().entriesByKey;
    expect(entries[expiredTarget.key]).toBeUndefined();
    expect(entries[visibleTarget.key]).toBeDefined();
    expect(entries[recentTarget.key]).toBeDefined();
  });

  it("retains the current map in addition to the inactive LRU budget", () => {
    const visibleTarget = createTarget(0);
    const store = useCharacterTooltipCatchingGuildsStore.getState();

    store.setSuccess(visibleTarget, [], Date.now());
    store.pruneEntries([visibleTarget.key], Date.now());

    for (let index = 1; index <= CHARACTER_TOOLTIP_ENTRY_CAP; index += 1) {
      vi.setSystemTime(1_000_000 + index);
      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setSuccess(createTarget(index), [], Date.now());
    }

    const entries =
      useCharacterTooltipCatchingGuildsStore.getState().entriesByKey;

    expect(Object.keys(entries)).toHaveLength(CHARACTER_TOOLTIP_ENTRY_CAP + 1);
    expect(entries[visibleTarget.key]).toBeDefined();
    expect(entries[createTarget(1).key]).toBeDefined();
  });
});
