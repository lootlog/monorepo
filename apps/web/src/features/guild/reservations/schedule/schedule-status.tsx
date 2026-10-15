import { LoadingSlot } from "@/components/common/loading-slot";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { CalendarX2, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type ScheduleStatusProps = {
  /** The schedule bar, so the dates stay reachable while the hours load. */
  header: ReactNode;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
};

/** Takes the hours' place while a spot's reservations load or fail to. */
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
          action={
            <Button
              type="button"
              variant="outline"
              loading={isRetrying}
              icon=<RotateCcw className="size-3.5" />
              onClick={onRetry}
            >
              {t("common.actions.retry")}
            </Button>
          }
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
