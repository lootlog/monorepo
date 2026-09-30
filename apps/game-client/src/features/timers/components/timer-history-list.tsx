import type { TimerHistoryResponseDto } from "@lootlog/client/main";
import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { TimerHistoryListEntry } from "./timer-history-list-entry";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";

type TimerHistoryListProps = {
  history: TimerHistoryResponseDto[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
  onRestore: (entry: TimerHistoryResponseDto) => void;
  restorePending: boolean;
  rowLayout?: "member" | "npcWithMember";
  title: string;
};

export const TimerHistoryList: FC<TimerHistoryListProps> = ({
  history,
  isLoading,
  isError,
  isFetching,
  onRetry,
  onRestore,
  restorePending,
  rowLayout = "member",
  title,
}) => {
  const { t } = useTranslation(["timers", "common"]);
  const showLoading = isLoading || (isError && isFetching);

  return (
    <div className="ll:flex ll:flex-col ll:gap-2 ll:text-xs">
      <div className="ll:font-semibold ll:text-popover-foreground ll:pt-1">
        {title}
      </div>
      {showLoading && (
        <div className="ll:flex ll:items-center ll:gap-2 ll:text-muted-foreground">
          <Loader2 className="ll:h-4 ll:w-4 ll:animate-spin" />
          {t("history.loading")}
        </div>
      )}
      <AsyncStatusIndicator
        active={isError && !isFetching}
        kind="error"
        label={t("history.loadFailed")}
        onRetry={onRetry}
        retryLabel={t("actions.retry", { ns: "common" })}
      />
      {!showLoading && !isError && history.length === 0 && (
        <div className="ll:text-muted-foreground">{t("history.empty")}</div>
      )}
      {!isLoading && history.length > 0 && (
        <div className="ll:flex ll:flex-col ll:gap-1">
          {history.map((entry) => (
            <TimerHistoryListEntry
              entry={entry}
              key={entry.id}
              onRestore={onRestore}
              restorePending={restorePending}
              rowLayout={rowLayout}
            />
          ))}
        </div>
      )}
    </div>
  );
};
