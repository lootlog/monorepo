import { TableCell, TableRow } from "@lootlog/ui/components/table";

type VirtualTableSpacerRowProps = {
  colSpan: number;
  /** Height of the rows it stands in for, from `getVirtualListPadding`. */
  height: number;
};

/**
 * Stands in for the rows of a virtualized table outside the rendered range.
 * It keeps the rows' bottom border: under `border-collapse` a row owns half of
 * each border it touches, so the row after a borderless spacer is half a pixel
 * shorter and the rendered rows shift while scrolling.
 */
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
