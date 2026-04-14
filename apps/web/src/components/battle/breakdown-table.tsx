import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import type { FC } from "react";

export type BreakdownItem = {
  type: string;
  value: number;
  color: string;
};

type BreakdownTableProps = {
  items: BreakdownItem[];
  typeHeader: string;
  valueHeader: string;
};

export const BreakdownTable: FC<BreakdownTableProps> = ({
  items,
  typeHeader,
  valueHeader,
}) => (
  <Table className="text-sm">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="h-8 text-xs">{typeHeader}</TableHead>
        <TableHead className="h-8 text-xs text-right">{valueHeader}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item, index) => (
        <TableRow key={index} className="h-8 hover:bg-transparent">
          <TableCell className={`py-1 ${item.color}`}>{item.type}</TableCell>
          <TableCell className="py-1 text-right font-medium tabular-nums">
            {item.value}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
