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
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <BattlesTable
              battles={SKELETON_BATTLES}
              isLoading
              pagination={SKELETON_PAGINATION}
              toolbar={<BattlesListFilterToolbarSkeleton />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
