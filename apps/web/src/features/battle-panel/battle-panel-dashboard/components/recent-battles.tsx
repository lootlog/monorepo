import { BattlesList } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list";
import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import { ChevronRight } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useBattles } from "@/hooks/api/battle-log/use-battles";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import type { BattleFilters } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list-filters";
import { battleQueryParsers } from "@/features/battle-panel/battle-panel-battles-list/battle-query-parsers";
import { createSerializer } from "nuqs";

export const RecentBattles = () => {
  const navigate = useNavigate();
  const { data: battlesResponse, isLoading } = useBattles({
    page: 1,
    limit: 10,
  });
  const { data: characters } = useBattleCharacters();

  const handleFiltersChange = (filters: BattleFilters) => {
    const serialize = createSerializer(battleQueryParsers);

    const queryString = serialize({
      page: 1,
      world: filters.world ?? null,
      type: filters.type ?? null,
      search: filters.search ?? null,
      result: filters.result ?? null,
      ph: filters.ph ?? null,
      characterId: filters.characterId ?? null,
    });

    navigate({ to: `/@me/battle-panel/battles${queryString}` as string });
  };

  return (
    <div className="flex flex-col">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Ostatnie walki</h2>
            <p className="text-muted-foreground text-sm">
              Twoje ostatnie walki dla wszystkich postaci
            </p>
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link to="/@me/battle-panel/battles">
              Zobacz wszystkie
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
      <Separator />
      <BattlesList
        battlesResponse={battlesResponse}
        characters={characters}
        params={{ page: 1, limit: 10 }}
        showPagination={false}
        isLoading={isLoading}
        onFiltersChange={handleFiltersChange}
      />
    </div>
  );
};
