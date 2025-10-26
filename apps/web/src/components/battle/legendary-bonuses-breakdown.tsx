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

interface LegendaryBonusesBreakdownProps {
  warrior: Warrior;
}

export const LegendaryBonusesBreakdown: FC<LegendaryBonusesBreakdownProps> = ({
  warrior,
}) => {
  const offensiveBonuses = [
    {
      type: "Klątwy",
      value: warrior.legbonCurse,
      color: "text-yellow-400",
    },
    {
      type: "Ciosy bardzo krytyczne",
      value: warrior.legbonVerycrit,
      color: "text-red-600",
    },
    {
      type: "Dotyki anioła",
      value: warrior.legbonHolytouch,
      color: "text-blue-300",
    },
    {
      type: "Krwawe udręki",
      value: warrior.legbonAnguish,
      color: "text-red-600",
    },
  ].filter((item) => item.value > 0);

  const defensiveBonuses = [
    {
      type: "Oślepienia",
      value: warrior.legbonGlare,
      color: "text-yellow-400",
    },
    {
      type: "Płomienne oczyszczenia",
      value: warrior.legbonCleanse,
      color: "text-blue-400",
    },
    {
      type: "Ostatni ratunek",
      value: warrior.legbonLastheal,
      color: "text-green-400",
    },
  ].filter((item) => item.value > 0);

  const passiveBonuses = [
    {
      type: "Wartość ostatniego ratunku",
      value: warrior.legbonLasthealValue,
      color: "text-gray-400",
    },
    {
      type: "Wartość fasady opieki",
      value: warrior.legbonFacadeValue,
      color: "text-sky-400",
    },
    {
      type: "Wartość krytycznej osłony",
      value: warrior.legbonCritredValue,
      color: "text-sky-400",
    },
    {
      type: "Wartość przeszywającej skuteczności",
      value: warrior.legbonPunctureValue,
      color: "text-red-300",
    },
    {
      type: "Wyleczone obrażenia przez dotyk anioła",
      value: warrior.legbonHolytouchValue,
      color: "text-blue-300",
    },
    {
      type: "Otrzymane obrażenia od krwawej udręki",
      value: warrior.legbonAnguishDamageTaken,
      color: "text-red-600",
    },
  ].filter((item) => item.value > 0);

  if (
    offensiveBonuses.length === 0 &&
    defensiveBonuses.length === 0 &&
    passiveBonuses.length === 0
  ) {
    return (
      <div className="p-4 text-sm bg-background text-muted-foreground">
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
          <h4 className="font-medium mb-2 text-sm">Bonusy ofensywne</h4>
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
          <h5 className="font-medium mb-2 text-sm">Bonusy defensywne</h5>
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

      {passiveBonuses.length > 0 && (
        <div>
          <h5 className="font-medium mb-2 text-sm">Bonusy pasywne</h5>
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
              {passiveBonuses.map((item, index) => (
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
