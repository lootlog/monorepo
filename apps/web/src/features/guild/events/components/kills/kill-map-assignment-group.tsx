import { useState } from "react";
import type { TFunction } from "i18next";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { MemberIdentity } from "@/components/common/member-identity";
import { getDiscordAvatarUrl } from "@lootlog/domain/discord-avatar";
import { cn } from "cn";
import { formatTimeShort } from "../../utils/format-date";
import type { GroupedMapAssignment } from "../../utils/kill-map-timeline-data";
import { formatDuration } from "@/utils/date/format-duration";

interface KillMapAssignmentGroupProps {
  assignment: GroupedMapAssignment;
  t: TFunction;
}

export const KillMapAssignmentGroup = ({
  assignment,
  t,
}: KillMapAssignmentGroupProps) => {
  const [open, setOpen] = useState(false);
  const hasMultiplePeriods = assignment.periods.length > 1;

  const rowContent = (
    <>
      <span className="flex min-w-0 flex-1">
        <span className="pointer-events-auto inline-flex max-w-full min-w-0">
          <MemberIdentity
            member={{ memberId: assignment.memberId }}
            fallback={{
              name: assignment.memberName,
              avatarUrl: getDiscordAvatarUrl(
                assignment.memberUserId,
                assignment.memberAvatar,
                32,
              ),
            }}
            className="gap-2"
            avatarClassName="size-6"
            nameClassName="text-xs font-medium"
          />
        </span>
      </span>
      <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums">
        {formatDuration(assignment.totalDurationSeconds, "human")}
      </span>
      {hasMultiplePeriods ? (
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-emphasized motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      ) : null}
    </>
  );

  if (!hasMultiplePeriods) {
    return (
      <div className="flex min-h-10 items-center gap-2 px-1">{rowContent}</div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* The row toggles the periods; the member on it opens their profile. */}
      <div className="relative rounded-lg transition-colors hover:bg-muted/30">
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t(
                "events.killDetail.mapCoverage.assignmentPeriodsAccessible",
                {
                  member: assignment.memberName,
                  count: assignment.periods.length,
                },
              )}
            />
          }
        />
        <div className="pointer-events-none relative flex min-h-11 w-full items-center gap-2 px-1">
          {rowContent}
        </div>
      </div>
      <CollapsibleContent>
        <div className="ml-8 border-l border-border/60 pl-3">
          {assignment.periods.map((period) => (
            <div
              key={period.id}
              className="flex min-h-8 items-center justify-between gap-3 border-t border-border/50 first:border-t-0"
            >
              <span className="text-2xs tabular-nums text-muted-foreground">
                {formatTimeShort(new Date(period.assignedAt))} –{" "}
                {formatTimeShort(new Date(period.unassignedAt))}
              </span>
              <span className="text-2xs font-medium tabular-nums">
                {formatDuration(period.durationSeconds, "human")}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
