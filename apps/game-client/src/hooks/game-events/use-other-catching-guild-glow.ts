import { useEffect } from "react";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { characterTooltipCatchingGuildsCoordinator } from "@/lib/character-tooltip-catching-guilds-coordinator";
import {
  getLootlogOtherGlowColor,
  LOOTLOG_OTHER_GLOW_UNKNOWN,
  lootlogOtherGlowManager,
} from "@/lib/margonem-runtime/adapters/glow-runtime-adapter";
import { getCharacterIdentityKey } from "@/lib/character-identity-key";
import {
  getOtherCatchingGuildsTarget,
  type CharacterTooltipCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import {
  EMPTY_SHIFT_VIEW_RECORD,
  useShiftCatchingGuildsGuildId,
} from "./use-shift-catching-guilds-guild-id";

function getEntryCharacterId(targetKey: string): string {
  const separatorIndex = targetKey.lastIndexOf(":");

  return separatorIndex === -1
    ? targetKey
    : targetKey.slice(separatorIndex + 1);
}

export function useOtherCatchingGuildGlow(): void {
  const selectedGuildId = useShiftCatchingGuildsGuildId();
  const active = selectedGuildId !== null;

  const entriesByKey = useCharacterTooltipCatchingGuildsStore((state) =>
    active ? state.entriesByKey : EMPTY_SHIFT_VIEW_RECORD,
  );

  const othersById = useOthersStore((state) =>
    active ? state.othersById : EMPTY_SHIFT_VIEW_RECORD,
  );

  const ownersByCharacterKey = useOnlineCharacterOwnersStore((state) =>
    active ? state.ownersByCharacterKey : EMPTY_SHIFT_VIEW_RECORD,
  );

  useEffect(() => {
    if (!active) return;

    lootlogOtherGlowManager.install();

    return () => {
      lootlogOtherGlowManager.uninstall();
    };
  }, [active]);

  useEffect(
    () => () => {
      lootlogOtherGlowManager.cleanup();
    },
    [],
  );

  useEffect(() => {
    lootlogOtherGlowManager.setNativeGlowSuppressed(active);

    if (selectedGuildId === null) {
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

    const targetsByKey = new Map<
      string,
      CharacterTooltipCatchingGuildsTarget
    >();

    const unavailableKeys: string[] = [];

    for (const other of Object.values(othersById)) {
      const target = getOtherCatchingGuildsTarget(other);

      if (target) {
        if (!targetsByKey.has(target.key)) targetsByKey.set(target.key, target);
      } else if (other.accountId && other.characterId) {
        unavailableKeys.push(
          getCharacterIdentityKey(other.accountId, other.characterId),
        );
      }
    }

    useCharacterTooltipCatchingGuildsStore
      .getState()
      .setUnavailable(unavailableKeys);
    characterTooltipCatchingGuildsCoordinator.sync(
      [...targetsByKey.values()],
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
