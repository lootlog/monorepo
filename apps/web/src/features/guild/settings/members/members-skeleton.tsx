import { SectionCard } from "@/components/common/section-card/section-card";
import { TableFilterToolbar } from "@/components/ui/table-filter-toolbar";
import { memberTableColumnWidths } from "@/features/guild/settings/members/members.constants";

import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";

const tableRows = Array.from({ length: 10 });

export const MembersSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-3 pb-3">
      <SectionCard className="min-h-0 flex-1 overflow-hidden">
        <TableFilterToolbar>
          <Skeleton className="h-10 w-full rounded-xl sm:min-w-[200px] sm:flex-1" />
          <Skeleton className="h-10 w-full rounded-md sm:w-110" />
          <Skeleton className="h-10 w-48 shrink-0 rounded-xl" />
        </TableFilterToolbar>

        <div className="min-h-0 flex-1 overflow-hidden">
          <Table className="hidden min-w-[994px] table-fixed md:table">
            <colgroup>
              {memberTableColumnWidths.map(([columnId, className]) => (
                <col key={columnId} className={className} />
              ))}
            </colgroup>
            <TableHeader className="bg-background">
              <TableRow className="border-b-1! border-border hover:bg-transparent">
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-12" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="ml-auto h-4 w-14" />
                </TableHead>
                <TableHead>
                  <Skeleton className="ml-auto h-4 w-8" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((_, index) => (
                <TableRow
                  key={index}
                  className="h-14 border-b border-border hover:bg-transparent"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex h-5 items-center">
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex h-5 items-center gap-1">
                          <Skeleton className="size-5 rounded-md" />
                          <Skeleton className="size-5 rounded-md" />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3 w-32" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto size-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="divide-y divide-border md:hidden">
            {tableRows.map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
              >
                <Skeleton className="size-9 rounded-lg" />
                <div className="min-w-0">
                  <div className="flex h-5 items-center">
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="mt-1 flex h-4 items-center">
                    <Skeleton className="h-3 w-40 max-w-full" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-border/70 bg-background/30 px-3 py-2">
          <Skeleton className="h-8 w-72 max-w-full" />
        </div>
      </SectionCard>
    </div>
  );
};
