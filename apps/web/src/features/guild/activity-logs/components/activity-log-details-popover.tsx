import type { PaginatedActivitiesResponseDtoDataItem } from "@lootlog/client/activity";
import { Button } from "@lootlog/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

type ActivityLogDetailsPopoverProps = {
  activity: PaginatedActivitiesResponseDtoDataItem;
};

export const ActivityLogDetailsPopover = ({
  activity,
}: ActivityLogDetailsPopoverProps) => {
  const { t } = useTranslation();

  const hasDetails = Object.keys(activity.details ?? {}).length > 0;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={t("activityLogs.list.additionalData")}
          >
            <Info aria-hidden="true" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-[340px] p-4">
        <p className="mb-3 text-sm font-semibold">
          {t("activityLogs.list.additionalData")}
        </p>
        <dl className="flex flex-col gap-0.5 text-xs">
          <dt className="text-muted-foreground">ID</dt>
          <dd className="break-all font-mono">{activity.id}</dd>
        </dl>
        {hasDetails && (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap break-all">
            {JSON.stringify(activity.details, null, 2)}
          </pre>
        )}
      </PopoverContent>
    </Popover>
  );
};
