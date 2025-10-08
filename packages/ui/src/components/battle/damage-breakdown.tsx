import { SharedWarrior } from "../../types/battle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table";
import { FC } from "react";

interface DamageBreakdownProps {
  warrior: SharedWarrior;
}

export const DamageBreakdown: FC<DamageBreakdownProps> = ({ warrior }) => {
  const damageBreakdown = [
    {
      type: "Obrażenia od ran",
      value: warrior.woundDamageTaken,
      color: "text-red-400",
    },
    {
      type: "Obrażenia od trucizny",
      value: warrior.poisonDamageTaken,
      color: "text-green-400",
    },
    {
      type: "Obrażenia od urazów",
      value: warrior.injureDamageTaken,
      color: "text-yellow-400",
    },
    {
      type: "Krytyczne obrażenia od ran",
      value: warrior.critWoundDamageTaken,
      color: "text-orange-400",
    },
    {
      type: "Pasywne obrażenia od ognia",
      value: warrior.firePassiveDamageTaken,
      color: "text-red-500",
    },
  ].filter((item) => item.value > 0);

  if (damageBreakdown.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        Brak szczegółowych obrażeń dla tego wojownika
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        Szczegółowy podział obrażeń - {warrior.name}
      </h4>
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 text-xs">Typ obrażeń</TableHead>
            <TableHead className="h-8 text-xs text-right">Wartość</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {damageBreakdown.map((item, index) => (
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
