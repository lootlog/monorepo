import { TableCell, TableRow } from "@lootlog/ui/components/table";

type VirtualTableSpacerRowProps = {
  colSpan: number;
  height: number;
};

export const VirtualTableSpacerRow = ({
  colSpan,
  height,
}: VirtualTableSpacerRowProps) => {
  if (height <= 0) return null;

  return (
    <TableRow aria-hidden="true" className="border-border hover:bg-transparent">
      <TableCell colSpan={colSpan} style={{ height }} />
    </TableRow>
  );
};
