import { useEffect } from "react";
import type { RuntimeOther } from "@/lib/margonem-runtime/runtime.types";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { characterTooltipCatchingGuildsCoordinator } from "@/lib/character-tooltip-catching-guilds-coordinator";
import {
  getLootlogOtherGlowColor,
  LOOTLOG_OTHER_GLOW_UNKNOWN,
  lootlogOtherGlowManager,
} from "@/lib/margonem-runtime/adapters/glow-runtime-adapter";
import { isConcreteLootlogGuildId } from "@/lib/selected-lootlog-guild";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import {
  getOtherCatchingGuildsTarget,
  getCharacterTooltipCatchingGuildsCharacterKey,
  type CharacterTooltipCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { measurePerformance } from "@/lib/performance-monitoring/performance-monitor";

function getEntryCharacterId(targetKey: string): string {
  const separatorIndex = targetKey.lastIndexOf(":");
  return separatorIndex === -1
    ? targetKey
    : targetKey.slice(separatorIndex + 1);
}

function getVisibleCatchingGuildTargets(
  othersById: Readonly<Record<string, RuntimeOther>>,
): CharacterTooltipCatchingGuildsTarget[] {
  const targetsByKey = new Map<string, CharacterTooltipCatchingGuildsTarget>();

  for (const characterId in othersById) {
    const other = othersById[characterId];
    const target = getOtherCatchingGuildsTarget(other);

    if (target && !targetsByKey.has(target.key)) {
      targetsByKey.set(target.key, target);
    }
  }

  return [...targetsByKey.values()];
}

export function useOtherCatchingGuildGlow(): void {
  const entriesByKey = useCharacterTooltipCatchingGuildsStore(
    (state) => state.entriesByKey,
  );
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );
  const othersById = useOthersStore((state) => state.othersById);
  const ownersByCharacterKey = useOnlineCharacterOwnersStore(
    (state) => state.ownersByCharacterKey,
  );
  const selectedGuildId = useSelectedLootlogGuildId();

  useEffect(() => {
    measurePerformance("glow.install", "glow", undefined, () =>
      lootlogOtherGlowManager.install(),
    );

    return () => {
      measurePerformance("glow.cleanup", "glow", undefined, () =>
        lootlogOtherGlowManager.cleanup(),
      );
    };
  }, []);

  useEffect(() => {
    measurePerformance("glow.reconcile", "glow", undefined, () => {
      lootlogOtherGlowManager.setNativeGlowSuppressed(
        isShiftPressed && isConcreteLootlogGuildId(selectedGuildId),
      );

      if (!isShiftPressed || !isConcreteLootlogGuildId(selectedGuildId)) {
        lootlogOtherGlowManager.clear();
        return;
      }

      const visibleCharacterIds = new Set<string>();

      for (const characterId in othersById) {
        const other = othersById[characterId];
        const runtimeHandle = runtimeOtherHandles.get(characterId);
        visibleCharacterIds.add(other.characterId);
        if (!runtimeHandle) continue;

        const target = getOtherCatchingGuildsTarget(other);
        if (!target) {
          lootlogOtherGlowManager.setGlow(
            runtimeHandle,
            LOOTLOG_OTHER_GLOW_UNKNOWN,
          );
          continue;
        }

        lootlogOtherGlowManager.setGlow(
          runtimeHandle,
          getLootlogOtherGlowColor(entriesByKey[target.key], selectedGuildId),
        );
      }

      for (const targetKey of Object.keys(entriesByKey)) {
        const entryCharacterId = getEntryCharacterId(targetKey);
        if (entryCharacterId && !visibleCharacterIds.has(entryCharacterId)) {
          lootlogOtherGlowManager.removeGlow(entryCharacterId);
        }
      }
    });
  }, [
    entriesByKey,
    isShiftPressed,
    othersById,
    ownersByCharacterKey,
    selectedGuildId,
  ]);

  useEffect(() => {
    const active = isShiftPressed && isConcreteLootlogGuildId(selectedGuildId);

    if (active) {
      for (const other of Object.values(othersById)) {
        if (getOtherCatchingGuildsTarget(other)) continue;

        const accountId = other.accountId;
        const characterId = other.characterId;
        if (!accountId || !characterId) continue;

        useCharacterTooltipCatchingGuildsStore
          .getState()
          .setUnavailable(
            getCharacterTooltipCatchingGuildsCharacterKey(
              accountId,
              characterId,
            ),
          );
      }
    }

    characterTooltipCatchingGuildsCoordinator.sync(
      getVisibleCatchingGuildTargets(othersById),
      active,
    );
  }, [isShiftPressed, othersById, ownersByCharacterKey, selectedGuildId]);

  useEffect(
    () => () => {
      characterTooltipCatchingGuildsCoordinator.sync([], false);
    },
    [],
  );
}
