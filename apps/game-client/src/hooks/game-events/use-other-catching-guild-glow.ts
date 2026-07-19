import { useEffect } from "react";
import type { Other } from "@lootlog/margonem/others";
import { characterTooltipCatchingGuildsCoordinator } from "@/lib/character-tooltip-catching-guilds-coordinator";
import {
  getLootlogOtherGlowColor,
  LOOTLOG_OTHER_GLOW_UNKNOWN,
  lootlogOtherGlowManager,
} from "@/lib/lootlog-other-glow-manager";
import {
  getSelectedLootlogGuildId,
  isConcreteLootlogGuildId,
} from "@/lib/selected-lootlog-guild";
import {
  getOtherCatchingGuildsTarget,
  getCharacterTooltipCatchingGuildsCharacterKey,
  type CharacterTooltipCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { useSettingsStore } from "@/store/settings.store";

function getEntryCharacterId(targetKey: string): string {
  const separatorIndex = targetKey.lastIndexOf(":");
  return separatorIndex === -1
    ? targetKey
    : targetKey.slice(separatorIndex + 1);
}

function getVisibleCatchingGuildTargets(
  othersById: Record<string, Other>,
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
  const guildIdByCharId = useSettingsStore((state) => state.guildIdByCharId);
  const othersById = useOthersStore((state) => state.othersById);
  const ownersByCharacterKey = useOnlineCharacterOwnersStore(
    (state) => state.ownersByCharacterKey,
  );
  const selectedGuildId = getSelectedLootlogGuildId(guildIdByCharId);

  useEffect(() => {
    lootlogOtherGlowManager.install();

    return () => {
      lootlogOtherGlowManager.cleanup();
    };
  }, []);

  useEffect(() => {
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
      visibleCharacterIds.add(String(other.d.id));

      const target = getOtherCatchingGuildsTarget(other);
      if (!target) {
        lootlogOtherGlowManager.setGlow(other, LOOTLOG_OTHER_GLOW_UNKNOWN);
        continue;
      }

      lootlogOtherGlowManager.setGlow(
        other,
        getLootlogOtherGlowColor(entriesByKey[target.key], selectedGuildId),
      );
    }

    for (const targetKey of Object.keys(entriesByKey)) {
      const entryCharacterId = getEntryCharacterId(targetKey);
      if (entryCharacterId && !visibleCharacterIds.has(entryCharacterId)) {
        lootlogOtherGlowManager.removeGlow(entryCharacterId);
      }
    }
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

        const accountId = String(other.d.account ?? "");
        const characterId = String(other.d.id ?? "");
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
