import { LoadingSlot } from "@/components/common/loading-slot";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { CalendarX2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RetryButton } from "@/components/common/retry-button";

type ScheduleStatusProps = {
  header: ReactNode;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
};

export const ScheduleStatus = ({
  header,
  isError,
  isRetrying,
  onRetry,
}: ScheduleStatusProps) => {
  const { t } = useTranslation();

  return (
    <ScrollArea data-under-top-bar className="min-h-0 flex-1">
      {header}
      {isError ? (
        <SettingsListEmpty
          icon={CalendarX2}
          title={t("reservations.schedule.error.title")}
          description={t("reservations.schedule.error.description")}
          action={<RetryButton onRetry={onRetry} isRetrying={isRetrying} />}
        />
      ) : (
        <div className="flex justify-center py-16" role="status">
          <LoadingSlot size="small" />
          <span className="sr-only">{t("common.loading")}</span>
        </div>
      )}
    </ScrollArea>
  );
};
