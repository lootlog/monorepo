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

interface LegendaryBonusesBreakdownProps {
  warrior: SharedWarrior;
}

export const LegendaryBonusesBreakdown: FC<LegendaryBonusesBreakdownProps> = ({
  warrior,
}) => {
  const offensiveBonuses = [
    {
      type: "Klątwy",
      value: warrior.legendaryBonuses.curse,
      color: "text-purple-400",
    },
    {
      type: "Ciosy bardzo krytyczne",
      value: warrior.legendaryBonuses.verycrit,
      color: "text-orange-400",
    },
    {
      type: "Dotyki anioła",
      value: warrior.legendaryBonuses.holytouch,
      color: "text-yellow-300",
    },
  ].filter((item) => item.value > 0);

  const defensiveBonuses = [
    {
      type: "Oślepienia",
      value: warrior.legendaryBonuses.glare,
      color: "text-yellow-400",
    },
    {
      type: "Płomienne oczyszczenia",
      value: warrior.legendaryBonuses.cleanse,
      color: "text-blue-400",
    },
    {
      type: "Ostatni ratunek",
      value: warrior.legendaryBonuses.lastheal,
      color: "text-green-400",
    },
    {
      type: "Wartość ostatniego ratunku",
      value: warrior.legendaryBonuses.lasthealValue,
      color: "text-green-300",
    },
    {
      type: "Fasady opieki",
      value: warrior.legendaryBonuses.facade,
      color: "text-gray-400",
    },
    {
      type: "Krytyczne osłony",
      value: warrior.legendaryBonuses.critred,
      color: "text-red-400",
    },
  ].filter((item) => item.value > 0);

  if (offensiveBonuses.length === 0 && defensiveBonuses.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Brak bonusów legendarnych dla tego wojownika
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        Szczegółowy podział bonusów legendarnych - {warrior.name}
      </h4>

      {offensiveBonuses.length > 0 && (
        <div>
          <h5 className="font-medium mb-2 text-xs text-red-400">
            Bonusy ofensywne
          </h5>
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-xs">Typ bonusu</TableHead>
                <TableHead className="h-8 text-xs text-right">
                  Wartość
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offensiveBonuses.map((item, index) => (
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
      )}

      {defensiveBonuses.length > 0 && (
        <div>
          <h5 className="font-medium mb-2 text-xs text-blue-400">
            Bonusy defensywne
          </h5>
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-xs">Typ bonusu</TableHead>
                <TableHead className="h-8 text-xs text-right">
                  Wartość
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defensiveBonuses.map((item, index) => (
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
      )}
    </div>
  );
};
