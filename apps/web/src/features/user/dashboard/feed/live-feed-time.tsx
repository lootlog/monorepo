import { formatDistanceStrict } from "date-fns";
import { pl } from "date-fns/locale";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

export const LiveFeedTime = ({
  occurredAt,
  now,
}: {
  occurredAt: string;
  now: number;
}) => {
  const date = new Date(occurredAt);

  return (
    <time
      className="shrink-0 text-xs text-muted-foreground"
      dateTime={occurredAt}
      title={timestampToDate(date)}
    >
      {formatDistanceStrict(date, new Date(now), {
        addSuffix: true,
        locale: pl,
      })}
    </time>
  );
};
