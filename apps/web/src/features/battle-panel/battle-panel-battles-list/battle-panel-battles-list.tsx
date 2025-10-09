import { BattlesList } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list";
import { useState } from "react";
import type { BattleFilters } from "./components/battles-list-filters";

export const BattlePanelBattlesList = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<BattleFilters>({});
  const pageLimit = 20;

  const handleFiltersChange = (newFilters: BattleFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  return (
    <div className="h-full">
      <BattlesList
        params={{
          page: currentPage,
          limit: pageLimit,
          world: filters.world,
          type: filters.type,
          search: filters.search,
        }}
        onPageChange={setCurrentPage}
        onFiltersChange={handleFiltersChange}
        showPagination={true}
        showFilters={true}
      />
    </div>
  );
};
