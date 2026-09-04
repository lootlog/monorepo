import { Fragment } from "react";
import type { TFunction } from "i18next";
import { flexRender, type Cell, type Row } from "@tanstack/react-table";
import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { TableCell, TableRow } from "@lootlog/ui/components/table";
import { cn } from "cn";
import type { MapTimelineData } from "../../types/api";
import { formatTime } from "../../utils/format-date";
import { getKillMapTimelineDiagnostics } from "../../utils/kill-map-timeline-data";
import { MapCoverageTimeline } from "../maps/map-coverage-timeline";
import { KillMapAssignmentGroup } from "./kill-map-assignment-group";
import { KillMapCoverageDiagnostics } from "./kill-map-coverage-diagnostics";
import { KillMapGapAudit } from "./kill-map-gap-audit";
import { getKillMapTimelineColumnClassName } from "./kill-map-timeline-table-utils";

interface KillMapTimelineTableRowProps {
  row: Row<MapTimelineData>;
  visibleCells: Cell<MapTimelineData, unknown>[];
  isExpanded: boolean;
  visibleColumnCount: number;
  startTime: Date;
  endTime: Date;
  memberRoleColors: ReadonlyMap<number, string>;
  t: TFunction;
}

export const KillMapTimelineTableRow = ({
  row,
  visibleCells,
  isExpanded,
  visibleColumnCount,
  startTime,
  endTime,
  memberRoleColors,
  t,
}: KillMapTimelineTableRowProps) => {
  const map = row.original;
  const diagnostics = getKillMapTimelineDiagnostics(map, startTime, endTime);
  const summaryLabelId = `map-${map.mapId}-summary`;
  const detailId = `map-${map.mapId}-details`;
  return (
    <Fragment>
      <TableRow
        data-state={isExpanded ? "expanded" : undefined}
        className="h-14 border-border/70 hover:bg-muted/20 md:h-12"
      >
        {visibleCells.map((cell) => (
          <TableCell
            key={cell.id}
            className={cn(
              "h-14 overflow-hidden px-3 py-0 align-middle md:h-12",
              getKillMapTimelineColumnClassName(cell.column.id),
              cell.column.id === "actions" && "p-0!",
            )}
          >
            {cell.column.id === "actions" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mr-1 size-11 text-muted-foreground lg:mr-3 lg:size-9"
                aria-label={t(
                  isExpanded
                    ? "events.killDetail.mapCoverage.collapseMap"
                    : "events.killDetail.mapCoverage.expandMap",
                  { map: map.mapName },
                )}
                aria-expanded={isExpanded}
                aria-controls={detailId}
                onClick={() => row.toggleExpanded()}
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    isExpanded && "rotate-180",
                  )}
                />
              </Button>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </TableCell>
        ))}
      </TableRow>

      {isExpanded ? (
        <TableRow data-state="expanded-detail" className="border-border/70">
          <TableCell
            colSpan={visibleColumnCount}
            className="h-auto min-w-0 whitespace-normal p-0! align-top"
          >
            <div
              id={detailId}
              aria-labelledby={summaryLabelId}
              className="min-w-0"
            >
              {!diagnostics.isValidWindow ? (
                <div className="flex min-h-20 items-center justify-center gap-2 px-3 text-xs text-muted-foreground">
                  <AlertCircle className="size-4" />
                  {t("events.killDetail.mapCoverage.unavailableData")}
                </div>
              ) : (
                <>
                  <KillMapCoverageDiagnostics diagnostics={diagnostics} t={t} />

                  <div className="px-3 pb-3 pt-3">
                    <MapCoverageTimeline
                      startTime={startTime}
                      endTime={endTime}
                      gaps={diagnostics.gaps}
                      t={t}
                    />
                    <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
                      <span>{formatTime(startTime)}</span>
                      <span>{formatTime(endTime)}</span>
                    </div>
                  </div>

                  {diagnostics.assignments.length > 0 ? (
                    <div className="border-t border-border/60 px-3 pt-2">
                      <p className="flex min-h-8 items-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("events.killDetail.mapCoverage.assignedMembers")}
                      </p>
                      <div className="divide-y divide-border/50">
                        {diagnostics.assignments.map((assignment) => (
                          <KillMapAssignmentGroup
                            key={assignment.memberId}
                            assignment={assignment}
                            roleColor={memberRoleColors.get(
                              assignment.memberId,
                            )}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {diagnostics.gaps.length > 0 ? (
                    <div className="mt-2 border-t border-border/60 px-3 pt-1">
                      <KillMapGapAudit gaps={diagnostics.gaps} t={t} />
                    </div>
                  ) : (
                    <div className="mx-3 mt-2 flex min-h-10 items-center justify-center gap-2 border-t border-border/60 text-xs font-medium text-green-500">
                      <CheckCircle2 className="size-4" />
                      {t("events.killDetail.mapCoverage.fullCoverage")}
                    </div>
                  )}
                </>
              )}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
};
