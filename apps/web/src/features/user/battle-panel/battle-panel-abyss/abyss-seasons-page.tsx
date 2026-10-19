import { EmptyState } from "@/components/common/empty-state";
import { ResultsSurface } from "@/components/common/results-surface";
import { StatisticsQueryPanel } from "@/features/user/battle-panel/battle-panel-statistics/components/statistics-query-panel";
import {
  battlePanelAbyssSearchParsers,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import { BattleCharacterSelect } from "@/features/user/battle-panel/components/battle-character-select";
import {
  useBattlesControllerGetAbyssSeasons,
  useBattlesControllerGetUserCharacters,
} from "@lootlog/client/battlelog";
import { Swords } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";
import { AbyssSeasonsList } from "./abyss-seasons-list";
import { AbyssSeasonsListSkeleton } from "./abyss-seasons-list-skeleton";

/** A character's Abyss seasons, each opening its battles, opponents and analytics. */
export function AbyssSeasonsPage() {
  const { t } = useTranslation();

  const [queryState, setQueryState] = useQueryStates(
    battlePanelAbyssSearchParsers,
  );

  const characters = useBattlesControllerGetUserCharacters().data?.characters;

  const characterId =
    normalizeBattlePanelCharacterId(queryState.characterId) ??
    characters?.[0]?.id;

  const seasonsQuery = useBattlesControllerGetAbyssSeasons(
    { characterId: characterId ?? "" },
    { query: { enabled: Boolean(characterId) } },
  );

  const seasons = seasonsQuery.data;

  const renderSeasons = () => {
    if (!characterId) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={Swords}
            title={t("battlePanel.statistics.empty.title")}
          />
        </div>
      );
    }

    if (seasonsQuery.isLoading) return <AbyssSeasonsListSkeleton />;

    return (
      <StatisticsQueryPanel query={seasonsQuery}>
        {seasons && seasons.length > 0 ? (
          <AbyssSeasonsList characterId={characterId} seasons={seasons} />
        ) : (
          <div className="p-3">
            <EmptyState
              fill
              icon={Swords}
              title={t("battlePanel.abyss.emptyTitle")}
              description={t("battlePanel.abyss.emptyDescription")}
            />
          </div>
        )}
      </StatisticsQueryPanel>
    );
  };

  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t("battlePanel.abyss.title")}</h1>
      <ResultsSurface
        search={
          <BattleCharacterSelect
            characterId={characterId}
            onCharacterChange={(nextCharacterId) =>
              void setQueryState({ characterId: nextCharacterId ?? null })
            }
          />
        }
        filtersLabel={t("battlePanel.filters.title")}
      >
        {renderSeasons()}
      </ResultsSurface>
    </div>
  );
}
