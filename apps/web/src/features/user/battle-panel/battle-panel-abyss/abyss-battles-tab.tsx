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
    // From md up the list fills the space left on the page and scrolls inside
    // its card, so the table header and pagination stay in view.
    <section
      aria-label={t("battlePanel.abyss.tabs.battles")}
      className="flex min-w-0 flex-col md:min-h-0 md:flex-1"
    >
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
