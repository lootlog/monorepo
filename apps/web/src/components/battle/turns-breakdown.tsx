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

interface TurnsBreakdownProps {
  warrior: Warrior;
}

export const TurnsBreakdown: FC<TurnsBreakdownProps> = ({ warrior }) => {
  const turnsBreakdown = [
    {
      type: "Ogólna liczba tur",
      value: warrior.turns,
      color: "text-blue-400",
    },
    {
      type: "Normalne ataki",
      value: warrior.normalAttacks,
      color: "text-orange-400",
    },
    {
      type: "Użyte umiejętności",
      value: warrior.spellsUsed,
      color: "text-purple-400",
    },
    {
      type: "Kroki",
      value: warrior.steps,
      color: "text-green-400",
    },
    {
      type: "Utracone tury",
      value: warrior.turnsLost,
      color: "text-red-400",
    },
  ].filter((item) => item.value > 0);

  // Detailed spell breakdown
  const spellBreakdown = Object.entries(warrior.spellsUsedMap || {})
    .map(([spell, count]) => ({
      spell,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  if (turnsBreakdown.length === 0 && spellBreakdown.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-background hover:bg-background">
        Brak szczegółowych informacji o turach dla tego wojownika
      </div>
    );
  }

  return (
    <div className="p-4 bg-background hover:bg-background">
      <h4 className="font-semibold mb-3 text-sm">
        Szczegółowy podział tur - {warrior.name}
      </h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-xs">Typ akcji</TableHead>
                <TableHead className="h-8 text-xs text-right">
                  Wartość
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {turnsBreakdown.map((item, index) => (
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

        {spellBreakdown.length > 0 && (
          <div>
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-xs">Umiejętność</TableHead>
                  <TableHead className="h-8 text-xs text-right">
                    Użycia
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spellBreakdown.map((item, index) => (
                  <TableRow key={index} className="h-8 hover:bg-transparent">
                    <TableCell className="py-1 text-purple-300">
                      {item.spell}
                    </TableCell>
                    <TableCell className="py-1 text-right font-medium tabular-nums">
                      {item.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
