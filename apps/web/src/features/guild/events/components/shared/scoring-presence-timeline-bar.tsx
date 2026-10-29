import type {
  EventKillPresence,
  PresenceParticipantId,
} from "@lootlog/domain/scoring-presence";
import { cn } from "cn";

/** Group-size shades: one person reads lightest, five or more darkest. */
const SIZE_CLASS_NAMES = [
  "bg-primary/25",
  "bg-primary/40",
  "bg-primary/55",
  "bg-primary/70",
  "bg-primary/85",
];

interface ScoringPresenceTimelineBarProps {
  analysis: EventKillPresence;
  participantId: PresenceParticipantId;
  label: string;
}

/**
 * The respawn window as a ruler: the upper band shades each stretch by how
 * many members watched at once, the lower line marks this participant.
 */
export const ScoringPresenceTimelineBar = ({
  analysis,
  participantId,
  label,
}: ScoringPresenceTimelineBarProps) => {
  const start = analysis.window.start?.getTime();
  const windowMs = analysis.windowMs;

  if (start === undefined || windowMs === null) return null;

  const position = (from: number, to: number) => ({
    left: `${((from - start) / windowMs) * 100}%`,
    width: `${((to - from) / windowMs) * 100}%`,
  });

  const own = analysis.participants.get(participantId)?.intervals ?? [];

  return (
    <div role="img" aria-label={label} className="grid gap-1">
      <div className="relative h-5 overflow-hidden rounded-md bg-muted/50">
        {analysis.segments.map((segment) => (
          <div
            key={segment.start}
            className={cn(
              "absolute inset-y-0 flex items-center justify-center border-r border-background/60 text-[10px] font-semibold tabular-nums text-primary-foreground",
              SIZE_CLASS_NAMES[
                Math.min(segment.size, SIZE_CLASS_NAMES.length) - 1
              ],
            )}
            style={position(segment.start, segment.end)}
          >
            {(segment.end - segment.start) / windowMs > 0.04
              ? segment.size
              : null}
          </div>
        ))}
      </div>
      <div className="relative h-1 rounded-full bg-muted/50">
        {own.map((interval) => (
          <div
            key={interval.start}
            className="absolute inset-y-0 rounded-full bg-foreground/70"
            style={position(interval.start, interval.end)}
          />
        ))}
      </div>
    </div>
  );
};
