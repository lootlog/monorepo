import {
  battlePanelHeadToHeadSearchParsers,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import { useBattlesControllerGetUserCharacters } from "@lootlog/client/battlelog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useQueryState } from "nuqs";

/**
 * Stands in for the character filter chip the head-to-head pages show once
 * their loader settles on a character. An account without battle-panel
 * characters loads without it; until the characters arrive, the row assumes
 * the loader will pick the first one.
 */
export const HeadToHeadFilterChipsSkeleton = () => {
  const [characterId] = useQueryState(
    "characterId",
    battlePanelHeadToHeadSearchParsers.characterId,
  );

  const { data: charactersResponse } = useBattlesControllerGetUserCharacters();

  if (
    !normalizeBattlePanelCharacterId(characterId) &&
    charactersResponse?.characters.length === 0
  ) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-b border-border bg-background/55 px-3 py-2">
      <Skeleton className="h-7 w-[88px] rounded-xl" />
      <Skeleton className="ml-auto h-7 w-[98px] rounded-xl" />
    </div>
  );
};
