import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";

type HiddenPartyGatherings = Record<string, Record<string, number>>;

const persistedHiddenGatheringsSchema = z
  .object({
    hiddenByScope: z
      .record(
        z.string(),
        z.record(z.string(), z.number().int().catch(0)).catch({}),
      )
      .catch({}),
  })
  .catch({ hiddenByScope: {} });

type HiddenPartyGatheringsState = {
  hiddenByScope: HiddenPartyGatherings;
  hide: (
    scopeKey: string | null,
    notificationId: string,
    expiresAt: number,
  ) => void;
  restore: (scopeKey: string | null, notificationId: string) => void;
  isHidden: (
    scopeKey: string | null,
    notificationId: string,
    now?: number,
  ) => boolean;
};

export const getHiddenPartyGatheringsScopeKey = (scope: {
  userId: string | null | undefined;
  world: string | null | undefined;
  accountId: string | null | undefined;
  characterId: string | null | undefined;
}): string | null => {
  const parts = [scope.userId, scope.world, scope.accountId, scope.characterId];

  return parts.every(Boolean) ? JSON.stringify(parts) : null;
};

const activeHiddenGatherings = (
  hiddenByScope: HiddenPartyGatherings,
  now: number,
): HiddenPartyGatherings => {
  return Object.fromEntries(
    Object.entries(hiddenByScope).flatMap(([scopeKey, entries]) => {
      if (!scopeKey) return [];

      const active = Object.entries(entries).filter(
        ([id, expiry]) => id && expiry > now,
      );

      return active.length ? [[scopeKey, Object.fromEntries(active)]] : [];
    }),
  );
};

export const useHiddenPartyGatheringsStore =
  create<HiddenPartyGatheringsState>()(
    persist(
      (set, get) => ({
        hiddenByScope: {},
        hide: (scopeKey, notificationId, expiresAt) => {
          const now = Date.now();

          if (
            !scopeKey ||
            !notificationId ||
            !Number.isSafeInteger(expiresAt) ||
            expiresAt <= now
          ) {
            return;
          }

          set((state) => {
            const hiddenByScope = activeHiddenGatherings(
              state.hiddenByScope,
              now,
            );

            return {
              hiddenByScope: {
                ...hiddenByScope,
                [scopeKey]: {
                  ...hiddenByScope[scopeKey],
                  [notificationId]: expiresAt,
                },
              },
            };
          });
        },
        restore: (scopeKey, notificationId) => {
          if (!scopeKey) return;
          set((state) => {
            const hiddenByScope = activeHiddenGatherings(
              state.hiddenByScope,
              Date.now(),
            );

            const entries = hiddenByScope[scopeKey];

            if (entries) {
              delete entries[notificationId];

              if (!Object.keys(entries).length) delete hiddenByScope[scopeKey];
            }

            return { hiddenByScope };
          });
        },
        isHidden: (scopeKey, notificationId, now = Date.now()) =>
          Boolean(
            scopeKey &&
            (get().hiddenByScope[scopeKey]?.[notificationId] ?? 0) > now,
          ),
      }),
      {
        name: storageKey("ll:hidden-party-gatherings:state"),
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ hiddenByScope: state.hiddenByScope }),
        merge: (persisted, current) => ({
          ...current,
          hiddenByScope: activeHiddenGatherings(
            persistedHiddenGatheringsSchema.parse(persisted).hiddenByScope,
            Date.now(),
          ),
        }),
      },
    ),
  );
