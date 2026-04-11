import type { Warrior } from "@/hooks/api/battle-log/use-battles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

interface BlocksBreakdownProps {
  warrior: Warrior;
}

export const BlocksBreakdown: FC<BlocksBreakdownProps> = ({ warrior }) => {
  const { t } = useTranslation();
  const blocksBreakdown = [
    {
      type: t("battleUi.breakdowns.blocks.blocks"),
      value: warrior.blocks,
      color: "text-blue-400",
    },
    {
      type: t("battleUi.breakdowns.blocks.blockedDamage"),
      value: warrior.blockedDamage,
      color: "text-green-400",
    },
  ].filter((item) => item.value > 0);

  if (blocksBreakdown.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        {t("battleUi.breakdowns.blocks.empty")}
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        {t("battleUi.breakdowns.blocks.title", { name: warrior.name })}
      </h4>
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 text-xs">
              {t("battleUi.breakdowns.headers.type")}
            </TableHead>
            <TableHead className="h-8 text-xs text-right">
              {t("battleUi.breakdowns.headers.value")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blocksBreakdown.map((item, index) => (
            <TableRow key={index} className="h-8 hover:bg-transparent">
              <TableCell className={`py-1 ${item.color}`}>
                {item.type}
              </TableCell>
              <TableCell className="py-1 text-right font-medium tabular-nums">
                {item.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
