import { useEffect } from "react";
import type { Other } from "@lootlog/margonem/others";
import { userLootlogConfigControllerGetPlayersCatchingGuilds } from "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config";
import {
  applyCatchingGuildsError,
  applyCatchingGuildsLoading,
  applyCatchingGuildsSuccess,
  getTargetsMissingSuccessfulCatchingGuilds,
} from "@/lib/character-tooltip-catching-guilds-cache";
import {
  LOOTLOG_OTHER_GLOW_BLUE,
  LOOTLOG_OTHER_GLOW_RED_ORANGE,
  lootlogOtherGlowManager,
} from "@/lib/lootlog-other-glow-manager";
import { Game } from "@/lib/game";
import {
  getOtherCatchingGuildsTarget,
  type CharacterTooltipCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { useSettingsStore } from "@/store/settings.store";

const MAX_BATCH_PLAYERS = 100;

function getCurrentCharacterId(): string | null {
  try {
    return String(Game.hero.id);
  } catch {
    return null;
  }
}

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
  const currentCharacterId = getCurrentCharacterId();
  const selectedGuildId = currentCharacterId
    ? guildIdByCharId[currentCharacterId]
    : undefined;

  useEffect(() => {
    lootlogOtherGlowManager.install();

    return () => {
      lootlogOtherGlowManager.cleanup();
    };
  }, []);

  useEffect(() => {
    lootlogOtherGlowManager.setNativeGlowSuppressed(
      isShiftPressed && Boolean(selectedGuildId),
    );

    if (!isShiftPressed || !selectedGuildId) {
      lootlogOtherGlowManager.clear();
      return;
    }

    const visibleCharacterIds = new Set<string>();

    for (const characterId in othersById) {
      const other = othersById[characterId];
      visibleCharacterIds.add(String(other.d.id));

      const target = getOtherCatchingGuildsTarget(other);
      if (!target) continue;

      const entry = entriesByKey[target.key];
      if (entry?.status !== "success") {
        lootlogOtherGlowManager.removeGlow(target.characterId);
        continue;
      }

      const hasSelectedGuild = entry.guilds.some(
        (guild) => guild.id === selectedGuildId,
      );

      lootlogOtherGlowManager.setGlow(
        other,
        hasSelectedGuild
          ? LOOTLOG_OTHER_GLOW_BLUE
          : LOOTLOG_OTHER_GLOW_RED_ORANGE,
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
    if (!isShiftPressed || !selectedGuildId) return;

    let cancelled = false;

    const fetchNextMissingTargetsBatch = (): void => {
      if (cancelled) return;

      const targets = getVisibleCatchingGuildTargets(othersById);
      const missingTargets = getTargetsMissingSuccessfulCatchingGuilds(
        targets,
      ).slice(0, MAX_BATCH_PLAYERS);

      if (missingTargets.length === 0) return;

      applyCatchingGuildsLoading(missingTargets);

      void Promise.resolve(
        userLootlogConfigControllerGetPlayersCatchingGuilds({
          players: missingTargets.map((target) => ({
            userId: target.userId,
            accountId: target.accountId,
            characterId: target.characterId,
          })),
        }),
      )
        .then((response) => {
          if (cancelled) return;

          for (const player of response.players) {
            applyCatchingGuildsSuccess(player);
          }

          fetchNextMissingTargetsBatch();
        })
        .catch(() => {
          if (!cancelled) {
            applyCatchingGuildsError(missingTargets);
          }
        });
    };

    fetchNextMissingTargetsBatch();

    return () => {
      cancelled = true;
    };
  }, [isShiftPressed, othersById, ownersByCharacterKey, selectedGuildId]);
}
