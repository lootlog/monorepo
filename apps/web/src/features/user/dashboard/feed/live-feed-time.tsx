import { formatDistanceStrict } from "date-fns";
import { pl } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

export const LiveFeedTime = ({
  occurredAt,
  now,
}: {
  occurredAt: string;
  now: number;
}) => {
  const { t } = useTranslation();
  const date = new Date(occurredAt);

  return (
    <time
      className="shrink-0 text-xs text-muted-foreground"
      dateTime={occurredAt}
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
