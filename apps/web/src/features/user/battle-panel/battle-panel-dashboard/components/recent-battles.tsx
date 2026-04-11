import { BattlesList } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list";
import { Button } from "@lootlog/ui/components/button";
import { SectionHeader } from "@/components/layout/section-header";
import { ChevronRight, Swords } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useBattles } from "@/hooks/api/battle-log/use-battles";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import type { BattleFilters } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list-filters";
import { serializeBattlePanelBattlesSearch } from "@/features/user/battle-panel/battle-panel-battles-list/battle-query-parsers";
import { ROUTES } from "@/config/routes";

export const RecentBattles = () => {
  const navigate = useNavigate();
  const { data: battlesResponse, isLoading } = useBattles({
    size: 10,
  });
  const { data: characters } = useBattleCharacters();

  const handleFiltersChange = (filters: BattleFilters) => {
    const queryString = serializeBattlePanelBattlesSearch({
      cursor: null,
      world: filters.world ?? null,
      type: filters.type ?? null,
      search: filters.search ?? null,
      result: filters.result ?? null,
      ph: filters.ph ?? null,
      characterId: filters.characterId ?? null,
      matchmaking: filters.matchmaking ?? null,
    });

    navigate({
      to: `${ROUTES.user.battlePanel.battles}${queryString}` as string,
    });
  };

  return (
    <>
      <SectionHeader
        icon={Swords}
        title="Ostatnie walki"
        subtitle="Twoje ostatnie walki dla wszystkich postaci"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.user.battlePanel.battles}>
              Zobacz wszystkie
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        }
      />

      <BattlesList
        battlesResponse={battlesResponse}
        characters={characters}
        params={{ size: 10 }}
        showPagination={false}
        isLoading={isLoading}
        onFiltersChange={handleFiltersChange}
      />
    </>
  );
};
