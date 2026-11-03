import { formatDistanceStrict } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

type RelativeTimeProps = {
  /** An ISO timestamp. */
  at: string;
  /** The current time, ticking with the list, such as `useMinuteTimestamp`. */
  now: number;
  className?: string;
};

/** How long ago something happened, with its exact time on hover. */
export const RelativeTime = ({ at, now, className }: RelativeTimeProps) => {
  const { t } = useTranslation();
  const date = new Date(at);

  return (
    <time
      className={cn("shrink-0 text-xs text-muted-foreground", className)}
      dateTime={at}
      title={timestampToDate(date)}
    >
      {/* `now` ticks once a minute, so live entries can be newer than it. */}
      {now - date.getTime() < 60_000
        ? t("statistics.feedJustNow")
        : formatDistanceStrict(date, new Date(now), {
            addSuffix: true,
            locale: pl,
          })}
    </time>
  );
};
