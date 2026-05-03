import type { TimerHistoryResponseDto } from "@/lib/api/generated/main/model";
import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { TimerHistoryListEntry } from "./timer-history-list-entry";

type TimerHistoryListProps = {
  history: TimerHistoryResponseDto[];
  isLoading: boolean;
  onRestore: (entry: TimerHistoryResponseDto) => void;
  restorePending: boolean;
  rowLayout?: "member" | "npcWithMember";
  title: string;
};

export const TimerHistoryList: FC<TimerHistoryListProps> = ({
  history,
  isLoading,
  onRestore,
  restorePending,
  rowLayout = "member",
  title,
}) => {
  const { t } = useTranslation("timers");

  return (
    <div className="ll:flex ll:flex-col ll:gap-2 ll:text-xs">
      <div className="ll:font-semibold ll:text-white ll:pt-1">{title}</div>
      {isLoading && (
        <div className="ll:flex ll:items-center ll:gap-2 ll:text-gray-300">
          <Loader2 className="ll:h-4 ll:w-4 ll:animate-spin" />
          {t("history.loading")}
        </div>
      )}
      {!isLoading && history.length === 0 && (
        <div className="ll:text-gray-400">{t("history.empty")}</div>
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
