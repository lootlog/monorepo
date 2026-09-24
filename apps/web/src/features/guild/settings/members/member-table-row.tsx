import { getSettingsRowLinkProps } from "@/features/guild/settings/components/settings-row-link-props";
import type { GuildMember } from "@/features/guild/settings/members/members.types";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { TableCell, TableRow } from "@lootlog/ui/components/table";
import { flexRender, type Row } from "@tanstack/react-table";
import { cn } from "cn";

import type { MemberTableRowData } from "./use-members-table-columns";

type MemberTableRowProps = {
  row: Row<typeof coreTableFeatures, MemberTableRowData>;
  isLastMember: boolean;
  openMemberDetails: (member: GuildMember) => void;
};

const getMemberTableCellClassName = (columnId: string) => {
  if (columnId === "member") {
    return "min-w-0 overflow-hidden";
  }

  if (columnId === "status") {
    return "overflow-hidden";
  }

  if (columnId === "discord" || columnId === "activity") {
    return "overflow-hidden text-xs text-muted-foreground";
  }

  if (columnId === "visits") {
    return "overflow-hidden text-right text-xs tabular-nums";
  }

  return "text-right";
};

export function MemberTableRow({
  row,
  isLastMember,
  openMemberDetails,
}: MemberTableRowProps) {
  const { member, displayData } = row.original;
  const isOnline = displayData.onlineSources.length > 0;

  return (
    <TableRow
      data-member-id={member.id}
      {...getSettingsRowLinkProps(() => openMemberDetails(member))}
      className={cn(
        "relative h-16 cursor-pointer border-b transition-colors",
        isLastMember && "border-b-0",
        isOnline
          ? "border-emerald-500/20 bg-emerald-500/[0.045] hover:bg-emerald-500/[0.075]"
          : "border-border hover:bg-accent/35",
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={getMemberTableCellClassName(cell.column.id)}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}
