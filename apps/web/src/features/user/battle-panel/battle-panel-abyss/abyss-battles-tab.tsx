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
  onCursorChange: (cursor: string | undefined) => void;
  pageIndex: number;
  pageSize: number;
  params: BattleListParams;
};

export function AbyssBattlesTab({
  battlesResponse,
  cursor,
  isLoading,
  onCursorChange,
  pageIndex,
  pageSize,
  params,
}: AbyssBattlesTabProps) {
  const { t } = useTranslation();

  return (
    <section className="flex min-h-[640px] min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">
          {t("battlePanel.abyss.battlesTitle")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("battlePanel.abyss.battlesSubtitle")}
        </p>
      </div>
      <div className="min-h-0 flex-1">
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
          enableScrollToTop
        />
      </div>
    </section>
  );
}
