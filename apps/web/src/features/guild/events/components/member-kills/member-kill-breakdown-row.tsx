import { TableCell, TableRow } from "@lootlog/ui/components/table";
import type { KillHistoryMemberEntry } from "@lootlog/client/main";
import { MemberKillBreakdown } from "./member-kill-breakdown";

type MemberKillBreakdownRowProps = {
  columnCount: number;
  kill: KillHistoryMemberEntry;
};

export const MemberKillBreakdownRow = ({
  columnCount,
  kill,
}: MemberKillBreakdownRowProps) => (
  <TableRow data-state="expanded-detail">
    <TableCell
      colSpan={columnCount}
      className="h-auto whitespace-normal px-4 py-3"
    >
      <MemberKillBreakdown kill={kill} />
    </TableCell>
  </TableRow>
);
