import { isConcreteLootlogGuildId } from "@/lib/selected-lootlog-guild";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";

export const EMPTY_SHIFT_VIEW_RECORD: Readonly<Record<string, never>> =
  Object.freeze({});

export function useShiftCatchingGuildsGuildId(): string | null {
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );

  const selectedGuildId = useSelectedLootlogGuildId();

  return isShiftPressed && isConcreteLootlogGuildId(selectedGuildId)
    ? selectedGuildId
    : null;
}
