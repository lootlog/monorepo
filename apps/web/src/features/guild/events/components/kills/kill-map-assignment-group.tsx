import { useState } from "react";
import type { TFunction } from "i18next";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { MemberAvatar } from "@/components/common/member-avatar";
import { cn } from "cn";
import { formatTimeShort } from "../../utils/format-date";
import { formatDurationHuman } from "../../utils/format-duration";
import type { GroupedMapAssignment } from "../../utils/kill-map-timeline-data";

interface KillMapAssignmentGroupProps {
  assignment: GroupedMapAssignment;
  roleColor?: string;
  t: TFunction;
}

export const KillMapAssignmentGroup = ({
  assignment,
  roleColor,
  t,
}: KillMapAssignmentGroupProps) => {
  const [open, setOpen] = useState(false);
  const hasMultiplePeriods = assignment.periods.length > 1;

  const rowContent = (
    <>
      <MemberAvatar
        userId={assignment.memberUserId}
        avatar={assignment.memberAvatar}
        name={assignment.memberName}
        imageSize={32}
        className="size-6"
      />
      <span
        className="min-w-0 flex-1 truncate text-xs font-medium"
        style={roleColor ? { color: roleColor } : undefined}
      >
        {assignment.memberName}
      </span>
      <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums">
        {formatDurationHuman(assignment.totalDurationSeconds)}
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
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t(
              "events.killDetail.mapCoverage.assignmentPeriodsAccessible",
              {
                member: assignment.memberName,
                count: assignment.periods.length,
              },
            )}
          >
            {rowContent}
          </button>
        }
      />
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
                {formatDurationHuman(period.durationSeconds)}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
