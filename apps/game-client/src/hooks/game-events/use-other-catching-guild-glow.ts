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
  type CharacterTooltipCatchingGuildsEntry,
  type CharacterTooltipCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";
import {
  type OnlineCharacterOwner,
  useOnlineCharacterOwnersStore,
} from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";

const EMPTY_ENTRIES_BY_KEY: Readonly<
  Record<string, CharacterTooltipCatchingGuildsEntry | undefined>
> = Object.freeze({});
const EMPTY_OTHERS_BY_ID: Readonly<Record<string, RuntimeOther>> =
  Object.freeze({});
const EMPTY_OWNERS_BY_CHARACTER_KEY: Readonly<
  Record<string, OnlineCharacterOwner | undefined>
> = Object.freeze({});

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
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );
  const selectedGuildId = useSelectedLootlogGuildId();
  const active = isShiftPressed && isConcreteLootlogGuildId(selectedGuildId);
  const entriesByKey = useCharacterTooltipCatchingGuildsStore((state) =>
    active ? state.entriesByKey : EMPTY_ENTRIES_BY_KEY,
  );
  const othersById = useOthersStore((state) =>
    active ? state.othersById : EMPTY_OTHERS_BY_ID,
  );
  const ownersByCharacterKey = useOnlineCharacterOwnersStore((state) =>
    active ? state.ownersByCharacterKey : EMPTY_OWNERS_BY_CHARACTER_KEY,
  );

  useEffect(() => {
    if (!active) return;

    lootlogOtherGlowManager.install();

    return () => {
      lootlogOtherGlowManager.cleanup();
    };
  }, [active]);

  useEffect(() => {
    lootlogOtherGlowManager.setNativeGlowSuppressed(active);

    if (!active) {
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
  }, [entriesByKey, active, othersById, ownersByCharacterKey, selectedGuildId]);

  useEffect(() => {
    if (!active) {
      characterTooltipCatchingGuildsCoordinator.sync([], false);
      return;
    }

    for (const other of Object.values(othersById)) {
      if (getOtherCatchingGuildsTarget(other)) continue;

      const accountId = other.accountId;
      const characterId = other.characterId;
      if (!accountId || !characterId) continue;

      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setUnavailable(
          getCharacterTooltipCatchingGuildsCharacterKey(accountId, characterId),
        );
    }

    characterTooltipCatchingGuildsCoordinator.sync(
      getVisibleCatchingGuildTargets(othersById),
      active,
    );
  }, [active, othersById, ownersByCharacterKey]);

  useEffect(
    () => () => {
      characterTooltipCatchingGuildsCoordinator.sync([], false);
    },
    [],
  );
}
