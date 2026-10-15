import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { BattlesListFilterToolbarSkeleton } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list-filter-toolbar-skeleton";
import { BattlesTable } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-table";

const SKELETON_BATTLES: never[] = [];

const SKELETON_PAGINATION = {
  hasNext: false,
  hasPrev: false,
  pageIndex: 0,
  pageSize: 20,
  totalCount: 0,
};

export const BattlePanelBattlesSkeleton = () => {
  return (
    <BattlesTable
      battles={SKELETON_BATTLES}
      isLoading
      pagination={SKELETON_PAGINATION}
      search={<InlineSearchFieldSkeleton />}
      toolbar={<BattlesListFilterToolbarSkeleton />}
    />
  );
};
