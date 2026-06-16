import { useEffect } from "react";
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

function dedupeTargets(
  targets: CharacterTooltipCatchingGuildsTarget[],
): CharacterTooltipCatchingGuildsTarget[] {
  const targetsByKey = new Map<string, CharacterTooltipCatchingGuildsTarget>();

  for (const target of targets) {
    if (!targetsByKey.has(target.key)) {
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

    const currentCharacterIds = new Set(
      Object.values(othersById).map((other) => String(other.d.id)),
    );

    for (const characterId of Object.keys(entriesByKey)) {
      const [, entryCharacterId] = characterId.split(":");
      if (entryCharacterId && !currentCharacterIds.has(entryCharacterId)) {
        lootlogOtherGlowManager.removeGlow(entryCharacterId);
      }
    }

    for (const other of Object.values(othersById)) {
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
  }, [entriesByKey, isShiftPressed, othersById, selectedGuildId]);

  useEffect(() => {
    if (!isShiftPressed || !selectedGuildId) return;

    const targets = dedupeTargets(
      Object.values(othersById)
        .map((other) => getOtherCatchingGuildsTarget(other))
        .filter((target): target is CharacterTooltipCatchingGuildsTarget =>
          Boolean(target),
        ),
    );
    const missingTargets = getTargetsMissingSuccessfulCatchingGuilds(
      targets,
    ).slice(0, MAX_BATCH_PLAYERS);

    if (missingTargets.length === 0) return;

    applyCatchingGuildsLoading(missingTargets);

    void userLootlogConfigControllerGetPlayersCatchingGuilds({
      players: missingTargets.map((target) => ({
        accountId: target.accountId,
        characterId: target.characterId,
      })),
    })
      .then((response) => {
        for (const player of response.players) {
          applyCatchingGuildsSuccess(player);
        }
      })
      .catch(() => {
        applyCatchingGuildsError(missingTargets);
      });
  }, [isShiftPressed, othersById, selectedGuildId]);
}
