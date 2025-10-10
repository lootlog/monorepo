import { Warrior } from "@/hooks/api/battle-log/use-battles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { FC } from "react";

interface DamageBreakdownProps {
  warrior: Warrior;
}

export const DamageBreakdown: FC<DamageBreakdownProps> = ({ warrior }) => {
  const damageBreakdown = [
    {
      type: "Wszystkie otrzymane obrażenia",
      value: warrior.damageTaken,
      color: "text-white",
    },
    {
      type: "Obrażenia dystansowe",
      value: warrior.distanceDamageTaken,
      color: "text-green-400",
    },
    {
      type: "Obrażenia fizyczne",
      value: warrior.meleeDamageTaken,
      color: "text-blue-300",
    },
    {
      type: "Obrażenia pomocnicze",
      value: warrior.auxiliaryDamageTaken,
      color: "text-orange-300",
    },
    {
      type: "Obrażenia od ognia",
      value: warrior.fireDamageTaken,
      color: "text-red-400",
    },
    {
      type: "Obrażenia od lodu",
      value: warrior.frostDamageTaken,
      color: "text-cyan-400",
    },
    {
      type: "Obrażenia od błyskawic",
      value: warrior.lightningDamageTaken,
      color: "text-yellow-400",
    },
    {
      type: "Obrażenia od trzeciego ataku",
      value: warrior.thirdAttDamageTaken,
      color: "text-orange-400",
    },
    {
      type: "Obrażenia od procentówek",
      value: warrior.trueDamageTaken,
      color: "text-white",
    },
    {
      type: "Dodatkowe obrażenia od piętna bestii",
      value: warrior.stigmaDamageTaken,
      color: "text-purple-400",
    },
    {
      type: "Obrażenia od głębokich ran",
      value: warrior.woundDamageTaken,
      color: "text-green-600",
    },
    {
      type: "Obrażenia od trucizny",
      value: warrior.poisonDamageTaken,
      color: "text-green-600",
    },
    {
      type: "Obrażenia od zranienia",
      value: warrior.injureDamageTaken,
      color: "text-red-300",
    },
    {
      type: "Krytyczne obrażenia od głębokich ran",
      value: warrior.critWoundDamageTaken,
      color: "text-orange-400",
    },
    {
      type: "Pasywne obrażenia od ognia",
      value: warrior.firePassiveDamageTaken,
      color: "text-red-500",
    },
    {
      type: "Pasywne obrażenia od błyskawic",
      value: warrior.lightningPassiveDamageTaken,
      color: "text-yellow-500",
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
        Szczegółowy podział obrażeń {warrior.name}
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
