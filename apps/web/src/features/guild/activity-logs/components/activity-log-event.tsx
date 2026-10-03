import type { PaginatedActivitiesResponseDtoDataItem } from "@lootlog/client/activity";
import { cn } from "cn";
import { LogIn, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

const EVENT_PRESENTATION = {
  CONNECT_EVENT: {
    icon: LogIn,
    className: "bg-signal-ready/10 text-signal-ready",
  },
  DISCONNECT_EVENT: {
    icon: LogOut,
    className: "bg-destructive/10 text-destructive",
  },
} as const;

type ActivityLogEventProps = {
  type: PaginatedActivitiesResponseDtoDataItem["type"];
};

export const ActivityLogEvent = ({ type }: ActivityLogEventProps) => {
  const { t } = useTranslation();
  const { icon: Icon, className } = EVENT_PRESENTATION[type];

  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          className,
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="truncate text-sm font-medium">
        {t(`activityLogs.list.types.${type}`)}
      </span>
    </span>
  );
};
