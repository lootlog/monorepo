import { ensureBattlePanelCharacterId } from "@/features/user/battle-panel/battle-panel-route-loader";
import {
  loadBattlePanelAbyssSeasonSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";
import { getBattlesControllerGetAbyssSeasonsQueryOptions } from "@lootlog/client/battlelog";
import type { QueryClient } from "@tanstack/react-query";
import { findAbyssSeason } from "./abyss-formatters";

/**
 * The season a season route shows, for its loaders. The layout and its tabs
 * load in parallel, so each resolves it; the seasons request is shared.
 */
export const loadAbyssSeasonRoute = async ({
  queryClient,
  searchStr,
  seasonId,
}: {
  queryClient: QueryClient;
  searchStr: string;
  seasonId: string;
}) => {
  const search = loadBattlePanelAbyssSeasonSearch(searchStr);

  const characterId = await ensureBattlePanelCharacterId({
    queryClient,
    characterId: normalizeBattlePanelCharacterId(search.characterId),
  });

  if (!characterId) return { search, characterId, season: undefined };

  const seasons = await ensureRouteQueryData(
    queryClient,
    getBattlesControllerGetAbyssSeasonsQueryOptions({ characterId }),
  );

  return { search, characterId, season: findAbyssSeason(seasons, seasonId) };
};
