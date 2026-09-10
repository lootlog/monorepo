import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storageKey } from "@/lib/storage-key";
import {
  getHiddenPartyGatheringsScopeKey,
  useHiddenPartyGatheringsStore,
} from "./hidden-party-gatherings.store";

const now = Date.parse("2026-09-10T12:00:00.000Z");

const expiresAt = now + 60_000;

const storageName = storageKey("ll:hidden-party-gatherings:state");

const identity = {
  userId: "user",
  world: "world",
  accountId: "account",
  characterId: "character",
};

const scopeKey = getHiddenPartyGatheringsScopeKey(identity);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  useHiddenPartyGatheringsStore.setState(
    useHiddenPartyGatheringsStore.getInitialState(),
    true,
  );
});

afterEach(() => vi.useRealTimers());

describe("hidden party gatherings", () => {
  it("keeps dismissals after a refresh and restores only the requested gathering", async () => {
    const state = useHiddenPartyGatheringsStore.getState();
    state.hide(scopeKey, "first", expiresAt);
    state.hide(scopeKey, "second", expiresAt);
    const saved = localStorage.getItem(storageName);
    expect(saved).not.toBeNull();
    useHiddenPartyGatheringsStore.setState(
      useHiddenPartyGatheringsStore.getInitialState(),
      true,
    );
    localStorage.setItem(storageName, saved ?? "");
    await useHiddenPartyGatheringsStore.persist.rehydrate();

    expect(state.isHidden(scopeKey, "first")).toBe(true);
    expect(state.isHidden(scopeKey, "second")).toBe(true);
    expect(state.isHidden(scopeKey, "new-gathering")).toBe(false);
    state.restore(scopeKey, "first");
    expect(state.isHidden(scopeKey, "first")).toBe(false);
    expect(state.isHidden(scopeKey, "second")).toBe(true);
    await useHiddenPartyGatheringsStore.persist.rehydrate();
    expect(state.isHidden(scopeKey, "first")).toBe(false);
    expect(state.isHidden(scopeKey, "second")).toBe(true);
  });

  it("isolates the user, world, account and character and ignores incomplete identities", () => {
    const state = useHiddenPartyGatheringsStore.getState();
    state.hide(scopeKey, "gathering", expiresAt);

    for (const field of [
      "userId",
      "world",
      "accountId",
      "characterId",
    ] as const) {
      const otherScope = getHiddenPartyGatheringsScopeKey({
        ...identity,
        [field]: "other",
      });

      expect(state.isHidden(otherScope, "gathering")).toBe(false);
      expect(
        getHiddenPartyGatheringsScopeKey({ ...identity, [field]: undefined }),
      ).toBeNull();
    }

    state.hide(null, "gathering", expiresAt);
    expect(state.isHidden(null, "gathering")).toBe(false);
    expect(
      getHiddenPartyGatheringsScopeKey({
        ...identity,
        userId: "user:world",
        world: "other",
      }),
    ).not.toBe(
      getHiddenPartyGatheringsScopeKey({
        ...identity,
        userId: "user",
        world: "world:other",
      }),
    );
  });

  it("stops hiding at expiry and prunes expired entries when another dismissal is saved", async () => {
    const state = useHiddenPartyGatheringsStore.getState();
    state.hide(scopeKey, "expired", expiresAt);
    vi.setSystemTime(expiresAt);
    expect(state.isHidden(scopeKey, "expired")).toBe(false);
    state.hide(scopeKey, "already-expired", expiresAt);
    state.hide(scopeKey, "invalid-expiry", Number.POSITIVE_INFINITY);
    state.hide(scopeKey, "active", expiresAt + 60_000);
    expect(useHiddenPartyGatheringsStore.getState().hiddenByScope).toEqual({
      [scopeKey ?? ""]: { active: expiresAt + 60_000 },
    });
    vi.setSystemTime(expiresAt + 60_000);
    await useHiddenPartyGatheringsStore.persist.rehydrate();
    expect(useHiddenPartyGatheringsStore.getState().hiddenByScope).toEqual({});
  });

  it("drops malformed persisted entries without replacing actions or valid dismissals", async () => {
    localStorage.setItem(
      storageName,
      JSON.stringify({
        version: 0,
        state: {
          hide: "not an action",
          hiddenByScope: {
            [scopeKey ?? ""]: {
              valid: expiresAt,
              expired: now,
              text: "tomorrow",
              object: { expiresAt },
              decimal: expiresAt + 0.5,
            },
            broken: [],
            missing: null,
          },
        },
      }),
    );
    await useHiddenPartyGatheringsStore.persist.rehydrate();
    const state = useHiddenPartyGatheringsStore.getState();
    expect(state.hiddenByScope).toEqual({
      [scopeKey ?? ""]: { valid: expiresAt },
    });
    state.hide(scopeKey, "next", expiresAt);
    expect(state.isHidden(scopeKey, "next")).toBe(true);
    expect(JSON.parse(localStorage.getItem(storageName) ?? "null")).toEqual({
      version: 0,
      state: {
        hiddenByScope: {
          [scopeKey ?? ""]: { valid: expiresAt, next: expiresAt },
        },
      },
    });
  });
});
