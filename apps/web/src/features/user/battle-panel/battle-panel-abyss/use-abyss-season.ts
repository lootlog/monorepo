import {
  battlePanelAbyssSeasonSearchParsers,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import { useBattlesControllerGetAbyssSeasons } from "@lootlog/client/battlelog";
import { useParams } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { findAbyssSeason } from "./abyss-formatters";

/** The Abyss season a season page shows, with its character. */
export function useAbyssSeason() {
  const { seasonId } = useParams({
    from: "/_authenticated/@me/battle-panel/abyss_/$seasonId",
  });

  const [{ characterId: rawCharacterId }] = useQueryStates(
    battlePanelAbyssSeasonSearchParsers,
  );

  const characterId = normalizeBattlePanelCharacterId(rawCharacterId);

  const seasonsQuery = useBattlesControllerGetAbyssSeasons(
    { characterId: characterId ?? "" },
    { query: { enabled: Boolean(characterId) } },
  );

  const season = seasonsQuery.data
    ? findAbyssSeason(seasonsQuery.data, seasonId)
    : undefined;

  return { characterId, season, seasonsQuery };
}
