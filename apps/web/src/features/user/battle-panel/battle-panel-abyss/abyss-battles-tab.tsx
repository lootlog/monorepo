import { BattlesList } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list";
import type {
  BattleListParams,
  BattleListResponse,
} from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

type AbyssBattlesTabProps = {
  battlesResponse?: BattleListResponse;
  cursor?: string;
  isLoading: boolean;
  isRefreshing: boolean;
  onCursorChange: (cursor: string | undefined) => void;
  pageIndex: number;
  pageSize: number;
  params: BattleListParams;
};

export function AbyssBattlesTab({
  battlesResponse,
  cursor,
  isLoading,
  isRefreshing,
  onCursorChange,
  pageIndex,
  pageSize,
  params,
}: AbyssBattlesTabProps) {
  const { t } = useTranslation();

  return (
    <section aria-label={t("battlePanel.abyss.tabs.battles")}>
      <BattlesList
        battlesResponse={battlesResponse}
        clearFiltersLabel={t("battlePanel.filters.clear")}
        params={{
          ...params,
          cursor,
        }}
        onCursorChange={onCursorChange}
        pageIndex={pageIndex}
        pageSize={pageSize}
        showPagination
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        enableScrollToTop
      />
    </section>
  );
}
