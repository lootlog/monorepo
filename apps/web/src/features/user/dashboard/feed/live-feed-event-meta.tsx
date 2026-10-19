import { upperFirst } from "es-toolkit";
import { cn } from "cn";
import { LiveFeedTime } from "./live-feed-time";

type Props = {
  /** The NPC's type, coloured like its group. */
  type: string | undefined;
  typeClassName: string;
  world: string;
  location: string | undefined;
  occurredAt: string;
  now: number;
};

/** The second line of a feed tile: type · world · place · time. */
export function LiveFeedEventMeta({
  type,
  typeClassName,
  world,
  location,
  occurredAt,
  now,
}: Props) {
  const place = [upperFirst(world), location].filter(Boolean).join(" · ");

  return (
    <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
      {type && (
        <>
          <span className={cn("shrink-0 font-medium", typeClassName)}>
            {type}
          </span>
          <span aria-hidden>·</span>
        </>
      )}
      <span className="min-w-0 truncate" title={place}>
        {place}
      </span>
      <span aria-hidden>·</span>
      <LiveFeedTime occurredAt={occurredAt} now={now} />
    </p>
  );
}
