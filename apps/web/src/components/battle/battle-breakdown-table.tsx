import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";

export type BattleBreakdownRow = {
  type: string;
  value: number | string;
  color: string;
};

type BattleBreakdownTableProps = {
  rows: BattleBreakdownRow[];
  typeLabel: string;
  valueLabel: string;
};

export const BattleBreakdownTable = ({
  rows,
  typeLabel,
  valueLabel,
}: BattleBreakdownTableProps) => {
  return (
    <Table className="text-sm">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-8 text-xs">{typeLabel}</TableHead>
          <TableHead className="h-8 text-xs text-right">{valueLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item, index) => (
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
};
