import { useState } from "react";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
import { useVisibleLootlogGuilds } from "@/hooks/use-visible-lootlog-guilds";
import {
  type GuildSelection,
  getPreferredGuildId,
  getSelectedGuildId,
  resolveStoredGuildIds,
} from "@/features/timers/model/add-timer-guild-selection";

/**
 * Resolves the guild a new timer targets: an explicit choice for the current
 * character context, otherwise the window's initial guild, the saved timers
 * guild, the character's guild, or the first visible one.
 */
export function useAddTimerGuildSelection(initialGuildId: string | undefined) {
  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );

  const { selectedGuildIdsForTimersByCharId, guildIdByCharId } =
    useSettingsStore();

  const { visibleGuilds } = useVisibleLootlogGuilds();
  const [selection, setSelection] = useState<GuildSelection | null>(null);

  const { currentGuildId, savedGuildId } = resolveStoredGuildIds(
    characterId,
    guildIdByCharId,
    selectedGuildIdsForTimersByCharId,
  );

  const contextKey = `${characterId}:${initialGuildId ?? ""}:${savedGuildId ?? ""}`;
  const availableGuildIds = new Set(visibleGuilds.map((guild) => guild.id));

  const preferredGuildId = getPreferredGuildId(
    initialGuildId,
    savedGuildId,
    currentGuildId,
    availableGuildIds,
    visibleGuilds[0]?.id,
  );

  const selectedGuildId = getSelectedGuildId(
    selection,
    contextKey,
    availableGuildIds,
    preferredGuildId,
  );

  const select = (guildId: string) => {
    setSelection({ contextKey, guildId });
  };

  return { selectedGuildId, visibleGuilds, select };
}
