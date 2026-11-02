import { isConcreteLootlogGuildId } from "@/lib/selected-lootlog-guild";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";

/** What an inactive Shift view selects instead of a store collection. */
export const EMPTY_SHIFT_VIEW_RECORD: Readonly<Record<string, never>> =
  Object.freeze({});

/**
 * The Lootlog whose catching guilds Shift shows: the character's selected
 * Lootlog while Shift is held, or null when Shift is released or "all" is
 * selected.
 */
export function useShiftCatchingGuildsGuildId(): string | null {
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );

  const selectedGuildId = useSelectedLootlogGuildId();

  return isShiftPressed && isConcreteLootlogGuildId(selectedGuildId)
    ? selectedGuildId
    : null;
}
