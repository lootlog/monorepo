import { formatDistanceStrict } from "date-fns";
import { pl } from "date-fns/locale";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

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
      title={dateFormatter.format(date)}
    >
      {formatDistanceStrict(date, new Date(now), {
        addSuffix: true,
        locale: pl,
      })}
    </time>
  );
};
